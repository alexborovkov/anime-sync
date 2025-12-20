import { pageTitle } from 'ember-page-title';
import RouteTemplate from 'ember-route-template';
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { LinkTo } from '@ember/routing';
import { eq } from 'ember-truth-helpers';
// eslint-disable-next-line no-unused-vars
import SyncEngineService from 'trakt-mal-sync/services/sync-engine';

class SyncPreviewComponent extends Component {
  /** @type {SyncEngineService} */
  @service syncEngine;
  @service router;

  @tracked direction = null;
    @tracked operations = [];
    @tracked loading = false;
    @tracked error = null;

    @action
    async analyzeSync(direction) {
      this.direction = direction;
      this.loading = true;
      this.error = null;

      try {
        this.operations = await this.syncEngine.analyzeDifferences(direction);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }

    @action
    startSync() {
      this.router.transitionTo('sync.progress', {
        queryParams: {
          direction: this.direction,
          operations: JSON.stringify(this.operations),
        },
      });
    }

    @action
    cancel() {
      this.direction = null;
      this.operations = [];
      this.error = null;
    }

    get hasOperations() {
      return this.operations && this.operations.length > 0;
    }

    get syncableOperations() {
      return this.operations.filter((op) => op.type !== 'unmapped');
    }

    get unmappedCount() {
      return this.operations.filter((op) => op.type === 'unmapped').length;
    }

    get progressPercentage() {
      if (!this.syncEngine.syncTotal) return 0;
      return Math.round((this.syncEngine.syncProgress / this.syncEngine.syncTotal) * 100);
    }

    <template>
      {{pageTitle "Sync Preview"}}

      <div class="min-h-screen bg-gradient-to-br from-trakt-dark via-gray-900 to-mal-blue">
        <div class="container mx-auto px-4 py-8">

          {{! Header }}
          <div class="mb-8">
            <LinkTo @route="dashboard" class="text-gray-400 hover:text-white mb-4 inline-block">
              ← Back to Dashboard
            </LinkTo>
            <h1 class="text-4xl font-bold text-white mb-2">Sync Preview</h1>
            <p class="text-gray-300">Choose sync direction and preview changes</p>
          </div>

          {{! Direction Selection }}
          {{#unless this.direction}}
            <div class="max-w-2xl mx-auto">
              <h2 class="text-2xl font-bold text-white mb-6 text-center">Choose Sync Direction</h2>

              <div class="grid md:grid-cols-2 gap-6">

                <button
                  type="button"
                  {{on "click" (fn this.analyzeSync "trakt-to-mal")}}
                  class="bg-gray-800 hover:bg-gray-750 rounded-lg p-8 border-2 border-transparent hover:border-trakt-red transition-all group"
                >
                  <div class="text-6xl mb-4">→</div>
                  <h3 class="text-xl font-bold text-white mb-2">Trakt → MyAnimeList</h3>
                  <p class="text-gray-400">
                    Sync your watched anime from Trakt to MyAnimeList
                  </p>
                </button>

                <button
                  type="button"
                  {{on "click" (fn this.analyzeSync "mal-to-trakt")}}
                  class="bg-gray-800 hover:bg-gray-750 rounded-lg p-8 border-2 border-transparent hover:border-mal-blue transition-all group"
                >
                  <div class="text-6xl mb-4">←</div>
                  <h3 class="text-xl font-bold text-white mb-2">MyAnimeList → Trakt</h3>
                  <p class="text-gray-400">
                    Sync your anime list from MyAnimeList to Trakt
                  </p>
                </button>

              </div>
            </div>
          {{/unless}}

          {{! Loading State }}
          {{#if this.loading}}
            <div class="max-w-2xl mx-auto bg-gray-800 rounded-lg p-12 text-center">
              <div class="flex justify-center mb-4">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Analyzing your lists...</h3>
              <p class="text-gray-400 mb-4">{{this.syncEngine.currentOperation}}</p>
              {{#if (gt this.syncEngine.syncTotal 0)}}
                <div class="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    class="bg-gradient-to-r from-trakt-red to-mal-lightblue h-2 rounded-full transition-all"
                    style="width: {{this.progressPercentage}}%"
                  ></div>
                </div>
                <p class="text-sm text-gray-400">
                  {{this.syncEngine.syncProgress}} / {{this.syncEngine.syncTotal}} items processed
                </p>
              {{else}}
                <p class="text-gray-400">This may take a few moments</p>
              {{/if}}
            </div>
          {{/if}}

          {{! Error State }}
          {{#if this.error}}
            <div class="max-w-2xl mx-auto bg-red-900/30 border border-red-600 rounded-lg p-6">
              <h3 class="text-red-400 font-bold mb-2 flex items-center gap-2">
                <span>⚠️</span>
                Error
              </h3>
              <p class="text-gray-300 mb-4">{{this.error}}</p>
              <button
                type="button"
                {{on "click" (fn this.analyzeSync this.direction)}}
                class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          {{/if}}

          {{! Operations Preview }}
          {{#if this.hasOperations}}
            <div class="mb-8">

              {{! Summary }}
              <div class="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 class="text-2xl font-bold text-white mb-4">Summary</h2>
                <div class="grid md:grid-cols-3 gap-4">

                  <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-gray-400 text-sm font-medium mb-1">Total Items</h4>
                    <p class="text-2xl font-bold text-white">{{this.operations.length}}</p>
                  </div>

                  <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-gray-400 text-sm font-medium mb-1">Will Sync</h4>
                    <p class="text-2xl font-bold text-green-400">{{this.syncableOperations.length}}</p>
                  </div>

                  <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-gray-400 text-sm font-medium mb-1">No Mapping</h4>
                    <p class="text-2xl font-bold text-yellow-400">{{this.unmappedCount}}</p>
                  </div>

                </div>
              </div>

              {{! Operations List }}
              <div class="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 class="text-xl font-bold text-white mb-4">Changes Preview</h3>
                <div class="space-y-2 max-h-96 overflow-y-auto">

                  {{#each this.syncableOperations as |op|}}
                    <div class="bg-gray-700 rounded p-4 flex items-center justify-between">
                      <div class="flex-1">
                        <h4 class="text-white font-medium">{{op.entry.title}}</h4>
                        <p class="text-sm text-gray-400">
                          {{#if (eq op.type "add")}}
                            <span class="text-green-400">Will be added</span>
                          {{else if (eq op.type "update")}}
                            <span class="text-blue-400">Will be updated</span>
                          {{/if}}
                        </p>
                      </div>
                      <span class="text-2xl">
                        {{#if (eq op.action "add_to_mal")}}→{{/if}}
                        {{#if (eq op.action "update_mal")}}→{{/if}}
                        {{#if (eq op.action "add_to_trakt")}}←{{/if}}
                        {{#if (eq op.action "update_trakt")}}←{{/if}}
                      </span>
                    </div>
                  {{/each}}

                </div>
              </div>

              {{! Unmapped Items }}
              {{#if this.unmappedCount}}
                <div class="bg-yellow-900/30 border border-yellow-600 rounded-lg p-6 mb-6">
                  <h3 class="text-xl font-bold text-yellow-400 mb-2 flex items-center gap-2">
                    <span>⚠️</span>
                    No Mapping Found ({{this.unmappedCount}} items)
                  </h3>
                  <p class="text-gray-300 mb-4 text-sm">
                    These items couldn't be automatically matched. They will be skipped during sync.
                  </p>
                  <details class="cursor-pointer">
                    <summary class="text-yellow-400 hover:text-yellow-300 font-medium mb-2">
                      Show unmapped items
                    </summary>
                    <div class="space-y-2 mt-4 max-h-64 overflow-y-auto">
                      {{#each this.operations as |op|}}
                        {{#if (eq op.type "unmapped")}}
                          <div class="bg-gray-800/50 rounded p-3">
                            <h4 class="text-white font-medium text-sm">{{op.entry.title}}</h4>
                            <p class="text-xs text-gray-400 mt-1">
                              Could not find matching anime on {{#if (eq this.direction "trakt-to-mal")}}MyAnimeList{{else}}Trakt{{/if}}
                            </p>
                          </div>
                        {{/if}}
                      {{/each}}
                    </div>
                  </details>
                </div>
              {{/if}}

              {{! Actions }}
              <div class="flex gap-4 justify-end">
                <button
                  type="button"
                  {{on "click" this.cancel}}
                  class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  {{on "click" this.startSync}}
                  class="bg-gradient-to-r from-trakt-red to-mal-lightblue hover:shadow-lg text-white font-bold py-3 px-6 rounded-lg transition-all"
                >
                  Start Sync ({{this.syncableOperations.length}} items)
                </button>
              </div>

            </div>
          {{/if}}

        </div>
      </div>
    </template>
}

export default RouteTemplate(SyncPreviewComponent);
