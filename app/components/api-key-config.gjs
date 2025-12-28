import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import RedirectUriHelper from './redirect-uri-helper';
// eslint-disable-next-line no-unused-vars
import StorageService from 'trakt-mal-sync/services/storage';

/**
 * Component for configuring user API keys for Trakt, MAL, and ids.moe
 */
export default class ApiKeyConfig extends Component {
  /** @type {StorageService} */
  @service storage;

  @tracked traktClientId = '';
  @tracked traktClientSecret = '';
  @tracked malClientId = '';
  @tracked malClientSecret = '';
  @tracked idsMoeApiKey = '';

  @tracked saveStatus = ''; // 'saving', 'saved', 'error'
  @tracked errorMessage = '';

  constructor() {
    super(...arguments);
    this.loadKeys();
  }

  /**
   * Load existing keys from storage
   */
  loadKeys() {
    this.traktClientId =
      this.storage.getUserApiKey('user_trakt_client_id') || '';
    this.traktClientSecret =
      this.storage.getUserApiKey('user_trakt_client_secret') || '';
    this.malClientId = this.storage.getUserApiKey('user_mal_client_id') || '';
    this.malClientSecret =
      this.storage.getUserApiKey('user_mal_client_secret') || '';
    this.idsMoeApiKey =
      this.storage.getUserApiKey('user_ids_moe_api_key') || '';
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

  get allRequiredKeysConfigured() {
    return this.hasTraktKeys && this.hasMALKeys;
  }

  @action
  updateTraktClientId(event) {
    this.traktClientId = event.target.value.trim();
  }

  @action
  updateTraktClientSecret(event) {
    this.traktClientSecret = event.target.value.trim();
  }

  @action
  updateMalClientId(event) {
    this.malClientId = event.target.value.trim();
  }

  @action
  updateMalClientSecret(event) {
    this.malClientSecret = event.target.value.trim();
  }

  @action
  updateIdsMoeApiKey(event) {
    this.idsMoeApiKey = event.target.value.trim();
  }

  @action
  async saveKeys() {
    this.saveStatus = 'saving';
    this.errorMessage = '';

    try {
      // Validate required fields
      if (!this.traktClientId || !this.traktClientSecret) {
        throw new Error('Trakt Client ID and Client Secret are required');
      }
      if (!this.malClientId || !this.malClientSecret) {
        throw new Error('MAL Client ID and Client Secret are required');
      }

      // Save to storage
      this.storage.setUserApiKey('user_trakt_client_id', this.traktClientId);
      this.storage.setUserApiKey(
        'user_trakt_client_secret',
        this.traktClientSecret,
      );
      this.storage.setUserApiKey('user_mal_client_id', this.malClientId);
      this.storage.setUserApiKey(
        'user_mal_client_secret',
        this.malClientSecret,
      );

      // ids.moe is optional
      if (this.idsMoeApiKey) {
        this.storage.setUserApiKey('user_ids_moe_api_key', this.idsMoeApiKey);
      } else {
        this.storage.removeUserApiKey('user_ids_moe_api_key');
      }

      this.saveStatus = 'saved';
      setTimeout(() => {
        this.saveStatus = '';
      }, 3000);
    } catch (error) {
      this.saveStatus = 'error';
      this.errorMessage = error.message;
    }
  }

  @action
  clearKeys() {
    if (
      confirm(
        'Are you sure you want to clear all API keys? You will need to re-enter them.',
      )
    ) {
      this.storage.removeUserApiKey('user_trakt_client_id');
      this.storage.removeUserApiKey('user_trakt_client_secret');
      this.storage.removeUserApiKey('user_mal_client_id');
      this.storage.removeUserApiKey('user_mal_client_secret');
      this.storage.removeUserApiKey('user_ids_moe_api_key');

      this.loadKeys();
      this.saveStatus = '';
      this.errorMessage = '';
    }
  }

  <template>
    <div class="bg-gray-800 rounded-lg p-6">

      {{! Status Messages }}
      {{#if this.allRequiredKeysConfigured}}
        <div class="mb-4 bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded">
          All required API keys are configured
        </div>
      {{else}}
        <div class="mb-4 bg-yellow-900 border border-yellow-700 text-yellow-100 px-4 py-3 rounded">
          Please configure your API keys to use this application
        </div>
      {{/if}}

      {{! Instructions }}
      <div class="mb-6">
        <h3 class="text-lg font-bold text-white mb-2">API Credentials</h3>
        <p class="text-gray-300 text-sm mb-4">
          This application requires your own API credentials. Your keys are stored locally in your browser and never sent to our servers (except when making authorized API calls to Trakt and MAL).
        </p>
      </div>

      {{! Redirect URI Helper }}
      <RedirectUriHelper />

      {{! Trakt API Keys }}
      <div class="mb-6 pb-6 border-b border-gray-700">
        <div class="flex items-center mb-3">
          <h4 class="text-white font-medium flex-1">Trakt API Keys</h4>
          {{#if this.hasTraktKeys}}
            <span class="text-green-400 text-sm">Configured</span>
          {{else}}
            <span class="text-yellow-400 text-sm">Not configured</span>
          {{/if}}
        </div>
        <p class="text-gray-400 text-sm mb-3">
          Register your app at
          <a
            href="https://trakt.tv/oauth/applications"
            target="_blank"
            rel="noopener noreferrer"
            class="text-trakt-red hover:underline"
          >
            trakt.tv/oauth/applications
          </a>
        </p>

        <div class="mb-3">
          <label class="block text-gray-300 text-sm font-medium mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={{this.traktClientId}}
            {{on "input" this.updateTraktClientId}}
            placeholder="Enter your Trakt Client ID"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:border-trakt-red"
          />
        </div>

        <div>
          <label class="block text-gray-300 text-sm font-medium mb-1">
            Client Secret
          </label>
          <input
            type="password"
            value={{this.traktClientSecret}}
            {{on "input" this.updateTraktClientSecret}}
            placeholder="Enter your Trakt Client Secret"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:border-trakt-red"
          />
        </div>
      </div>

      {{! MAL API Keys }}
      <div class="mb-6 pb-6 border-b border-gray-700">
        <div class="flex items-center mb-3">
          <h4 class="text-white font-medium flex-1">MyAnimeList API Keys</h4>
          {{#if this.hasMALKeys}}
            <span class="text-green-400 text-sm">Configured</span>
          {{else}}
            <span class="text-yellow-400 text-sm">Not configured</span>
          {{/if}}
        </div>
        <p class="text-gray-400 text-sm mb-3">
          Register your app at
          <a
            href="https://myanimelist.net/apiconfig"
            target="_blank"
            rel="noopener noreferrer"
            class="text-mal-blue hover:underline"
          >
            myanimelist.net/apiconfig
          </a>
        </p>

        <div class="mb-3">
          <label class="block text-gray-300 text-sm font-medium mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={{this.malClientId}}
            {{on "input" this.updateMalClientId}}
            placeholder="Enter your MAL Client ID"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:border-mal-blue"
          />
        </div>

        <div>
          <label class="block text-gray-300 text-sm font-medium mb-1">
            Client Secret
          </label>
          <input
            type="password"
            value={{this.malClientSecret}}
            {{on "input" this.updateMalClientSecret}}
            placeholder="Enter your MAL Client Secret"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:border-mal-blue"
          />
        </div>
      </div>

      {{! ids.moe API Key (optional) }}
      <div class="mb-6">
        <div class="flex items-center mb-3">
          <h4 class="text-white font-medium flex-1">ids.moe API Key (Optional)</h4>
          {{#if this.hasIdsMoeKey}}
            <span class="text-green-400 text-sm">Configured</span>
          {{else}}
            <span class="text-gray-400 text-sm">Not configured</span>
          {{/if}}
        </div>
        <p class="text-gray-400 text-sm mb-3">
          Get your API key at
          <a
            href="https://ids.moe/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-400 hover:underline"
          >
            ids.moe
          </a>
          (improves anime ID matching accuracy)
        </p>

        <div>
          <label class="block text-gray-300 text-sm font-medium mb-1">
            API Key
          </label>
          <input
            type="password"
            value={{this.idsMoeApiKey}}
            {{on "input" this.updateIdsMoeApiKey}}
            placeholder="Enter your ids.moe API key (optional)"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {{! Error Message }}
      {{#if (eq this.saveStatus "error")}}
        <div class="mb-4 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
          {{this.errorMessage}}
        </div>
      {{/if}}

      {{! Action Buttons }}
      <div class="flex gap-3">
        <button
          type="button"
          {{on "click" this.saveKeys}}
          disabled={{eq this.saveStatus "saving"}}
          class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          {{#if (eq this.saveStatus "saving")}}
            Saving...
          {{else if (eq this.saveStatus "saved")}}
            Saved!
          {{else}}
            Save API Keys
          {{/if}}
        </button>

        {{#if this.allRequiredKeysConfigured}}
          <button
            type="button"
            {{on "click" this.clearKeys}}
            class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Clear All Keys
          </button>
        {{/if}}
      </div>

    </div>
  </template>
}
