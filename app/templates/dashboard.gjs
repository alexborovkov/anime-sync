import { pageTitle } from 'ember-page-title';
import RouteTemplate from 'ember-route-template';
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { LinkTo } from '@ember/routing';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { and, not } from 'ember-truth-helpers';
import ConnectionCard from 'trakt-mal-sync/components/connection-card';
// eslint-disable-next-line no-unused-vars
import OAuthService from 'trakt-mal-sync/services/oauth';
// eslint-disable-next-line no-unused-vars
import StorageService from 'trakt-mal-sync/services/storage';

class DashboardComponent extends Component {
  /** @type {OAuthService} */
  @service oauth;
  /** @type {StorageService} */
  @service storage;
  @service router;

    get isAuthenticatedTrakt() {
      return this.oauth.isAuthenticatedTrakt;
    }

    get isAuthenticatedMAL() {
      return this.oauth.isAuthenticatedMAL;
    }

    get hasRequiredKeys() {
      return this.storage.hasRequiredKeys();
    }

    get hasTraktKeys() {
      return this.storage.hasTraktKeys();
    }

    get hasMALKeys() {
      return this.storage.hasMALKeys();
    }

    get hasIdsMoeKey() {
      return !!this.storage.getUserApiKey('user_ids_moe_api_key');
    }

    @action
    async connectTrakt() {
      try {
        await this.oauth.initiateTraktAuth();
      } catch (error) {
        alert(error.message);
      }
    }

    @action
    async connectMAL() {
      try {
        await this.oauth.initiateMALAuth();
      } catch (error) {
        alert(error.message);
      }
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

    <template>
      {{pageTitle "Dashboard"}}

      <div class="min-h-screen bg-gradient-to-br from-trakt-dark via-gray-900 to-mal-blue">
        <div class="container mx-auto px-4 py-8">

          {{! Header }}
          <div class="mb-8">
            <h1 class="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p class="text-gray-300">Manage your connections and sync your anime lists</p>
          </div>

          {{! API Keys Warning }}
          {{#if (not this.hasRequiredKeys)}}
            <div class="mb-8">
              <div class="bg-blue-900/30 border border-blue-500 rounded-lg p-6">
                <h3 class="text-blue-400 font-bold mb-2 flex items-center gap-2">
                  <span>ℹ️</span>
                  API Configuration Required
                </h3>
                <p class="text-gray-300 mb-4">
                  Before you can connect your accounts, you need to configure your API credentials in Settings.
                </p>
                <div class="flex flex-col gap-2 text-sm text-gray-400 mb-4">
                  <div class="flex items-center gap-2">
                    <span>{{if this.hasTraktKeys "✅" "❌"}}</span>
                    <span>Trakt API credentials</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span>{{if this.hasMALKeys "✅" "❌"}}</span>
                    <span>MyAnimeList API credentials</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span>{{if this.hasIdsMoeKey "✅" "❌"}}</span>
                    <span>ids.moe API key</span>
                  </div>
                </div>
                <LinkTo
                  @route="settings"
                  class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Configure API Keys in Settings →
                </LinkTo>
              </div>
            </div>
          {{/if}}

          {{! Connection Status }}
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-white mb-4">Connections</h2>
            <div class="grid md:grid-cols-2 gap-6">

              <ConnectionCard
                @service="Trakt"
                @description="Connect your Trakt.tv account to sync your watched anime."
                @isConnected={{this.isAuthenticatedTrakt}}
                @onConnect={{this.connectTrakt}}
                @onDisconnect={{this.disconnectTrakt}}
                @buttonClass="bg-trakt-red hover:bg-red-700"
              />

              <ConnectionCard
                @service="MyAnimeList"
                @description="Connect your MyAnimeList account to sync your anime list."
                @isConnected={{this.isAuthenticatedMAL}}
                @onConnect={{this.connectMAL}}
                @onDisconnect={{this.disconnectMAL}}
                @buttonClass="bg-mal-blue hover:bg-blue-700"
              />

            </div>
          </div>

          {{! Sync Actions }}
          {{#if (and this.isAuthenticatedTrakt this.isAuthenticatedMAL)}}
            <div class="mb-8">
              <h2 class="text-2xl font-bold text-white mb-4">Sync Options</h2>
              <div class="bg-gray-800 rounded-lg p-6">
                <p class="text-gray-300 mb-6">
                  Both accounts are connected! You can now synchronize your anime lists.
                </p>

                <div class="grid md:grid-cols-2 gap-4">

                  <button
                    type="button"
                    {{on "click" this.goToSync}}
                    class="bg-gradient-to-r from-trakt-red to-mal-lightblue hover:shadow-lg text-white font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>🔄</span>
                    Start Sync
                  </button>

                  <LinkTo
                    @route="settings"
                    class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>⚙️</span>
                    Settings
                  </LinkTo>

                </div>
              </div>
            </div>
          {{else}}
            <div class="mb-8">
              <div class="bg-yellow-900/30 border border-yellow-600 rounded-lg p-6">
                <h3 class="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  Connection Required
                </h3>
                <p class="text-gray-300">
                  Please connect both Trakt and MyAnimeList accounts to enable synchronization.
                </p>
              </div>
            </div>
          {{/if}}

          {{! Quick Stats }}
          <div class="grid md:grid-cols-3 gap-6">

            <div class="bg-gray-800 rounded-lg p-6">
              <h3 class="text-gray-400 text-sm font-medium mb-2">Status</h3>
              <p class="text-2xl font-bold text-white">
                {{#if (and this.isAuthenticatedTrakt this.isAuthenticatedMAL)}}
                  Ready to Sync
                {{else}}
                  Not Ready
                {{/if}}
              </p>
            </div>

            <div class="bg-gray-800 rounded-lg p-6">
              <h3 class="text-gray-400 text-sm font-medium mb-2">Trakt</h3>
              <p class="text-2xl font-bold {{if this.isAuthenticatedTrakt 'text-green-400' 'text-gray-500'}}">
                {{if this.isAuthenticatedTrakt 'Connected' 'Disconnected'}}
              </p>
            </div>

            <div class="bg-gray-800 rounded-lg p-6">
              <h3 class="text-gray-400 text-sm font-medium mb-2">MyAnimeList</h3>
              <p class="text-2xl font-bold {{if this.isAuthenticatedMAL 'text-green-400' 'text-gray-500'}}">
                {{if this.isAuthenticatedMAL 'Connected' 'Disconnected'}}
              </p>
            </div>

          </div>

        </div>
      </div>
    </template>
}

export default RouteTemplate(DashboardComponent);
