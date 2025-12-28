# Trakt ↔ MyAnimeList Sync

A centralized web application for bidirectional synchronization of anime lists between Trakt.tv and MyAnimeList (MAL).

## Features

- 🔄 **Bidirectional Sync**: Transfer your anime lists between Trakt and MyAnimeList
- 🔐 **Secure OAuth**: User-provided API keys with client-side storage
- 🌐 **Centralized Deployment**: One instance serves all users
- 💾 **Smart Caching**: IndexedDB for offline support and faster performance
- 🎯 **Smart Mapping**: API-based anime matching with title similarity and year validation via ids.moe
- 📊 **Preview Changes**: Review sync operations before executing
- ⚡ **Rate Limited**: Respects API limits (Trakt: 1000/5min, MAL: 60/min) - per user
- 🎨 **Modern UI**: Built with Tailwind CSS and Ember.js
- 🔒 **Privacy-Focused**: Your API keys stay in your browser

## Architecture

This is a **client-side application with user-provided credentials**:
- All code runs in your browser
- Users configure their own API keys in Settings
- Two serverless functions for OAuth token exchange (Trakt & MAL)
- No backend database required
- Zero admin API credentials needed for deployment
- Can be deployed to static hosting (Vercel, Netlify, GitHub Pages)

## For Users

### Using the Deployed App

