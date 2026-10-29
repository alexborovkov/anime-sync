import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupTest } from 'trakt-mal-sync/tests/helpers';
import { setupApiCredentials } from 'trakt-mal-sync/tests/helpers/api-credentials';

const original = {
  id: 136,
  title: 'Hunter x Hunter',
  start_season: { year: 1999 },
};
const remake = {
  id: 11061,
  title: 'Hunter x Hunter',
  start_season: { year: 2011 },
};

// Model MAL's sparse responses: the matcher only gets a year if requested.
function malResponse(endpoint, anime) {
  const fields = new URL(endpoint, 'https://myanimelist.net').searchParams
    .get('fields')
    .split(',');
  return {
    data: anime.map(({ id, title, start_season }) => ({
      node: {
        id,
        title,
        ...(fields.includes('start_season') ? { start_season } : {}),
      },
    })),
  };
}

module('Unit | Service | mal | year-aware mapping', function (hooks) {
  setupTest(hooks);
  setupApiCredentials(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'service:cache',
      class extends Service {
        CACHE_DURATION = { malData: 1000, mapping: 1000 };
        async get() {
          return null;
        }
        async set() {}
      }
    );
    this.owner.register(
      'service:trakt',
      class extends Service {
        async searchShows() {
          return [
            {
              show: {
                title: 'Hunter x Hunter',
                year: 1999,
                ids: { slug: 'hunter-x-hunter-1999' },
              },
            },
            {
              show: {
                title: 'Hunter x Hunter',
                year: 2011,
                ids: { slug: 'hunter-x-hunter-2011' },
              },
            },
          ];
        }
      }
    );
    this.mal = this.owner.lookup('service:mal');
    this.mapping = this.owner.lookup('service:mapping');
  });

  test('anime-list responses include the year needed to choose the matching Trakt release', async function (assert) {
    this.mal.request = async (endpoint) => {
      assert.true(endpoint.startsWith('/users/@me/animelist?'));
      return malResponse(endpoint, [remake]);
    };

    const entries = await this.mal.getAllAnime();
    assert.strictEqual(entries[0].node.start_season?.year, 2011);
    assert.strictEqual(
      await this.mapping.getTraktSlugFromMAL(entries[0].node),
      'hunter-x-hunter-2011',
      'chooses the matching year, not the first same-title result'
    );
  });

  test('anime-search responses include the year needed to choose the matching MAL release', async function (assert) {
    this.mal.request = async (endpoint) => {
      assert.true(endpoint.startsWith('/anime?'));
      return malResponse(endpoint, [original, remake]);
    };

    assert.strictEqual(
      await this.mapping.getMALIdFromTrakt({
        title: 'Hunter x Hunter',
        year: 2011,
        ids: { slug: 'hunter-x-hunter-2011' },
      }),
      11061,
      'chooses the matching year, not the first same-title result'
    );
  });
});
