import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SyncProgressRoute extends Route {
  @service oauth;
  @service router;
  @service syncEngine;

  beforeModel() {
    // Check if both services are connected
    if (!this.oauth.isAuthenticatedTrakt || !this.oauth.isAuthenticatedMAL) {
      this.router.transitionTo('dashboard');
    }

    // Check if we have pending operations
    if (!this.syncEngine.pendingOperations || this.syncEngine.pendingOperations.length === 0) {
      this.router.transitionTo('sync.preview');
    }
  }

  async model() {
    // Read operations from service instead of query params
    return {
      direction: this.syncEngine.syncDirection,
      operations: this.syncEngine.pendingOperations,
    };
  }
}
