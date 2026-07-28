const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SRT files (Subtitles) ko allow karne ke liye
if (!config.resolver.assetExts.includes('srt')) {
  config.resolver.assetExts.push('srt');
}

// PDF files ko allow karne ke liye
if (!config.resolver.assetExts.includes('pdf')) {
  config.resolver.assetExts.push('pdf');
}

module.exports = config;