import { defineConfig, loadEnv } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  console.log('🔍 Vite Mode:', mode);
  console.log('🔍 TRAKT_CLIENT_ID from loadEnv:', env.TRAKT_CLIENT_ID);
  console.log('🔍 TRAKT_CLIENT_SECRET from loadEnv:', env.TRAKT_CLIENT_SECRET ? '***' : 'NOT SET');
  console.log('🔍 MAL_CLIENT_ID from loadEnv:', env.MAL_CLIENT_ID);
  console.log('🔍 MAL_CLIENT_SECRET from loadEnv:', env.MAL_CLIENT_SECRET ? '***' : 'NOT SET');

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
      // Dev API middleware for serverless functions
      {
        name: 'dev-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // Handle Trakt token endpoint
            if (req.url === '/api/trakt-token' && req.method === 'POST') {
              let body = '';
              for await (const chunk of req) {
                body += chunk;
              }

              try {
                const { code, redirect_uri, grant_type } = JSON.parse(body);

                if (!env.TRAKT_CLIENT_ID || !env.TRAKT_CLIENT_SECRET) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    error: 'Server configuration error',
                    message: 'TRAKT_CLIENT_SECRET not set in .env.development.local'
                  }));
                  return;
                }

                const tokenResponse = await fetch('https://api.trakt.tv/oauth/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    code,
                    client_id: env.TRAKT_CLIENT_ID,
                    client_secret: env.TRAKT_CLIENT_SECRET,
                    redirect_uri,
                    grant_type: grant_type || 'authorization_code',
                  }),
                });

                const data = await tokenResponse.json();
                res.writeHead(tokenResponse.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
              } catch (error) {
                console.error('Trakt API middleware error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  error: 'Internal server error',
                  message: error.message
                }));
              }
              return;
            }

            // Handle MAL token endpoint (proxy to avoid CORS)
            if (req.url === '/api/mal-token' && req.method === 'POST') {
              let body = '';
              for await (const chunk of req) {
                body += chunk;
              }

              try {
                const params = JSON.parse(body);

                // MAL requires client_secret even for PKCE flows (web app type)
                if (!env.MAL_CLIENT_SECRET) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    error: 'Server configuration error',
                    message: 'MAL_CLIENT_SECRET not set in .env.development.local'
                  }));
                  return;
                }

                // MAL requires client_secret in body + X-MAL-Client-ID header
                params.client_secret = env.MAL_CLIENT_SECRET;

                console.log('🔍 Sending to MAL API with X-MAL-Client-ID header:');
                console.log('  - client_id:', params.client_id);
                console.log('  - client_id length:', params.client_id?.length);
                console.log('  - client_secret length:', params.client_secret?.length);
                console.log('  - client_secret first 10 chars:', params.client_secret?.substring(0, 10));
                console.log('  - grant_type:', params.grant_type);
                console.log('  - code_verifier length:', params.code_verifier?.length);

                // Forward the request to MAL with required X-MAL-Client-ID header
                const tokenResponse = await fetch('https://myanimelist.net/v1/oauth2/token', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-MAL-Client-ID': params.client_id,
                  },
                  body: new URLSearchParams(params),
                });

                const data = await tokenResponse.json();

                console.log('🔍 MAL API Response:');
                console.log('  - Status:', tokenResponse.status);
                console.log('  - Data:', data);

                res.writeHead(tokenResponse.status, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(data));
              } catch (error) {
                console.error('MAL API middleware error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  error: 'Internal server error',
                  message: error.message
                }));
              }
              return;
            }

            next();
          });
        }
      },
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
