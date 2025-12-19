import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SyncPreviewRoute extends Route {
  @service oauth;
  @service router;

  beforeModel() {
    // Check if both services are connected
    if (!this.oauth.isAuthenticatedTrakt || !this.oauth.isAuthenticatedMAL) {
      this.router.transitionTo('dashboard');
    }
  }
}
