// metro.config.js — configuration du bundler Metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Le SDK JS de Firebase distribue certains de ses modules au format .cjs.
// Sans cette ligne, Metro peut échouer à les résoudre (erreurs d'import Firebase).
config.resolver.sourceExts.push('cjs');

module.exports = config;
