// Expo's defaults plus OGG: the music ships as OGG Vorbis (an eighth of the WAV size, loops gaplessly on
// Android). iOS cannot play OGG - before an iOS release re-export the music (see scripts/convertMusic.py).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('ogg');

module.exports = config;
