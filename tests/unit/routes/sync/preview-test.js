import { module, test } from 'qunit';
import { setupTest } from 'trakt-mal-sync/tests/helpers';

module('Unit | Route | sync/preview', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:sync/preview');
    assert.ok(route);
  });
});
