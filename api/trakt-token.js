/**
 * Serverless function for Trakt OAuth token exchange
 * This function handles the client_secret securely on the server side
 *
 * Environment variables required:
 * - TRAKT_CLIENT_ID
 * - TRAKT_CLIENT_SECRET
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

  const { code, redirect_uri, grant_type, refresh_token } = req.body;

  // Validate required environment variables
  if (!process.env.TRAKT_CLIENT_ID || !process.env.TRAKT_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Trakt API credentials not configured',
    });
  }

  // Validate request body
  if (grant_type === 'authorization_code' && (!code || !redirect_uri)) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'code and redirect_uri are required for authorization_code grant',
    });
  }

  if (grant_type === 'refresh_token' && !refresh_token) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'refresh_token is required for refresh_token grant',
    });
  }

  try {
    // Prepare request body for Trakt API
    const tokenRequestBody = {
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      grant_type: grant_type || 'authorization_code',
    };

    // Add specific fields based on grant type
    if (grant_type === 'authorization_code') {
      tokenRequestBody.code = code;
      tokenRequestBody.redirect_uri = redirect_uri;
    } else if (grant_type === 'refresh_token') {
      tokenRequestBody.refresh_token = refresh_token;
    }

    // Exchange code/refresh_token for access token
    const response = await fetch('https://api.trakt.tv/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequestBody),
    });

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
    console.error('Trakt token exchange error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to exchange token with Trakt API',
    });
  }
}
