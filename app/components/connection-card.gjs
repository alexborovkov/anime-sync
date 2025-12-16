import Component from '@glimmer/component';
import { action } from '@ember/object';
import { on } from '@ember/modifier';

export default class ConnectionCardComponent extends Component {
  get statusClass() {
    return this.args.isConnected
      ? 'bg-green-500/20 border-green-500'
      : 'bg-gray-700/50 border-gray-600';
  }

  get statusText() {
    return this.args.isConnected ? 'Connected' : 'Not Connected';
  }

  get statusIcon() {
    return this.args.isConnected ? '✓' : '○';
  }

  @action
  handleConnect() {
    if (this.args.onConnect) {
      this.args.onConnect();
    }
  }

  @action
  handleDisconnect() {
    if (this.args.onDisconnect) {
      this.args.onDisconnect();
    }
  }

  <template>
    <div
      class="bg-gray-800 rounded-lg p-6 border-2 {{this.statusClass}} transition-all"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-white">{{@service}}</h3>
        <div
          class="px-3 py-1 rounded-full text-sm font-medium {{if
            @isConnected
            'bg-green-500 text-white'
            'bg-gray-600 text-gray-300'
          }}"
        >
          <span class="mr-1">{{this.statusIcon}}</span>
          {{this.statusText}}
        </div>
      </div>

      <p class="text-gray-400 mb-6">{{@description}}</p>

      <div class="flex gap-3">
        {{#if @isConnected}}
          <button
            type="button"
            {{on "click" this.handleDisconnect}}
            class="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        {{else}}
          <button
            type="button"
            {{on "click" this.handleConnect}}
            class="flex-1 {{@buttonClass}} text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Connect {{@service}}
          </button>
        {{/if}}
      </div>
    </div>
  </template>
}
