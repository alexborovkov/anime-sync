import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SyncResultsRoute extends Route {
  @service syncEngine;

  async model() {
    // Read results from syncEngine service instead of query params
    return {
      results: this.syncEngine.lastSyncResults,
    };
  }
}
