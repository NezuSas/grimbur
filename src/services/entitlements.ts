/**
 * Purchases facade (the one-time "full game" unlock).
 *
 * The game only talks to this module, never to a store SDK. To sell the unlock for real, implement
 * `PurchaseProvider` with RevenueCat or Play Billing (both need a development build, not Expo Go; a ready
 * skeleton is in docs/release/MONETIZATION_SETUP.md) and call `setPurchaseProvider` once at startup.
 * With `GAME_CONFIG.monetization.enabled` off, nothing here matters: the whole game is open.
 */
import { GAME_CONFIG } from '../config/gameConfig';
import { useEntitlementsStore } from '../state/entitlements/store';
import { isModeLocked, shouldGateDescent, type GatingConfig } from '../core/entitlements/gating';
import type { GameMode } from '../core/engine/seed';

export interface ProductInfo {
  /** Localised price as the store formats it, e.g. "$3.99". */
  price: string;
  title: string;
}

export type PurchaseOutcome =
  | { status: 'success' }
  | { status: 'cancelled' }
  /** No store connected (Expo Go, web, product not found). */
  | { status: 'unavailable' }
  | { status: 'error'; message?: string };

export type RestoreOutcome = { status: 'restored' | 'nothing' | 'unavailable' | 'error' };

export interface PurchaseProvider {
  readonly name: string;
  /** False when no store is connected: the paywall says so instead of offering a Buy button that cannot work. */
  readonly available: boolean;
  /** Connects to the store. `owned` is the answer of the store when it knows it (a refund turns it false). */
  init(): Promise<{ owned?: boolean }>;
  getProduct(): Promise<ProductInfo | null>;
  purchase(): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
  /** Purchases that complete outside `purchase()` (pending payments, other devices). Returns the unsubscribe. */
  addListener(listener: (event: { owned: boolean }) => void): () => void;
}

const isDev = () => typeof __DEV__ !== 'undefined' && __DEV__;

/** No store connected: everything reports "not available yet". */
export class NullProvider implements PurchaseProvider {
  readonly name = 'null';
  readonly available = false;
  async init() {
    return {};
  }
  async getProduct() {
    return null;
  }
  async purchase(): Promise<PurchaseOutcome> {
    return { status: 'unavailable' };
  }
  async restore(): Promise<RestoreOutcome> {
    return { status: 'unavailable' };
  }
  addListener() {
    return () => {};
  }
}

/** Dev builds only: grants the unlock after a short delay, so the whole flow can be tried without a store. */
export class LocalTestProvider implements PurchaseProvider {
  readonly name = 'local-test';
  private owned = false;
  private listeners = new Set<(event: { owned: boolean }) => void>();

  constructor(private readonly delayMs = 900) {}

  get available() {
    return isDev();
  }
  private wait() {
    return new Promise<void>(resolve => setTimeout(resolve, this.delayMs));
  }
  async init() {
    return {};
  }
  async getProduct() {
    return isDev() ? { price: GAME_CONFIG.monetization.fallbackPrice, title: 'Full game (test)' } : null;
  }
  async purchase(): Promise<PurchaseOutcome> {
    if (!isDev()) return { status: 'unavailable' };
    await this.wait();
    this.owned = true;
    this.listeners.forEach(l => l({ owned: true }));
    return { status: 'success' };
  }
  async restore(): Promise<RestoreOutcome> {
    if (!isDev()) return { status: 'unavailable' };
    await this.wait();
    return { status: this.owned ? 'restored' : 'nothing' };
  }
  addListener(listener: (event: { owned: boolean }) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

let provider: PurchaseProvider | null = null;
let unsubscribe: (() => void) | null = null;

export function setPurchaseProvider(next: PurchaseProvider): void {
  unsubscribe?.();
  unsubscribe = null;
  provider = next;
}

export function getPurchaseProvider(): PurchaseProvider {
  if (!provider) provider = isDev() && GAME_CONFIG.dev.localPurchases ? new LocalTestProvider() : new NullProvider();
  return provider;
}

// ── Configuration (with a dev-only override so the locked states can be previewed) ──────────────────────────
type Monetization = GatingConfig & Pick<typeof GAME_CONFIG.monetization, 'productId' | 'fallbackPrice' | 'termsUrl' | 'privacyUrl'>;
let override: Partial<GatingConfig> | null = null;

/** Dev only (the web harness): force monetisation on/off without editing the config. */
export function setMonetizationOverride(next: Partial<GatingConfig> | null): void {
  override = isDev() ? next : null;
}

export function monetizationConfig(): Monetization {
  return { ...GAME_CONFIG.monetization, ...(override ?? {}) };
}

// ── State ──────────────────────────────────────────────────────────────────────────────────────────────────
/** True when the whole game is open: monetisation off, or the unlock is owned. */
export function hasFullGame(): boolean {
  return !monetizationConfig().enabled || useEntitlementsStore.getState().fullUnlocked;
}

export function isModeLockedNow(mode: GameMode): boolean {
  return isModeLocked(mode, useEntitlementsStore.getState().fullUnlocked, monetizationConfig());
}

export function shouldGateDescentNow(clearedFloor: number, mode: GameMode): boolean {
  return shouldGateDescent(clearedFloor, mode, useEntitlementsStore.getState().fullUnlocked, monetizationConfig());
}

function grant(owned: boolean) {
  useEntitlementsStore.getState().setFullUnlocked(owned);
}

/** Connects the provider and reconciles the stored flag with the answer of the store. Safe to call more than once. */
export async function initEntitlements(): Promise<void> {
  const p = getPurchaseProvider();
  try {
    const { owned } = await p.init();
    if (owned !== undefined) grant(owned);
    unsubscribe?.();
    unsubscribe = p.addListener(event => grant(event.owned));
  } catch {
    // A broken store connection must never break the game: the stored flag stays as it was.
  }
}

export async function loadProduct(): Promise<ProductInfo | null> {
  try {
    return await getPurchaseProvider().getProduct();
  } catch {
    return null;
  }
}

export async function buyFullGame(): Promise<PurchaseOutcome> {
  try {
    const outcome = await getPurchaseProvider().purchase();
    if (outcome.status === 'success') grant(true);
    return outcome;
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

export async function restorePurchases(): Promise<RestoreOutcome> {
  try {
    const outcome = await getPurchaseProvider().restore();
    if (outcome.status === 'restored') grant(true);
    return outcome;
  } catch {
    return { status: 'error' };
  }
}
