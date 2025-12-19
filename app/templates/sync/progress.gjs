import { pageTitle } from 'ember-page-title';
import RouteTemplate from 'ember-route-template';
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { gt } from 'ember-truth-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';

class SyncProgressComponent extends Component {
  @service syncEngine;
  @service router;

  @tracked results = null;
  @tracked syncing = false;
  @tracked hasStarted = false;

  @action
  async startSync(model) {
      if (this.syncing || this.hasStarted) return;
      if (!model?.operations || model.operations.length === 0) return;

      this.hasStarted = true;
      this.syncing = true;

      try {
        this.results = await this.syncEngine.executeSyncOperations(
          model.operations,
          () => {
            // Progress callback - updates are handled by service's tracked properties
          },
        );
      } catch (err) {
        this.results = {
          error: err.message,
        };
      } finally {
        this.syncing = false;
        // Redirect to results page after 1 second
        setTimeout(() => {
          this.router.transitionTo('sync.results', {
            queryParams: {
              results: JSON.stringify(this.results),
            },
          });
        }, 1000);
      }
    }

    get shouldAutoStart() {
      return !this.syncing && !this.hasStarted;
    }

    get progressPercent() {
      if (!this.syncEngine.syncTotal) return 0;
      return Math.round(
        (this.syncEngine.syncProgress / this.syncEngine.syncTotal) * 100,
      );
    }

    <template>
      {{pageTitle "Syncing..."}}

      {{! Auto-start sync when model is available }}
      {{#if this.shouldAutoStart}}
        {{this.startSync @model}}
      {{/if}}

      <div class="min-h-screen bg-gradient-to-br from-trakt-dark via-gray-900 to-mal-blue flex items-center justify-center">
        <div class="max-w-2xl w-full mx-4">

          <div class="bg-gray-800 rounded-lg p-8">

            {{! Progress Header }}
            <div class="text-center mb-8">
              <div class="text-6xl mb-4">🔄</div>
              <h1 class="text-3xl font-bold text-white mb-2">Syncing Your Lists</h1>
              <p class="text-gray-300">
                Please wait while we sync your anime lists...
              </p>
            </div>

            {{! Progress Bar }}
            <div class="mb-6">
              <div class="flex justify-between text-sm text-gray-400 mb-2">
                <span>Progress</span>
                <span>{{this.syncEngine.syncProgress}} / {{this.syncEngine.syncTotal}}</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  class="bg-gradient-to-r from-trakt-red to-mal-lightblue h-full transition-all duration-300 flex items-center justify-center text-xs text-white font-bold"
                  style="width: {{this.progressPercent}}%"
                >
                  {{#if (gt this.progressPercent 10)}}
                    {{this.progressPercent}}%
                  {{/if}}
                </div>
              </div>
            </div>

            {{! Current Operation }}
            {{#if this.syncEngine.currentOperation}}
              <div class="bg-gray-700 rounded-lg p-4 mb-6">
                <h3 class="text-sm font-medium text-gray-400 mb-1">Currently Processing</h3>
                <p class="text-white font-medium">
                  {{this.syncEngine.currentOperation.entry.title}}
                </p>
                <p class="text-sm text-gray-400">
                  {{this.syncEngine.currentOperation.action}}
                </p>
              </div>
            {{/if}}

            {{! Status Messages }}
            <div class="text-center text-gray-400 text-sm">
              <p>Do not close this window or navigate away</p>
              <p class="mt-1">This may take a few minutes depending on your list size</p>
            </div>

            {{! Completion Message }}
            {{#unless this.syncing}}
              <div class="mt-6 p-4 bg-green-900/30 border border-green-600 rounded-lg text-center">
                <p class="text-green-400 font-medium">✓ Sync Complete!</p>
                <p class="text-gray-300 text-sm mt-1">Redirecting to results...</p>
              </div>
            {{/unless}}

          </div>

        </div>
      </div>
    </template>
}

export default RouteTemplate(SyncProgressComponent);
