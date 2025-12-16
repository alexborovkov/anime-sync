import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class SettingsController extends Controller {
  @service oauth;
  @service storage;
  @service cache;

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
    if (confirm('Are you sure you want to disconnect Trakt? This will remove all stored tokens.')) {
      this.oauth.logoutTrakt();
      window.location.reload();
    }
  }

  @action
  disconnectMAL() {
    if (confirm('Are you sure you want to disconnect MyAnimeList? This will remove all stored tokens.')) {
      this.oauth.logoutMAL();
      window.location.reload();
    }
  }

  @action
  async clearCache() {
    if (confirm('Are you sure you want to clear all cached data? This will require re-fetching data from APIs.')) {
      await this.cache.clearAll();
      alert('Cache cleared successfully!');
    }
  }

  @action
  clearAll() {
    if (confirm('Are you sure you want to clear ALL data including tokens and cache? You will need to reconnect your accounts.')) {
      this.oauth.logoutAll();
      this.storage.clearAll();
      window.location.reload();
    }
  }
}
