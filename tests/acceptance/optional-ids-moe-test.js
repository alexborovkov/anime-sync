import Service from '@ember/service';
import { module, test } from 'qunit';
import { visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'trakt-mal-sync/tests/helpers';
import {
  requiredApiKeys,
  setupApiCredentials,
} from 'trakt-mal-sync/tests/helpers/api-credentials';

module('Acceptance | optional ids.moe configuration', function (hooks) {
  setupApplicationTest(hooks);
  setupApiCredentials(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'service:oauth',
      class extends Service {
        isAuthenticatedTrakt = true;
        isAuthenticatedMAL = true;
      }
    );
  });

  test('dashboard is ready with Trakt and MAL credentials alone', async function (assert) {
    const storage = this.owner.lookup('service:storage');
    for (const [key, value] of Object.entries(requiredApiKeys)) {
      storage.setUserApiKey(key, value);
    }

    await visit('/dashboard');

    assert.dom().doesNotIncludeText('API Configuration Required');
    assert.dom().doesNotIncludeText('ids.moe API key');
    assert.dom().includesText('Ready to Sync');
    assert.dom().includesText('Start Sync');
  });

  test('dashboard only lists Trakt and MAL as required credentials', async function (assert) {
    await visit('/dashboard');

    assert.dom().includesText('API Configuration Required');
    assert.dom().includesText('Trakt API credentials');
    assert.dom().includesText('MyAnimeList API credentials');
    assert.dom().doesNotIncludeText('ids.moe API key');
  });
});
