import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SettingsRoute extends Route {
  @service oauth;

  model() {
    return {
      isAuthenticatedTrakt: this.oauth.isAuthenticatedTrakt,
      isAuthenticatedMAL: this.oauth.isAuthenticatedMAL,
    };
  }
}
