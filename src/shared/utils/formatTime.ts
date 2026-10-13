/** Formats a number of seconds as `MM:SS`. */
export const formatTime = (seconds: number): string => {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};
