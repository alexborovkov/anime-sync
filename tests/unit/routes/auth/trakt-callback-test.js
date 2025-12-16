import { module, test } from 'qunit';
import { setupTest } from 'trakt-mal-sync/tests/helpers';

module('Unit | Route | auth/trakt-callback', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:auth/trakt-callback');
    assert.ok(route);
  });
});
