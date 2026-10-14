const storage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => void storage.set(key, value)),
    removeItem: jest.fn(async (key: string) => void storage.delete(key)),
  },
}));

import { isFloorLocked, isModeLocked, shouldGateDescent } from '../../src/core/entitlements/gating';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import {
  LocalTestProvider,
  NullProvider,
  buyFullGame,
  hasFullGame,
  initEntitlements,
  isModeLockedNow,
  restorePurchases,
  setMonetizationOverride,
  setPurchaseProvider,
  shouldGateDescentNow,
  type PurchaseProvider,
} from '../../src/services/entitlements';
import { useEntitlementsStore } from '../../src/state/entitlements/store';

const on = { enabled: true, freeFloors: 3 };
const off = { enabled: false, freeFloors: 3 };
const g = globalThis as { __DEV__?: boolean };

describe('gating rules', () => {
  it('ships switched off, with the decided free part', () => {
    expect(GAME_CONFIG.monetization.enabled).toBe(false);
    expect(GAME_CONFIG.monetization.freeFloors).toBe(3);
    expect(GAME_CONFIG.monetization.productId).toBe('wumpus_full_game');
  });

  it('opens everything when monetisation is off', () => {
    for (const mode of ['expedition', 'daily', 'endless'] as const) {
      expect(isModeLocked(mode, false, off)).toBe(false);
      expect(isFloorLocked(10, mode, false, off)).toBe(false);
    }
    expect(shouldGateDescent(3, 'expedition', false, off)).toBe(false);
  });

  it('keeps the tutorial-sized part free: floors 1-3 and the daily', () => {
    for (const floor of [1, 2, 3]) expect(isFloorLocked(floor, 'expedition', false, on)).toBe(false);
    for (const floor of [1, 5, 10, 40]) expect(isFloorLocked(floor, 'daily', false, on)).toBe(false);
    expect(isModeLocked('daily', false, on)).toBe(false);
    expect(isModeLocked('expedition', false, on)).toBe(false);
  });

  it('locks floors 4+ of the expedition and the endless descent', () => {
    for (const floor of [4, 7, 10]) expect(isFloorLocked(floor, 'expedition', false, on)).toBe(true);
    expect(isModeLocked('endless', false, on)).toBe(true);
    expect(isFloorLocked(1, 'endless', false, on)).toBe(true);
  });

  it('opens everything once owned', () => {
    expect(isFloorLocked(10, 'expedition', true, on)).toBe(false);
    expect(isModeLocked('endless', true, on)).toBe(false);
    expect(shouldGateDescent(3, 'expedition', true, on)).toBe(false);
  });

  it('stands in the way only after the last free floor', () => {
    expect(shouldGateDescent(1, 'expedition', false, on)).toBe(false);
    expect(shouldGateDescent(2, 'expedition', false, on)).toBe(false);
    expect(shouldGateDescent(3, 'expedition', false, on)).toBe(true);
    expect(shouldGateDescent(3, 'daily', false, on)).toBe(false);
    expect(shouldGateDescent(5, 'expedition', false, { enabled: true, freeFloors: 5 })).toBe(true);
  });
});

