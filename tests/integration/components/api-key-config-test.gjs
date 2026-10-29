import { module, test } from 'qunit';
import { click, fillIn, render } from '@ember/test-helpers';
import { setupRenderingTest } from 'trakt-mal-sync/tests/helpers';
import {
  requiredApiKeys,
  setupApiCredentials,
} from 'trakt-mal-sync/tests/helpers/api-credentials';
import ApiKeyConfig from 'trakt-mal-sync/components/api-key-config';

const fields = [
  ['Enter your Trakt Client ID', 'user_trakt_client_id'],
  ['Enter your Trakt Client Secret', 'user_trakt_client_secret'],
  ['Enter your MAL Client ID', 'user_mal_client_id'],
  ['Enter your MAL Client Secret', 'user_mal_client_secret'],
];

async function fillRequiredKeys(omittedKey) {
  for (const [placeholder, key] of fields) {
    if (key !== omittedKey) {
      await fillIn(`input[placeholder="${placeholder}"]`, requiredApiKeys[key]);
    }
  }
}

module('Integration | Component | api-key-config', function (hooks) {
  setupRenderingTest(hooks);
  setupApiCredentials(hooks);

  test('saves Trakt and MAL credentials without an ids.moe key', async function (assert) {
    await render(<template><ApiKeyConfig /></template>);
    await fillRequiredKeys();
    await click('[data-test-save-api-keys]');

    const storage = this.owner.lookup('service:storage');
    for (const [key, value] of Object.entries(requiredApiKeys)) {
      assert.strictEqual(storage.getUserApiKey(key), value);
    }
    assert.true(storage.hasRequiredKeys());
    assert.notOk(storage.getUserApiKey('user_ids_moe_api_key'));
    assert.dom('[data-test-save-api-keys]').hasText('Saved!');
    assert.dom().includesText('ids.moe API Key (Optional)');
    assert.dom().includesText('Using title matching');
    assert.dom('[data-test-api-key-error]').doesNotExist();
  });

  test('saves and reloads an optional ids.moe key', async function (assert) {
    await render(<template><ApiKeyConfig /></template>);
    await fillRequiredKeys();
    await fillIn(
      'input[placeholder="Optional ids.moe API key"]',
      'existing-key'
    );
    await click('[data-test-save-api-keys]');

    const storage = this.owner.lookup('service:storage');
    assert.strictEqual(
      storage.getUserApiKey('user_ids_moe_api_key'),
      'existing-key'
    );

    await render(<template><ApiKeyConfig /></template>);
    assert
      .dom('input[placeholder="Optional ids.moe API key"]')
      .hasValue('existing-key');
  });

  test('clearing a saved ids.moe key keeps required credentials configured', async function (assert) {
    const storage = this.owner.lookup('service:storage');
    for (const [key, value] of Object.entries(requiredApiKeys)) {
      storage.setUserApiKey(key, value);
    }
    storage.setUserApiKey('user_ids_moe_api_key', 'old-key');

    await render(<template><ApiKeyConfig /></template>);
    await fillIn('input[placeholder="Optional ids.moe API key"]', '   ');
    await click('[data-test-save-api-keys]');

    assert.notOk(storage.getUserApiKey('user_ids_moe_api_key'));
    assert.true(storage.hasRequiredKeys());
    assert.strictEqual(
      this.owner.lookup('service:mapping').getIdsMoeApiKey(),
      null
    );
    assert.dom('[data-test-save-api-keys]').hasText('Saved!');
  });

  for (const [, omittedKey] of fields) {
    test(`still requires ${omittedKey}`, async function (assert) {
      await render(<template><ApiKeyConfig /></template>);
      await fillRequiredKeys(omittedKey);
      await click('[data-test-save-api-keys]');

      const serviceName = omittedKey.includes('trakt') ? 'Trakt' : 'MAL';
      assert
        .dom('[data-test-api-key-error]')
        .hasText(`${serviceName} Client ID and Client Secret are required`);
      assert.false(this.owner.lookup('service:storage').hasRequiredKeys());
      assert.notOk(
        this.owner
          .lookup('service:storage')
          .getUserApiKey('user_trakt_client_id'),
        'validation does not partially save credentials'
      );
    });
  }
});
