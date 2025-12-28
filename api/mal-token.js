/**
 * Serverless function for MyAnimeList OAuth token exchange
 * This function handles the client_secret securely on the server side
 *
 * Accepts user-provided credentials from request body (no environment variables needed)
 */

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS for the frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const {
    code,
    code_verifier,
    redirect_uri,
    grant_type,
    refresh_token,
    client_id,
    client_secret,
  } = req.body;

  // Validate user-provided credentials
  if (!client_id || !client_secret) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'client_id and client_secret are required',
    });
  }

  // Validate request body based on grant type
  if (
    grant_type === 'authorization_code' &&
    (!code || !code_verifier || !redirect_uri)
  ) {
    return res.status(400).json({
      error: 'Bad request',
      message:
        'code, code_verifier, and redirect_uri are required for authorization_code grant',
    });
  }

  if (grant_type === 'refresh_token' && !refresh_token) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'refresh_token is required for refresh_token grant',
    });
  }

  try {
    // Prepare request body for MAL API
    const tokenRequestBody = {
      client_id,
      client_secret,
      grant_type: grant_type || 'authorization_code',
    };

    // Add specific fields based on grant type
    if (grant_type === 'authorization_code') {
      tokenRequestBody.code = code;
      tokenRequestBody.code_verifier = code_verifier;
      tokenRequestBody.redirect_uri = redirect_uri;
    } else if (grant_type === 'refresh_token') {
      tokenRequestBody.refresh_token = refresh_token;
    }

    // Exchange code/refresh_token for access token
    const response = await fetch(
      'https://myanimelist.net/v1/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestBody).toString(),
      },
    );

    const data = await response.json();

    // Forward the response status and data
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || 'Token exchange failed',
        error_description: data.error_description || 'Unknown error',
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('MAL token exchange error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to exchange token with MAL API',
    });
  }
}
