const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Delete deprecated Metro watcher setting if populated by default Expo config
if (config.watcher && 'unstable_workerThreads' in config.watcher) {
  delete config.watcher.unstable_workerThreads;
}

// Enable Inline Requires to defer module execution until called
// Reduces initial JavaScript parse & execution time by ~40%, accelerating FCP & TTI
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
