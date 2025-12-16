import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class DashboardController extends Controller {
  @service oauth;
  @service router;

  get isAuthenticatedTrakt() {
    return this.oauth.isAuthenticatedTrakt;
  }

  get isAuthenticatedMAL() {
    return this.oauth.isAuthenticatedMAL;
  }

  @action
  async connectTrakt() {
    await this.oauth.initiateTraktAuth();
  }

  @action
  async connectMAL() {
    await this.oauth.initiateMALAuth();
  }

  @action
  disconnectTrakt() {
    if (confirm('Are you sure you want to disconnect Trakt?')) {
      this.oauth.logoutTrakt();
      window.location.reload();
    }
  }

  @action
  disconnectMAL() {
    if (confirm('Are you sure you want to disconnect MyAnimeList?')) {
      this.oauth.logoutMAL();
      window.location.reload();
    }
  }

  @action
  goToSync() {
    this.router.transitionTo('sync.preview');
  }
}
