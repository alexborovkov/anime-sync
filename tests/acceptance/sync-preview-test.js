import Service from '@ember/service';
import { module, test } from 'qunit';
import { click, fillIn, visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'trakt-mal-sync/tests/helpers';

module('Acceptance | sync preview | matched destinations', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'service:oauth',
      class extends Service {
        isAuthenticatedTrakt = true;
        isAuthenticatedMAL = true;
      }
    );
    this.owner.register(
      'service:trakt',
      class extends Service {
        async getUserLists() {
          return [{ name: 'Anime', ids: { slug: 'anime' }, item_count: 2 }];
        }
        async getListItems() {
          return [];
        }
      }
    );
    this.owner.register(
      'service:sync-engine',
      class extends Service {
        pendingOperations = null;

        async isListSynced() {
          return false;
        }

        async analyzeDifferences(direction) {
          const destination = direction === 'trakt-to-mal' ? 'mal' : 'trakt';
          return [
            {
              type: 'add',
              action: `add_to_${destination}`,
              entry: {
                title: 'First source title',
                malId: 11061,
                traktId: 'hunter-x-hunter-2011',
              },
            },
            {
              type: 'update',
              action: `update_${destination}`,
              entry: {
                title: 'Second source title',
                malId: 1,
                traktId: 'cowboy-bebop',
              },
            },
            {
              type: 'unmapped',
              action: 'skip',
              entry: { title: 'Unmatched source title' },
            },
          ];
        }
      }
    );
  });

  for (const direction of ['trakt-to-mal', 'mal-to-trakt']) {
    test(`${direction} exposes matched IDs and links before any sync`, async function (assert) {
      await visit('/sync/preview');
      await click(`[data-test-sync-direction="${direction}"]`);
      if (direction === 'trakt-to-mal') {
        await click('input[type="checkbox"]');
      } else {
        await fillIn('select', 'anime');
      }
      await click('[data-test-analyze-sync]');

      assert.dom('[data-test-sync-match]').exists({ count: 2 });
      assert
        .dom('[data-test-matched-target]')
        .exists({ count: 2 }, 'unmapped entries have no destination link');
      assert
        .dom('[data-test-sync-match]:nth-child(1) h4')
        .hasText('First source title');
      assert
        .dom('[data-test-sync-match]:nth-child(2) h4')
        .hasText('Second source title');

      const targets =
        direction === 'trakt-to-mal'
          ? [
              ['MAL ID 11061', 'https://myanimelist.net/anime/11061'],
              ['MAL ID 1', 'https://myanimelist.net/anime/1'],
            ]
          : [
              [
                'hunter-x-hunter-2011',
                'https://trakt.tv/shows/hunter-x-hunter-2011',
              ],
              ['cowboy-bebop', 'https://trakt.tv/shows/cowboy-bebop'],
            ];
      for (const [index, [label, url]] of targets.entries()) {
        const selector = `[data-test-sync-match]:nth-child(${index + 1}) [data-test-matched-target]`;
        assert.dom(selector).hasText(label);
        assert.dom(selector).hasAttribute('href', url);
        assert.dom(selector).hasAttribute('target', '_blank');
        assert.dom(selector).hasAttribute('rel', 'noopener noreferrer');
      }

      await click('[data-test-cancel-sync]');
      assert.dom('[data-test-sync-match]').doesNotExist();
      assert.dom('[data-test-sync-direction]').exists({ count: 2 });
      assert.strictEqual(
        this.owner.lookup('service:sync-engine').pendingOperations,
        null,
        'cancelling does not queue writes'
      );
    });
  }
});
