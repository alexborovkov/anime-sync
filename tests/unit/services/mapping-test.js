import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupTest } from 'trakt-mal-sync/tests/helpers';
import { setupApiCredentials } from 'trakt-mal-sync/tests/helpers/api-credentials';
import config from 'trakt-mal-sync/config/environment';

const malAnime = {
  id: 1,
  title: 'Cowboy Bebop',
  start_season: { year: 1998 },
};
const traktShow = {
  title: 'Cowboy Bebop',
  year: 1998,
  ids: { slug: 'cowboy-bebop', trakt: 123 },
};

class CacheStub extends Service {
  CACHE_DURATION = { mapping: 1000 };
  records = new Map();
  writes = [];

  async get(store, key) {
    return this.records.get(`${store}:${key}`);
  }

  async set(store, value, duration) {
    this.writes.push({ store, value, duration });
    this.records.set(`${store}:${value.id}`, value);
  }
}

class TraktStub extends Service {
  results = [{ show: traktShow }];
  searches = [];
  updates = [];

  async searchShows(title) {
    this.searches.push(title);
    return this.results;
  }

  async getShow() {
    return traktShow;
  }

  async getListItems() {
    return [{ show: traktShow, plays: 26 }];
  }

  async addItemsToList(listId, shows) {
    this.updates.push({ listId, shows });
  }
}

class MalStub extends Service {
  results = [{ node: malAnime }];
  entries = [];
  searches = [];
  updates = [];

  async searchAnime(title) {
    this.searches.push(title);
    return { data: this.results };
  }

  async getAllAnime() {
    return this.entries;
  }

  async updateAnimeStatus(id, updates) {
    this.updates.push({ id, updates });
  }
}

