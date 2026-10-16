/**
 * Wraps app.json. A build for real phones (profile "preview" / "production" in eas.json sets WUMPUS_ARCHS=arm) only carries
 * the ARM libraries: an APK with the four processor families is 106 MB, of which 64 MB are libraries a phone never loads.
 * Emulators on a PC need x86_64: use the "preview-emulator" profile (WUMPUS_ARCHS=all).
 */
module.exports = ({ config }) => {
  if (process.env.WUMPUS_ARCHS !== 'arm') return config;
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['expo-build-properties', { android: { buildArchs: ['arm64-v8a', 'armeabi-v7a'] } }]],
  };
};
