import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import config from 'trakt-mal-sync/config/environment';

/**
 * Component to display and copy redirect URIs for OAuth app configuration
 */
export default class RedirectUriHelper extends Component {
  @tracked traktCopied = false;
  @tracked malCopied = false;

  get traktRedirectUri() {
    return `${config.APP.APP_URL}/auth/trakt-callback`;
  }

  get malRedirectUri() {
    return `${config.APP.APP_URL}/auth/mal-callback`;
  }

  @action
  async copyTraktUri() {
    try {
      await navigator.clipboard.writeText(this.traktRedirectUri);
      this.traktCopied = true;
      setTimeout(() => {
        this.traktCopied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy Trakt redirect URI:', error);
    }
  }

  @action
  async copyMalUri() {
    try {
      await navigator.clipboard.writeText(this.malRedirectUri);
      this.malCopied = true;
      setTimeout(() => {
        this.malCopied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy MAL redirect URI:', error);
    }
  }

  <template>
    <div class="bg-gray-700 rounded-lg p-4 mb-4">
      <h4 class="text-white font-medium mb-3">Redirect URIs for App Registration</h4>
      <p class="text-gray-300 text-sm mb-4">
        Use these redirect URIs when registering your API applications:
      </p>

      {{! Trakt Redirect URI }}
      <div class="mb-3">
        <label class="block text-gray-400 text-sm font-medium mb-1">
          Trakt Redirect URI
        </label>
        <div class="flex gap-2">
          <input
            type="text"
            value={{this.traktRedirectUri}}
            readonly
            class="flex-1 bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            {{on "click" this.copyTraktUri}}
            class="bg-trakt-red hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            {{if this.traktCopied "Copied!" "Copy"}}
          </button>
        </div>
      </div>

      {{! MAL Redirect URI }}
      <div>
        <label class="block text-gray-400 text-sm font-medium mb-1">
          MAL Redirect URI
        </label>
        <div class="flex gap-2">
          <input
            type="text"
            value={{this.malRedirectUri}}
            readonly
            class="flex-1 bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            {{on "click" this.copyMalUri}}
            class="bg-mal-blue hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            {{if this.malCopied "Copied!" "Copy"}}
          </button>
        </div>
      </div>
    </div>
  </template>
}
