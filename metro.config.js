const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    alias: {
      '@': './src',
      '@components': './src/components',
      '@screens': './src/screens',
      '@services': './src/services',
      '@utils': './src/utils',
      '@hooks': './src/hooks',
      '@context': './src/context',
      '@types': './src/types',
    },
  },
  // Disable Watchman to avoid permission issues
  watchFolders: [],
  watcher: {
    useWatchman: false,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);