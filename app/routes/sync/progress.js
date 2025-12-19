import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SyncProgressRoute extends Route {
  @service oauth;
  @service router;

  queryParams = {
    direction: { refreshModel: false },
    operations: { refreshModel: false },
  };

  beforeModel() {
    // Check if both services are connected
    if (!this.oauth.isAuthenticatedTrakt || !this.oauth.isAuthenticatedMAL) {
      this.router.transitionTo('dashboard');
    }
  }

  async model(params) {
    let operations = [];
    try {
      operations = params.operations ? JSON.parse(params.operations) : [];
    } catch {
      operations = [];
    }

    return {
      direction: params.direction,
      operations,
    };
  }
}
