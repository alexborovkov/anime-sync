'use strict';

module.exports = function (environment) {
  const ENV = {
    modulePrefix: 'trakt-mal-sync',
    environment,
    rootURL: '/',
    locationType: 'history',
    EmberENV: {
      EXTEND_PROTOTYPES: false,
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
      },
    },

    APP: {
      // API Configuration
      TRAKT_CLIENT_ID: process.env.TRAKT_CLIENT_ID || '',
      MAL_CLIENT_ID: process.env.MAL_CLIENT_ID || '',
      APP_URL: process.env.APP_URL || 'http://localhost:4201',

      // API Endpoints
      TRAKT_API_BASE_URL: 'https://api.trakt.tv',
      MAL_API_BASE_URL: 'https://api.myanimelist.net/v2',

      // OAuth URLs
      TRAKT_AUTH_URL: 'https://trakt.tv/oauth/authorize',
      TRAKT_TOKEN_URL: '/api/trakt-token',  // Serverless function
      MAL_AUTH_URL: 'https://myanimelist.net/v1/oauth2/authorize',
      MAL_TOKEN_URL: 'https://myanimelist.net/v1/oauth2/token',
    },
  };

  if (environment === 'development') {
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;
  }

  if (environment === 'production') {
    // here you can enable a production-specific feature
  }

  return ENV;
};
