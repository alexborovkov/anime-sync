import { module, test } from 'qunit';
import { setupTest } from 'trakt-mal-sync/tests/helpers';
import {
  requiredApiKeys,
  setupApiCredentials,
} from 'trakt-mal-sync/tests/helpers/api-credentials';

module('Unit | Service | storage | required API keys', function (hooks) {
  setupTest(hooks);
  setupApiCredentials(hooks);

  hooks.beforeEach(function () {
    this.storage = this.owner.lookup('service:storage');
    for (const [key, value] of Object.entries(requiredApiKeys)) {
      this.storage.setUserApiKey(key, value);
    }
  });

  test('only Trakt and MAL credentials are required', function (assert) {
    assert.true(this.storage.hasRequiredKeys());
    this.storage.setUserApiKey('user_ids_moe_api_key', 'optional-key');
    assert.true(this.storage.hasRequiredKeys());
    this.storage.removeUserApiKey('user_ids_moe_api_key');
    assert.true(this.storage.hasRequiredKeys());
  });

  for (const missingKey of Object.keys(requiredApiKeys)) {
    test(`is not configured without ${missingKey}`, function (assert) {
      this.storage.setUserApiKey('user_ids_moe_api_key', 'optional-key');
      this.storage.removeUserApiKey(missingKey);
      assert.false(this.storage.hasRequiredKeys());
    });
  }
});
