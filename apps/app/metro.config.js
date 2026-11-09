const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro resolve packages from both apps/app/node_modules and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Provide query-string shim for expo-router@4.0.22 (@react-navigation/core v7 dropped query-string)
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'query-string': path.resolve(projectRoot, 'src/shims/query-string.js'),
};

module.exports = config;
