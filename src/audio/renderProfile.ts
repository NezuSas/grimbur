import type { ProfilerOnRenderCallback } from 'react';
import { recordLatency } from './audioDiagnostics';

/**
 * React Profiler callback that writes how long each re-render took into the shared diagnostics log ("render:<zone>").
 * It only counts updates (not the first mount) and does nothing in a production build, where React skips the profiler.
 * Used to find out which part of the game screen is busy after a step: Settings > "Share audio log".
 */
export const onRenderProfile: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (phase === 'mount') return;
  recordLatency(`render:${id}`, Math.round(actualDuration));
};
