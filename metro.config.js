// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// The web version of SQLite (expo-sqlite) is a WebAssembly file.
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './src/global.css' });