describe('purchase providers and the entitlement state', () => {
  beforeEach(() => {
    storage.clear();
    useEntitlementsStore.setState({ fullUnlocked: false });
    setMonetizationOverride(null);
    g.__DEV__ = true;
  });
  afterAll(() => {
    delete g.__DEV__;
  });

  it('the null provider reports that the store is not available', async () => {
    const p = new NullProvider();
    expect(p.available).toBe(false);
    expect(await p.getProduct()).toBeNull();
    expect(await p.purchase()).toEqual({ status: 'unavailable' });
    expect(await p.restore()).toEqual({ status: 'unavailable' });
  });

  it('the local test provider grants the unlock after a delay, in dev only', async () => {
    const p = new LocalTestProvider(5);
    const heard = jest.fn();
    p.addListener(heard);
    expect(await p.restore()).toEqual({ status: 'nothing' });
    expect(await p.purchase()).toEqual({ status: 'success' });
    expect(heard).toHaveBeenCalledWith({ owned: true });
    expect(await p.restore()).toEqual({ status: 'restored' });

    g.__DEV__ = false;
    expect(p.available).toBe(false);
    expect(await new LocalTestProvider(5).purchase()).toEqual({ status: 'unavailable' });
  });

  it('a successful purchase flips the persisted flag; a failed one does not', async () => {
    setPurchaseProvider(new NullProvider());
    expect((await buyFullGame()).status).toBe('unavailable');
    expect(useEntitlementsStore.getState().fullUnlocked).toBe(false);

    setPurchaseProvider(new LocalTestProvider(1));
    expect((await buyFullGame()).status).toBe('success');
    expect(useEntitlementsStore.getState().fullUnlocked).toBe(true);
  });

  it('restore grants the unlock only when the store knows the purchase', async () => {
    const owner = new LocalTestProvider(1);
    setPurchaseProvider(owner);
    expect((await restorePurchases()).status).toBe('nothing');
    expect(useEntitlementsStore.getState().fullUnlocked).toBe(false);
    await owner.purchase();
    expect((await restorePurchases()).status).toBe('restored');
    expect(useEntitlementsStore.getState().fullUnlocked).toBe(true);
  });

  it('a throwing provider becomes an error result, never an exception', async () => {
    const broken: PurchaseProvider = {
      name: 'broken',
      available: true,
      init: async () => { throw new Error('down'); },
      getProduct: async () => { throw new Error('down'); },
      purchase: async () => { throw new Error('boom'); },
      restore: async () => { throw new Error('boom'); },
      addListener: () => () => {},
    };
    setPurchaseProvider(broken);
    await expect(initEntitlements()).resolves.toBeUndefined();
    expect(await buyFullGame()).toEqual({ status: 'error', message: 'boom' });
    expect(await restorePurchases()).toEqual({ status: 'error' });
  });

  it('init follows the store: a refund takes the unlock away, a listener can grant it', async () => {
    useEntitlementsStore.setState({ fullUnlocked: true });
    let emit: (e: { owned: boolean }) => void = () => {};
    setPurchaseProvider({
      name: 'fake',
      available: true,
      init: async () => ({ owned: false }),
      getProduct: async () => ({ price: '$3.99', title: 'Full game' }),
      purchase: async () => ({ status: 'cancelled' }),
      restore: async () => ({ status: 'nothing' }),
      addListener: listener => { emit = listener; return () => {}; },
    });
    await initEntitlements();
    expect(useEntitlementsStore.getState().fullUnlocked).toBe(false);
    emit({ owned: true });
    expect(useEntitlementsStore.getState().fullUnlocked).toBe(true);
  });

  it('the null provider never revokes a stored unlock', async () => {
    useEntitlementsStore.setState({ fullUnlocked: true });
    setPurchaseProvider(new NullProvider());
    await initEntitlements();
    expect(useEntitlementsStore.getState().fullUnlocked).toBe(true);
  });

  it('hasFullGame and the gating helpers follow the config and the flag', () => {
    expect(hasFullGame()).toBe(true); // monetisation off: everything is open
    expect(isModeLockedNow('endless')).toBe(false);
    expect(shouldGateDescentNow(3, 'expedition')).toBe(false);

    setMonetizationOverride({ enabled: true });
    expect(hasFullGame()).toBe(false);
    expect(isModeLockedNow('endless')).toBe(true);
    expect(shouldGateDescentNow(3, 'expedition')).toBe(true);

    useEntitlementsStore.setState({ fullUnlocked: true });
    expect(hasFullGame()).toBe(true);
    expect(isModeLockedNow('endless')).toBe(false);
    expect(shouldGateDescentNow(3, 'expedition')).toBe(false);
  });
});
