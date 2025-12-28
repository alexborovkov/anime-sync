import { defineConfig, loadEnv } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // Make env vars available to Node process for Ember's config/environment.js
  // Note: API credentials are now user-provided via Settings UI
  process.env.APP_URL = env.APP_URL;
  process.env.TRAKT_CLIENT_ID = env.TRAKT_CLIENT_ID || '';
  process.env.MAL_CLIENT_ID = env.MAL_CLIENT_ID || '';
  process.env.IDS_MOE_API_KEY = env.IDS_MOE_API_KEY || '';

  return {
    server: {
      port: 4201,
    },
    define: {
      // Only APP_URL is required; API credentials are optional (user-provided)
      'process.env.APP_URL': JSON.stringify(env.APP_URL || 'http://localhost:4201'),
      'process.env.TRAKT_CLIENT_ID': JSON.stringify(env.TRAKT_CLIENT_ID || ''),
      'process.env.MAL_CLIENT_ID': JSON.stringify(env.MAL_CLIENT_ID || ''),
      'process.env.IDS_MOE_API_KEY': JSON.stringify(env.IDS_MOE_API_KEY || ''),
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
                const { code, redirect_uri, grant_type, refresh_token, client_id, client_secret } = JSON.parse(body);

                // Validate user-provided credentials
                if (!client_id || !client_secret) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    error: 'Bad request',
                    message: 'client_id and client_secret are required'
                  }));
                  return;
                }

                const tokenRequestBody = {
                  client_id,
                  client_secret,
                  grant_type: grant_type || 'authorization_code',
                };

                if (grant_type === 'authorization_code') {
                  tokenRequestBody.code = code;
                  tokenRequestBody.redirect_uri = redirect_uri;
                } else if (grant_type === 'refresh_token') {
                  tokenRequestBody.refresh_token = refresh_token;
                }

                const tokenResponse = await fetch('https://api.trakt.tv/oauth/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(tokenRequestBody),
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

                // Validate user-provided credentials
                if (!params.client_id || !params.client_secret) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    error: 'Bad request',
                    message: 'client_id and client_secret are required'
                  }));
                  return;
                }

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

            // Proxy MAL API requests to avoid CORS
            if (req.url.startsWith('/api/mal/')) {
              const malPath = req.url.replace('/api/mal/', '');
              const malUrl = `https://api.myanimelist.net/v2/${malPath}`;

              try {
                const malResponse = await fetch(malUrl, {
                  method: req.method,
                  headers: {
                    'Authorization': req.headers.authorization || '',
                    'Content-Type': 'application/json',
                  },
                });

                const data = await malResponse.json();

                res.writeHead(malResponse.status, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(data));
              } catch (error) {
                console.error('MAL API proxy error:', error);
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
