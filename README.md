# Trakt ↔ MyAnimeList Sync

A client-side web application for bidirectional synchronization of anime lists between Trakt.tv and MyAnimeList (MAL).

## Features

- 🔄 **Bidirectional Sync**: Transfer your anime lists between Trakt and MyAnimeList
- 🔐 **Secure OAuth**: PKCE flow for MAL, secure serverless function for Trakt
- 💾 **Smart Caching**: IndexedDB for offline support and faster performance
- 🎯 **Smart Mapping**: API-based anime matching with title similarity and year validation
- 📊 **Preview Changes**: Review sync operations before executing
- ⚡ **Rate Limited**: Respects API limits (Trakt: 1000/5min, MAL: 60/min)
- 🎨 **Modern UI**: Built with Tailwind CSS and Ember.js

## Architecture

This is a **client-side only** application:
- All code runs in your browser
- Only one serverless function for Trakt OAuth token exchange
- No traditional backend server required
- Can be deployed to static hosting (Vercel, Netlify, GitHub Pages)

## Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 18.x or higher
- [Yarn](https://yarnpkg.com/) (recommended) or npm
- Trakt.tv account
- MyAnimeList account

## Setup

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd trakt-mal-sync
\`\`\`

### 2. Install Dependencies

\`\`\`bash
yarn install
# or
npm install
\`\`\`

### 3. Register API Applications

#### Trakt API

1. Visit [https://trakt.tv/oauth/applications](https://trakt.tv/oauth/applications)
2. Create a new application
3. Set redirect URI:
   - Development: `http://localhost:4201/auth/trakt-callback`
   - Production: `https://your-domain.com/auth/trakt-callback`
4. Save your **Client ID** and **Client Secret**

#### MyAnimeList API

1. Visit [https://myanimelist.net/apiconfig](https://myanimelist.net/apiconfig)
2. Create a new application
3. Set redirect URI:
   - Development: `http://localhost:4201/auth/mal-callback`
   - Production: `https://your-domain.com/auth/mal-callback`
4. Save your **Client ID** (no secret needed - uses PKCE)

### 4. Configure Environment Variables

Create a \`.env.local\` file in the project root:

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Edit \`.env.local\` and add your credentials:

\`\`\`env
TRAKT_CLIENT_ID=your_trakt_client_id
MAL_CLIENT_ID=your_mal_client_id
APP_URL=http://localhost:4201
\`\`\`

**Note**: The Trakt Client Secret should be set as an environment variable in your deployment platform (Vercel/Netlify), not in the code.

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

1. Install Vercel CLI:

\`\`\`bash
npm i -g vercel
\`\`\`

2. Set environment variables in Vercel dashboard:
   - \`TRAKT_CLIENT_ID\`
   - \`TRAKT_CLIENT_SECRET\`
   - \`MAL_CLIENT_ID\`

3. Deploy:

\`\`\`bash
vercel deploy --prod
\`\`\`

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

2. Set environment variables in Netlify dashboard
3. Deploy via Git integration or CLI

## Project Structure

\`\`\`
trakt-mal-sync/
├── api/                          # Serverless functions
│   └── trakt-token.js           # Trakt OAuth token exchange
├── app/
│   ├── components/              # UI components
│   ├── routes/                  # Route handlers
│   ├── services/                # Core services
│   │   ├── oauth.js            # OAuth authentication
│   │   ├── storage.js          # LocalStorage wrapper
│   │   ├── cache.js            # IndexedDB cache
│   │   ├── trakt.js            # Trakt API client
│   │   ├── mal.js              # MAL API client
│   │   ├── mapping.js          # ID mapping service
│   │   └── sync-engine.js      # Sync logic
│   ├── templates/              # Route templates
│   └── utils/
│       └── rate-limiter.js     # API rate limiting
├── public/
│   └── anime-offline-database.json  # ID mapping database
└── vercel.json                 # Vercel configuration
\`\`\`

## How It Works

### Authentication Flow

**MyAnimeList (PKCE):**
1. Generate code_verifier and code_challenge
2. Redirect user to MAL authorization page
3. User approves and is redirected back with authorization code
4. Exchange code for access token using code_verifier (no secret needed!)
5. Store tokens in localStorage

**Trakt:**
1. Redirect user to Trakt authorization page
2. User approves and is redirected back with authorization code
3. Call serverless function to exchange code for access token (secret stays server-side)
4. Store tokens in localStorage

### Sync Process

1. **Fetch Data**: Get anime lists from both services
2. **Map IDs**: Use anime-offline-database to match shows
3. **Analyze**: Compare entries and identify differences
4. **Preview**: Show user what will change
5. **Execute**: Perform sync operations with progress tracking
6. **Report**: Display results summary

### Data Storage

- **localStorage**: OAuth tokens, user settings, last sync timestamp
- **IndexedDB**: Anime mapping cache, API response cache, sync history
- **sessionStorage**: OAuth state/PKCE verifiers (temporary)

## Security

✅ **Client-side Security Best Practices:**
- Client IDs are public (normal for OAuth public clients)
- PKCE protects against authorization code interception
- OAuth state parameter prevents CSRF attacks
- Client secrets never exposed in frontend code
- Tokens stored in localStorage (not cookies to prevent CSRF)
- Security headers configured in Vercel

⚠️ **What's Not Secure:**
- Tokens visible in browser DevTools (by design for client-side apps)
- Client IDs visible in network requests (expected behavior)

## API Rate Limits

- **Trakt**: 1000 requests per 5 minutes
- **MyAnimeList**: ~60 requests per minute (undocumented)

The app automatically throttles requests to stay within limits.

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
1. Ensure \`anime-offline-database.json\` is in the \`public\` folder
2. Check browser DevTools → Application → IndexedDB for cached mappings
3. Try the manual title search feature

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and tests
5. Submit a pull request

## License

MIT

## Credits

- [anime-offline-database](https://github.com/manami-project/anime-offline-database) for ID mappings
- [Trakt.tv API](https://trakt.docs.apiary.io/)
- [MyAnimeList API](https://myanimelist.net/apiconfig/references/api/v2)

---

**Built with ❤️ using Ember.js and Tailwind CSS**
