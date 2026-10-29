import config from 'trakt-mal-sync/config/environment';

export const requiredApiKeys = {
  user_trakt_client_id: 'test-trakt-id',
  user_trakt_client_secret: 'test-trakt-secret',
  user_mal_client_id: 'test-mal-id',
  user_mal_client_secret: 'test-mal-secret',
};

// Isolate browser credentials and the legacy environment key between tests.
export function setupApiCredentials(hooks) {
  const keys = [...Object.keys(requiredApiKeys), 'user_ids_moe_api_key'];
  let previousValues;
  let previousEnvironmentKey;

  hooks.beforeEach(function () {
    previousValues = keys.map((key) => localStorage.getItem(key));
    keys.forEach((key) => localStorage.removeItem(key));
    previousEnvironmentKey = config.APP.IDS_MOE_API_KEY;
    config.APP.IDS_MOE_API_KEY = '';
  });

  hooks.afterEach(function () {
    keys.forEach((key, index) => {
      if (previousValues[index] === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, previousValues[index]);
      }
    });
    config.APP.IDS_MOE_API_KEY = previousEnvironmentKey;
  });
}
