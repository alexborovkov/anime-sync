import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import config from 'trakt-mal-sync/config/environment';

/**
 * OAuth service for handling authentication with Trakt and MyAnimeList
 * Implements PKCE flow for MAL and standard OAuth with serverless function for Trakt
 */
export default class OAuthService extends Service {
  @service storage;

  @tracked isAuthenticatedTrakt = false;
  @tracked isAuthenticatedMAL = false;

  constructor() {
    super(...arguments);
    // Check if tokens exist on initialization
    this.checkAuthStatus();
  }

  /**
   * Check if user is authenticated with both services
   */
  checkAuthStatus() {
    const traktToken = this.storage.getToken('trakt_access_token');
    const malToken = this.storage.getToken('mal_access_token');

    this.isAuthenticatedTrakt =
      !!traktToken && !this.storage.isTokenExpired('trakt_expires_at');
    this.isAuthenticatedMAL =
      !!malToken && !this.storage.isTokenExpired('mal_expires_at');
  }

  /* ==================== PKCE Utilities ==================== */

  /**
   * Generate a random code verifier for PKCE
   * @returns {string} Base64URL encoded random string
   */
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  /**
   * Generate code challenge from verifier
   * @param {string} verifier - Code verifier
   * @returns {Promise<string>} SHA-256 hashed and base64URL encoded challenge
   */
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  /**
   * Base64URL encode a buffer
   * @param {Uint8Array} buffer - Buffer to encode
   * @returns {string} Base64URL encoded string
   */
  base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate a random state string for OAuth
   * @returns {string} Random UUID
   */
  generateState() {
    return crypto.randomUUID();
  }

  /* ==================== MAL OAuth (PKCE) ==================== */

  /**
   * Initiate MAL authentication with PKCE flow
   */
  async initiateMALAuth() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    // Save verifier and state for callback
    sessionStorage.setItem('mal_code_verifier', codeVerifier);
    sessionStorage.setItem('mal_oauth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.APP.MAL_CLIENT_ID,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      redirect_uri: `${config.APP.APP_URL}/auth/mal-callback`,
    });

    window.location.href = `${config.APP.MAL_AUTH_URL}?${params}`;
  }

  /**
   * Handle MAL OAuth callback
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   */
  async handleMALCallback(code, state) {
    // Validate state
    const savedState = sessionStorage.getItem('mal_oauth_state');
    if (state !== savedState) {
      throw new Error('Invalid OAuth state - possible CSRF attack');
    }

    const codeVerifier = sessionStorage.getItem('mal_code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }

    // Exchange code for tokens
    const response = await fetch(config.APP.MAL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.APP.MAL_CLIENT_ID,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: `${config.APP.APP_URL}/auth/mal-callback`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`MAL token exchange failed: ${error.error || response.statusText}`);
    }

    const tokens = await response.json();

    // Save tokens
    this.storage.setToken('mal_access_token', tokens.access_token);
    this.storage.setToken('mal_refresh_token', tokens.refresh_token);
    this.storage.set(
      'mal_expires_at',
      Date.now() + tokens.expires_in * 1000,
    );

    // Cleanup
    sessionStorage.removeItem('mal_code_verifier');
    sessionStorage.removeItem('mal_oauth_state');

    this.isAuthenticatedMAL = true;

    return tokens;
  }

  /**
   * Refresh MAL access token
   */
  async refreshMALToken() {
    const refreshToken = this.storage.getToken('mal_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(config.APP.MAL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.APP.MAL_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('MAL token refresh failed');
    }

    const tokens = await response.json();

    this.storage.setToken('mal_access_token', tokens.access_token);
    this.storage.setToken('mal_refresh_token', tokens.refresh_token);
    this.storage.set(
      'mal_expires_at',
      Date.now() + tokens.expires_in * 1000,
    );

    this.isAuthenticatedMAL = true;

    return tokens;
  }

  /* ==================== Trakt OAuth (via Serverless Function) ==================== */

  /**
   * Initiate Trakt authentication
   */
  async initiateTraktAuth() {
    const state = this.generateState();
    sessionStorage.setItem('trakt_oauth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.APP.TRAKT_CLIENT_ID,
      redirect_uri: `${config.APP.APP_URL}/auth/trakt-callback`,
      state,
    });

    window.location.href = `${config.APP.TRAKT_AUTH_URL}?${params}`;
  }

  /**
   * Handle Trakt OAuth callback
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   */
  async handleTraktCallback(code, state) {
    // Validate state
    const savedState = sessionStorage.getItem('trakt_oauth_state');
    if (state !== savedState) {
      throw new Error('Invalid OAuth state - possible CSRF attack');
    }

    // Call serverless function for token exchange
    const response = await fetch(config.APP.TRAKT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirect_uri: `${config.APP.APP_URL}/auth/trakt-callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Trakt token exchange failed: ${error.error || response.statusText}`,
      );
    }

    const tokens = await response.json();

    // Save tokens
    this.storage.setToken('trakt_access_token', tokens.access_token);
    this.storage.setToken('trakt_refresh_token', tokens.refresh_token);
    this.storage.set(
      'trakt_expires_at',
      Date.now() + tokens.expires_in * 1000,
    );

    // Cleanup
    sessionStorage.removeItem('trakt_oauth_state');

    this.isAuthenticatedTrakt = true;

    return tokens;
  }

  /**
   * Refresh Trakt access token
   */
  async refreshTraktToken() {
    const refreshToken = this.storage.getToken('trakt_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(config.APP.TRAKT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Trakt token refresh failed');
    }

    const tokens = await response.json();

    this.storage.setToken('trakt_access_token', tokens.access_token);
    if (tokens.refresh_token) {
      this.storage.setToken('trakt_refresh_token', tokens.refresh_token);
    }
    this.storage.set(
      'trakt_expires_at',
      Date.now() + tokens.expires_in * 1000,
    );

    this.isAuthenticatedTrakt = true;

    return tokens;
  }

  /* ==================== Logout ==================== */

  /**
   * Logout from Trakt
   */
  logoutTrakt() {
    this.storage.remove('trakt_access_token');
    this.storage.remove('trakt_refresh_token');
    this.storage.remove('trakt_expires_at');
    this.isAuthenticatedTrakt = false;
  }

  /**
   * Logout from MAL
   */
  logoutMAL() {
    this.storage.remove('mal_access_token');
    this.storage.remove('mal_refresh_token');
    this.storage.remove('mal_expires_at');
    this.isAuthenticatedMAL = false;
  }

  /**
   * Logout from both services
   */
  logoutAll() {
    this.logoutTrakt();
    this.logoutMAL();
  }
}
