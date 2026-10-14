import { useEntitlementsStore } from './store';
import { monetizationConfig } from '../../services/entitlements';
import { isModeLocked } from '../../core/entitlements/gating';
import type { GameMode } from '../../core/engine/seed';

/** What the screens need to know about the unlock: is the shop open, is the game owned, is a mode behind it. */
export function useEntitlements() {
  const owned = useEntitlementsStore(s => s.fullUnlocked);
  const cfg = monetizationConfig();
  return {
    enabled: cfg.enabled,
    /** True when the whole game is open: monetisation off, or bought. */
    hasFullGame: !cfg.enabled || owned,
    modeLocked: (mode: GameMode) => isModeLocked(mode, owned, cfg),
  };
}
