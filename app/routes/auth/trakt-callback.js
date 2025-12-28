import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AuthTraktCallbackRoute extends Route {
  @service oauth;
  @service router;

  async model(params) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      return {
        error: true,
        message: error,
      };
    }

    if (!code || !state) {
      return {
        error: true,
        message: 'Missing authorization code or state',
      };
    }

    try {
      await this.oauth.handleTraktCallback(code, state);
      return {
        success: true,
        service: 'Trakt',
      };
    } catch (err) {
      return {
        error: true,
        message: err.message,
      };
    }
  }

  afterModel(model) {
    if (model.success) {
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        this.router.transitionTo('dashboard');
      }, 2000);
    }
  }
}
