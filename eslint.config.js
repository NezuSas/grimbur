// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'node_modules/*', '.expo/*', 'scripts/*'],
  },
  {
    rules: {
      // The game keeps some hook dependency lists short on purpose (callbacks read refs): this is reported, not blocking.
      'react-hooks/exhaustive-deps': 'warn',
      // React-Compiler-era rules. The game keeps the latest callback/state in a ref written during render on purpose (so long-lived
      // gesture handlers and timers never read stale values); that pattern is documented where it is used.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      // memo(() => ...) components are anonymous in the dev tools; worth naming over time, not blocking.
      'react/display-name': 'warn',
    },
  },
]);