module('Unit | Service | mapping | optional ids.moe', function (hooks) {
  setupTest(hooks);
  setupApiCredentials(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:cache', CacheStub);
    this.owner.register('service:trakt', TraktStub);
    this.owner.register('service:mal', MalStub);
    this.mapping = this.owner.lookup('service:mapping');
    this.storage = this.owner.lookup('service:storage');
    this.cache = this.owner.lookup('service:cache');
    this.trakt = this.owner.lookup('service:trakt');
    this.mal = this.owner.lookup('service:mal');
    this.originalFetch = window.fetch;
    this.fetchCalls = [];
    window.fetch = async (...args) => {
      this.fetchCalls.push(args);
      return this.respondToIdsMoe(...args);
    };
    this.respondToIdsMoe = () => {
      throw new TypeError('Failed to fetch');
    };
  });

  hooks.afterEach(function () {
    window.fetch = this.originalFetch;
  });

  test('maps MAL to Trakt by title without contacting ids.moe', async function (assert) {
    assert.strictEqual(
      await this.mapping.getTraktSlugFromMAL(malAnime),
      'cowboy-bebop'
    );
    assert.deepEqual(this.trakt.searches, ['Cowboy Bebop']);
    assert.deepEqual(this.fetchCalls, []);
    assert.strictEqual(this.cache.writes[0].value.malId, 1);
    assert.strictEqual(this.cache.writes[0].value.traktId, 'cowboy-bebop');
  });

  test('maps Trakt to MAL by title without contacting ids.moe', async function (assert) {
    assert.strictEqual(await this.mapping.getMALIdFromTrakt(traktShow), 1);
    assert.deepEqual(this.mal.searches, ['Cowboy Bebop']);
    assert.deepEqual(this.fetchCalls, []);
    assert.strictEqual(this.cache.writes[0].value.malId, 1);
    assert.strictEqual(this.cache.writes[0].value.traktId, 'cowboy-bebop');
  });

  test('ids.moe helpers skip requests without a key', async function (assert) {
    assert.strictEqual(
      await this.mapping.getExternalIdsFromIdsMoe('myanimelist', 1),
      null
    );
    assert.strictEqual(
      await this.mapping.searchIdsMoeByTitle('Cowboy Bebop'),
      null
    );
    assert.strictEqual(
      await this.mapping.getMalIdFromIdsMoe('trakt', 123),
      null
    );
    assert.deepEqual(this.fetchCalls, []);
  });

  test('preserves alternative-title matching in both directions', async function (assert) {
    const source = {
      ...malAnime,
      id: 16498,
      title: 'Shingeki no Kyojin',
      alternative_titles: { en: 'Attack on Titan' },
    };
    const target = {
      ...traktShow,
      title: 'Attack on Titan',
      ids: { slug: 'attack-on-titan' },
    };
    this.trakt.results = [{ show: target }];
    this.mal.results = [{ node: source }];

    assert.strictEqual(
      await this.mapping.getTraktSlugFromMAL(source),
      'attack-on-titan'
    );
    assert.strictEqual(await this.mapping.getMALIdFromTrakt(target), 16498);
    assert.deepEqual(this.fetchCalls, []);
  });

  for (const failure of ['network error', 'HTTP error', 'no mapping']) {
    test(`falls back in both directions after ids.moe ${failure}`, async function (assert) {
      this.storage.setUserApiKey('user_ids_moe_api_key', 'existing-key');
      this.respondToIdsMoe = () => {
        if (failure === 'network error') {
          throw new TypeError('Failed to fetch');
        }
        return new Response(JSON.stringify({ results: [] }), {
          status: failure === 'HTTP error' ? 503 : 200,
        });
      };

      assert.strictEqual(
        await this.mapping.getTraktSlugFromMAL(malAnime),
        'cowboy-bebop'
      );
      assert.strictEqual(await this.mapping.getMALIdFromTrakt(traktShow), 1);
      assert.strictEqual(
        this.fetchCalls.length,
        2,
        'tries the optional provider in each direction'
      );
      assert.deepEqual(this.trakt.searches, ['Cowboy Bebop']);
      assert.deepEqual(this.mal.searches, ['Cowboy Bebop']);
    });
  }

  test('still uses configured ids.moe mappings when available', async function (assert) {
    this.storage.setUserApiKey('user_ids_moe_api_key', 'existing-key');
    this.respondToIdsMoe = (url, options) => {
      assert.strictEqual(options.headers.Authorization, 'Bearer existing-key');
      const payload = url.includes('/search?')
        ? { results: [{ id: 999 }] }
        : { trakt: 123, myanimelist: 1 };
      return new Response(JSON.stringify(payload));
    };

    assert.strictEqual(
      await this.mapping.getTraktSlugFromMAL(malAnime),
      'cowboy-bebop'
    );
    assert.strictEqual(await this.mapping.getMALIdFromTrakt(traktShow), 1);
    assert.strictEqual(this.fetchCalls.length, 3);
    assert.deepEqual(this.trakt.searches, []);
    assert.deepEqual(this.mal.searches, []);
  });

  test('preserves legacy environment keys and user-key precedence', function (assert) {
    config.APP.IDS_MOE_API_KEY = 'environment-key';
    assert.strictEqual(this.mapping.getIdsMoeApiKey(), 'environment-key');
    this.storage.setUserApiKey('user_ids_moe_api_key', 'user-key');
    assert.strictEqual(this.mapping.getIdsMoeApiKey(), 'user-key');
    this.storage.removeUserApiKey('user_ids_moe_api_key');
    assert.strictEqual(this.mapping.getIdsMoeApiKey(), 'environment-key');
  });

  for (const resultType of ['empty', 'unrelated']) {
    test(`returns no mapping for ${resultType} title results`, async function (assert) {
      this.trakt.results =
        resultType === 'empty'
          ? []
          : [{ show: { ...traktShow, title: 'Naruto' } }];
      this.mal.results =
        resultType === 'empty'
          ? []
          : [{ node: { ...malAnime, title: 'Naruto' } }];

      assert.strictEqual(
        await this.mapping.getTraktSlugFromMAL(malAnime),
        null
      );
      assert.strictEqual(await this.mapping.getMALIdFromTrakt(traktShow), null);
      assert.deepEqual(
        this.cache.writes,
        [],
        'does not cache unsuccessful matches'
      );
      assert.deepEqual(this.fetchCalls, []);
    });
  }

  test('analyzes and executes Trakt to MAL sync without ids.moe', async function (assert) {
    const sync = this.owner.lookup('service:sync-engine');
    const operations = await sync.analyzeDifferences('trakt-to-mal', ['anime']);
    const results = await sync.executeSyncOperations(operations);

    assert.strictEqual(operations[0].action, 'add_to_mal');
    assert.strictEqual(results.successful, 1);
    assert.strictEqual(results.failed, 0);
    assert.deepEqual(this.mal.updates, [
      {
        id: 1,
        updates: { status: 'completed', num_watched_episodes: 26 },
      },
    ]);
    assert.deepEqual(this.fetchCalls, []);
  });

  test('analyzes and executes MAL to Trakt sync without ids.moe', async function (assert) {
    this.mal.entries = [
      { node: malAnime, list_status: { status: 'completed' } },
    ];
    const sync = this.owner.lookup('service:sync-engine');
    sync.targetTraktListId = 'anime';
    const operations = await sync.analyzeDifferences('mal-to-trakt');
    const results = await sync.executeSyncOperations(operations);

    assert.strictEqual(operations[0].action, 'add_to_trakt');
    assert.strictEqual(results.successful, 1);
    assert.strictEqual(results.failed, 0);
    assert.deepEqual(this.trakt.updates, [
      {
        listId: 'anime',
        shows: [{ ids: { slug: 'cowboy-bebop' } }],
      },
    ]);
    assert.deepEqual(this.fetchCalls, []);
  });
});
