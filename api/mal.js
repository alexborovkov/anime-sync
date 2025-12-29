/**
 * Serverless function to proxy MAL API requests
 * Avoids CORS issues by proxying requests through our server
 */
export default async function handler(req, res) {
  // Extract the MAL API path from the request
  // Request comes in as /api/mal/users/@me/animelist
  // We need to forward to https://api.myanimelist.net/v2/users/@me/animelist
  const malPath = req.url.replace('/api/mal/', '');
  const malUrl = `https://api.myanimelist.net/v2/${malPath}`;

  // Get authorization header from the request
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header is required'
    });
  }

  try {
    // Forward the request to MAL API
    const malResponse = await fetch(malUrl, {
      method: req.method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    // Get the response data
    const data = await malResponse.json();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Return the MAL API response
    res.status(malResponse.status).json(data);
  } catch (error) {
    console.error('MAL API proxy error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
