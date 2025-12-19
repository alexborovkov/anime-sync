import { defineConfig, loadEnv } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  console.log('🔍 Vite Mode:', mode);
  console.log('🔍 TRAKT_CLIENT_ID from loadEnv:', env.TRAKT_CLIENT_ID);
  console.log('🔍 MAL_CLIENT_ID from loadEnv:', env.MAL_CLIENT_ID);

  // Make env vars available to Node process for Ember's config/environment.js
  process.env.TRAKT_CLIENT_ID = env.TRAKT_CLIENT_ID;
  process.env.MAL_CLIENT_ID = env.MAL_CLIENT_ID;
  process.env.APP_URL = env.APP_URL;

  return {
    server: {
      port: 4201,
    },
    define: {
      'process.env.TRAKT_CLIENT_ID': JSON.stringify(env.TRAKT_CLIENT_ID || ''),
      'process.env.MAL_CLIENT_ID': JSON.stringify(env.MAL_CLIENT_ID || ''),
      'process.env.APP_URL': JSON.stringify(env.APP_URL || 'http://localhost:4201'),
    },
    plugins: [
      classicEmberSupport(),
      ember(),
      // extra plugins here
      babel({
        babelHelpers: 'runtime',
        extensions,
      }),
    ],
  };
});