1. Visit the deployed application
2. Go to **Settings**
3. Configure your API keys:
   - **Trakt Client ID & Secret** - Register at [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications)
   - **MAL Client ID & Secret** - Register at [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig)
   - **ids.moe API Key** (optional) - Get from [ids.moe](https://ids.moe/)
4. Connect your accounts and start syncing!

### Getting Your API Keys

#### Trakt API

1. Visit [https://trakt.tv/oauth/applications](https://trakt.tv/oauth/applications)
2. Click "New Application"
3. Fill in details:
   - **Name**: "My Anime Sync" (or anything you like)
   - **Redirect URI**: The callback URL shown in Settings (e.g., `https://app-url.com/auth/trakt-callback`)
4. Save your **Client ID** and **Client Secret**
5. Enter both in the app's Settings page

#### MyAnimeList API

1. Visit [https://myanimelist.net/apiconfig](https://myanimelist.net/apiconfig)
2. Click "Create ID"
3. Fill in details:
   - **App Name**: "My Anime Sync" (or anything you like)
   - **App Type**: "web"
   - **App Redirect URL**: The callback URL shown in Settings (e.g., `https://app-url.com/auth/mal-callback`)
4. Save your **Client ID** and **Client Secret**
5. Enter both in the app's Settings page

#### ids.moe API (Optional but Recommended)

1. Visit [https://ids.moe/](https://ids.moe/)
2. Sign up for a free API key
3. This improves anime ID mapping accuracy between Trakt and MAL
4. Enter in the app's Settings page

---

## For Developers

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 18.x or higher
- [Yarn](https://yarnpkg.com/) (recommended) or npm

### Setup

#### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/alexborovkov/anime-sync.git
cd anime-sync
\`\`\`

#### 2. Install Dependencies

\`\`\`bash
yarn install
# or
npm install
\`\`\`

#### 3. Configure Environment

Create a \`.env.local\` file:

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Edit \`.env.local\`:

\`\`\`env
# Only APP_URL is required for development
APP_URL=http://localhost:4201
\`\`\`

**That's it!** No API credentials needed for development. Users will provide their own keys in the Settings UI.

## Development

### Start the Development Server

\`\`\`bash
yarn start
# or
npm start
\`\`\`

Visit [http://localhost:4201](http://localhost:4201)

### Code Linting and Formatting

\`\`\`bash
# Check for issues
yarn lint

# Auto-fix issues
yarn lint:fix

# Format code
yarn format
\`\`\`

### Building for Production

\`\`\`bash
yarn build
# Output will be in the /dist directory
\`\`\`

## Deployment

### Deploy to Vercel (Recommended)

1. Fork/clone the repository
2. Connect to Vercel
3. Set **only one** environment variable:
   - \`APP_URL\` = your deployment URL (e.g., `https://anime-sync.vercel.app`)

4. Deploy!

**That's it!** No API credentials needed. Users provide their own keys when they use the app.

### Deploy to Netlify

1. Create \`netlify.toml\`:

\`\`\`toml
[build]
  command = "yarn build"
  publish = "dist"

[functions]
  directory = "api"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
\`\`\`

2. Set environment variable:
   - \`APP_URL\` = your deployment URL

3. Deploy via Git integration or CLI

### Why So Simple?

This architecture uses **user-provided API credentials**:
- Each user registers their own API apps with Trakt and MAL
- API keys stored in user's browser localStorage
- Zero admin credentials required
- Better scalability (no shared rate limits)
- Enhanced privacy (no centralized credential storage)

## Project Structure

\`\`\`
trakt-mal-sync/
├── api/                          # Serverless functions
│   ├── trakt-token.js           # Trakt OAuth token exchange
│   └── mal-token.js             # MAL OAuth token exchange
├── app/
│   ├── components/              # UI components
│   │   ├── api-key-config.gjs  # API key configuration UI
│   │   └── redirect-uri-helper.gjs  # Redirect URI display
│   ├── routes/                  # Route handlers
│   ├── services/                # Core services
│   │   ├── oauth.js            # OAuth authentication
│   │   ├── storage.js          # LocalStorage wrapper (user API keys)
│   │   ├── cache.js            # IndexedDB cache
│   │   ├── trakt.js            # Trakt API client
│   │   ├── mal.js              # MAL API client
│   │   ├── mapping.js          # ID mapping service (uses ids.moe)
│   │   └── sync-engine.js      # Sync logic
│   ├── templates/              # Route templates
│   │   └── settings.gjs        # Settings page with API config
│   └── utils/
│       └── rate-limiter.js     # API rate limiting
└── vercel.json                 # Vercel configuration
\`\`\`

## How It Works

### Authentication Flow

**Setup (One-time):**
1. User registers API apps with Trakt and MAL
2. User enters Client ID and Client Secret in Settings
3. Keys stored in browser localStorage (obfuscated with base64)

**MyAnimeList (PKCE):**
1. Generate code_verifier and code_challenge
2. Redirect user to MAL authorization page with user's client_id
3. User approves and is redirected back with authorization code
4. Call serverless function with user's credentials to exchange code for access token
5. Store tokens in localStorage

**Trakt:**
1. Redirect user to Trakt authorization page with user's client_id
2. User approves and is redirected back with authorization code
3. Call serverless function with user's credentials to exchange code for access token
4. Store tokens in localStorage

**Security Note:** Client secrets are sent to serverless functions but never exposed in frontend code. Serverless functions proxy the OAuth token exchange to keep secrets secure.

### Sync Process

1. **Fetch Data**: Get anime lists from both services using user's API keys
2. **Map IDs**: Use ids.moe API (if key provided) or fallback to title matching
3. **Analyze**: Compare entries and identify differences
4. **Preview**: Show user what will change
5. **Execute**: Perform sync operations with progress tracking
6. **Report**: Display results summary

### Data Storage

- **localStorage**:
  - User API keys (Trakt, MAL, ids.moe) - obfuscated with base64
  - OAuth tokens
  - User settings
- **IndexedDB**: Anime mapping cache, API response cache, sync history
- **sessionStorage**: OAuth state/PKCE verifiers (temporary)

## Security

✅ **Client-side Security Best Practices:**
- User API keys stored in localStorage with base64 obfuscation
- Client secrets sent to serverless functions only (never in frontend)
- PKCE flow for MAL (no client secret in browser)
- OAuth state parameter prevents CSRF attacks
- Tokens stored in localStorage (not cookies to prevent CSRF)
- Security headers configured in deployment

⚠️ **What Users Should Know:**
- API keys visible in browser DevTools (by design for client-side apps)
- Anyone with access to your browser can see your API keys
- Don't share your API keys with others
- Clear browser data or use "Clear All Data" in Settings to remove credentials
- Each user has isolated API credentials (better than shared credentials)

## API Rate Limits

- **Trakt**: 1000 requests per 5 minutes (per user's API key)
- **MyAnimeList**: ~60 requests per minute (per user's API key)
- **ids.moe**: Varies by plan (rate limited per user's API key)

The app automatically throttles requests to stay within limits. Since each user has their own API credentials, there are no shared rate limits.

## Troubleshooting

### OAuth Redirect Issues

Make sure your redirect URIs match exactly in:
1. API application settings (Trakt/MAL)
2. Environment variables (\`APP_URL\`)
3. No trailing slashes

### CORS Errors

Both Trakt and MAL APIs support CORS for authenticated requests. If you see CORS errors:
1. Check that you're using the correct API endpoints
2. Ensure tokens are valid and not expired
3. Check browser console for specific error messages

### Mapping Issues

If anime aren't mapping correctly:
1. Configure an ids.moe API key in Settings for better accuracy
2. Check browser DevTools → Application → IndexedDB for cached mappings
3. Clear mapping cache in Settings if you suspect stale data
4. The app falls back to title-based matching if ids.moe is unavailable

### API Key Issues

If you're having trouble with API keys:
1. Make sure redirect URIs match exactly between your API app settings and the deployed URL
2. Use the copy button in Settings to get the correct redirect URI
3. Both Trakt and MAL require Client ID **and** Client Secret
4. Test your credentials by trying to connect your accounts
5. Check browser console for specific error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and tests
5. Submit a pull request

## License

MIT

## Credits

- [ids.moe](https://ids.moe/) for anime ID mapping API
- [Trakt.tv API](https://trakt.docs.apiary.io/)
- [MyAnimeList API](https://myanimelist.net/apiconfig/references/api/v2)

## FAQ

**Q: Why do I need to register my own API apps?**
A: This architecture provides better scalability, privacy, and rate limit isolation. Each user has their own API credentials instead of sharing a single set.

**Q: Is it safe to enter my API keys?**
A: Your keys are stored only in your browser's localStorage and are never sent to our servers except when making authorized API calls to Trakt and MAL. However, anyone with access to your browser can see them in DevTools.

**Q: Can I use the app without registering API apps?**
A: No, API credentials are required for the app to function. But registration is free and takes just a few minutes.

**Q: What if I deploy my own instance?**
A: You still don't need to configure any API credentials for deployment! Users will provide their own keys when they use your instance.

---

**Built with ❤️ using Ember.js and Tailwind CSS**
