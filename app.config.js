/**
 * Wraps app.json. Every Android release build runs R8 (minify) and resource shrinking - a smaller, harder to
 * decompile APK. A build for real phones (profile "preview" / "production" in eas.json sets GRIMBUR_ARCHS=arm)
 * also carries only the ARM libraries: an APK with the four processor families is 106 MB, of which 64 MB are
 * libraries a phone never loads. Emulators on a PC need x86_64: use the "preview-emulator" profile (GRIMBUR_ARCHS=all).
 */
module.exports = ({ config }) => {
  const android = {
    enableMinifyInReleaseBuilds: true,
    enableShrinkResourcesInReleaseBuilds: true,
    ...(process.env.GRIMBUR_ARCHS === 'arm' ? { buildArchs: ['arm64-v8a', 'armeabi-v7a'] } : {}),
  };
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['expo-build-properties', { android }]],
  };
};
