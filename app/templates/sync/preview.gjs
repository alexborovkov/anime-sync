import { pageTitle } from 'ember-page-title';
import RouteTemplate from 'ember-route-template';
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { LinkTo } from '@ember/routing';
import { eq, gt, and, not } from 'ember-truth-helpers';
// eslint-disable-next-line no-unused-vars
import SyncEngineService from 'trakt-mal-sync/services/sync-engine';
// eslint-disable-next-line no-unused-vars
import TraktService from 'trakt-mal-sync/services/trakt';

class SyncPreviewComponent extends Component {
  /** @type {SyncEngineService} */
  @service syncEngine;
  /** @type {TraktService} */
  @service trakt;
  @service router;
  @service cache;

  @tracked direction = null;
  @tracked operations = [];
  @tracked loading = false;
  @tracked error = null;
  @tracked userLists = [];
  @tracked selectedLists = new Set();
  @tracked traktTargetLists = [];
  @tracked selectedTargetList = null;
  @tracked newListName = '';

    @action
    async selectDirection(direction) {
      this.direction = direction;

      // For Trakt → MAL, fetch user's custom lists
      if (direction === 'trakt-to-mal') {
        this.loading = true;
        try {
          const lists = await this.trakt.getUserLists();

          // Fetch actual item counts and sync status for each list
          const listsWithCounts = await Promise.all(
            lists.map(async (list) => {
              const items = await this.trakt.getListItems('me', list.ids.slug);
              const synced = await this.syncEngine.isListSynced(list.ids.slug);
              return {
                ...list,
                actual_item_count: items.length,
                synced,
              };
            })
          );

          this.userLists = listsWithCounts;
          this.selectedLists = new Set();
        } catch (err) {
          this.error = `Failed to fetch lists: ${err.message}`;
        } finally {
          this.loading = false;
        }
      }
      // For MAL → Trakt, fetch target lists
      else if (direction === 'mal-to-trakt') {
        this.loading = true;
        try {
          const lists = await this.trakt.getUserLists();
          this.traktTargetLists = lists;
          this.selectedTargetList = null;
          this.newListName = '';
        } catch (err) {
          this.error = `Failed to fetch Trakt lists: ${err.message}`;
        } finally {
          this.loading = false;
        }
      }
    }

    @action
    toggleList(listId) {
      if (this.selectedLists.has(listId)) {
        this.selectedLists.delete(listId);
      } else {
        this.selectedLists.add(listId);
      }
      // Trigger reactivity
      this.selectedLists = new Set(this.selectedLists);
    }

    @action
    async createNewList() {
      if (!this.newListName.trim()) {
        this.error = 'Please enter a list name';
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const newList = await this.trakt.createList(
          this.newListName.trim(),
          'Synced from MyAnimeList'
        );

        // Add the new list to the existing lists array
        this.traktTargetLists = [...this.traktTargetLists, newList];

        // Select the newly created list
        this.selectedTargetList = newList.ids.slug;
        this.newListName = '';

        // Clear cache so next time we fetch fresh data
        const cacheKey = 'me-lists';
        await this.cache.remove('traktCache', cacheKey);
      } catch (err) {
        this.error = `Failed to create list: ${err.message}`;
      } finally {
        this.loading = false;
      }
    }

    @action
    async analyzeSync() {
      this.loading = true;
      this.error = null;

      if (this.direction === 'trakt-to-mal') {
        if (this.selectedLists.size === 0) {
          this.error = 'Please select at least one list to sync';
          this.loading = false;
          return;
        }

        try {
          // Convert Set to Array of list IDs
          const listIds = Array.from(this.selectedLists);
          this.operations = await this.syncEngine.analyzeDifferences(this.direction, listIds);
        } catch (err) {
          this.error = err.message;
        } finally {
          this.loading = false;
        }
      } else {
        // MAL → Trakt
        if (!this.selectedTargetList) {
          this.error = 'Please select a target list or create a new one';
          this.loading = false;
          return;
        }

        try {
          this.operations = await this.syncEngine.analyzeDifferences(this.direction, ['watched']);
        } catch (err) {
          this.error = err.message;
        } finally {
          this.loading = false;
        }
      }
    }

    @action
    startSync() {
      // Store operations in service instead of passing via URL
      this.syncEngine.pendingOperations = this.operations;
      this.syncEngine.syncDirection = this.direction;
      this.syncEngine.syncedListIds = Array.from(this.selectedLists);

      // Store target list for MAL → Trakt
      if (this.direction === 'mal-to-trakt') {
        this.syncEngine.targetTraktListId = this.selectedTargetList;
      } else {
        this.syncEngine.targetTraktListId = null;
      }

      this.router.transitionTo('sync.progress');
    }

    @action
    cancel() {
      this.direction = null;
      this.operations = [];
      this.error = null;
      this.selectedLists = new Set();
      this.selectedTargetList = null;
      this.newListName = '';
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

    @action
    isListSelected(listSlug) {
      return this.selectedLists.has(listSlug);
    }

    @action
    updateNewListName(event) {
      this.newListName = event.target.value;
    }

    @action
    updateSelectedTargetList(event) {
      this.selectedTargetList = event.target.value;
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
                  {{on "click" (fn this.selectDirection "trakt-to-mal")}}
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
                  {{on "click" (fn this.selectDirection "mal-to-trakt")}}
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

          {{! List Selection (only for Trakt → MAL) }}
          {{#if (and this.direction (eq this.direction "trakt-to-mal") (not this.hasOperations))}}
            <div class="max-w-2xl mx-auto mt-8">
              <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-2xl font-bold text-white mb-4">Select Trakt Lists to Sync</h2>
                <p class="text-gray-300 mb-6 text-sm">
                  Choose which Trakt lists you want to sync to MyAnimeList
                </p>

                {{#if this.userLists.length}}
                  <div class="space-y-3 mb-6 max-h-96 overflow-y-auto">
                    {{#each this.userLists as |list|}}
                      <label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-700/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={{this.isListSelected list.ids.slug}}
                          {{on "change" (fn this.toggleList list.ids.slug)}}
                          class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-trakt-red focus:ring-trakt-red flex-shrink-0"
                        />
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <div class="text-white font-medium truncate">{{list.name}}</div>
                            {{#if list.synced}}
                              <span class="text-green-400 text-sm flex-shrink-0" title="Already synced">✓</span>
                            {{/if}}
                          </div>
                          <div class="text-gray-400 text-sm">
                            {{list.actual_item_count}} items
                            {{#if list.description}}
                              • {{list.description}}
                            {{/if}}
                          </div>
                        </div>
                      </label>
                    {{/each}}
                  </div>
                {{else}}
                  <div class="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-6">
                    <p class="text-yellow-400 text-sm">
                      No custom lists found. You can create lists on Trakt.tv and they will appear here.
                    </p>
                  </div>
                {{/if}}

                <div class="flex gap-4">
                  <button
                    type="button"
                    {{on "click" this.cancel}}
                    class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    {{on "click" this.analyzeSync}}
                    disabled={{eq this.selectedLists.size 0}}
                    class="flex-1 bg-gradient-to-r from-trakt-red to-mal-lightblue hover:shadow-lg text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Analyze ({{this.selectedLists.size}} selected)
                  </button>
                </div>
              </div>
            </div>
          {{/if}}

          {{! Target List Selection (only for MAL → Trakt) }}
          {{#if (and this.direction (eq this.direction "mal-to-trakt") (not this.hasOperations))}}
            <div class="max-w-2xl mx-auto mt-8">
              <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-2xl font-bold text-white mb-4">Select Target Trakt List</h2>
                <p class="text-gray-300 mb-6 text-sm">
                  Choose where to add your MAL anime in Trakt
                </p>

                {{! Existing Lists }}
                {{#if this.traktTargetLists.length}}
                  <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-400 mb-2">Select Existing List</label>
                    <select
                      class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-mal-blue focus:border-transparent"
                      {{on "change" this.updateSelectedTargetList}}
                    >
                      <option value="">-- Select a list --</option>
                      {{#each this.traktTargetLists as |list|}}
                        <option value={{list.ids.slug}} selected={{eq this.selectedTargetList list.ids.slug}}>
                          {{list.name}} ({{list.item_count}} items)
                        </option>
                      {{/each}}
                    </select>
                  </div>
                {{/if}}

                {{! Create New List }}
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-400 mb-2">Or Create New List</label>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter new list name..."
                      value={{this.newListName}}
                      {{on "input" this.updateNewListName}}
                      class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-mal-blue focus:border-transparent"
                    />
                    <button
                      type="button"
                      {{on "click" this.createNewList}}
                      disabled={{not this.newListName}}
                      class="bg-mal-blue hover:bg-mal-lightblue text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                  </div>
                </div>

                <div class="flex gap-4">
                  <button
                    type="button"
                    {{on "click" this.cancel}}
                    class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    {{on "click" this.analyzeSync}}
                    disabled={{not this.selectedTargetList}}
                    class="flex-1 bg-gradient-to-r from-mal-blue to-trakt-red hover:shadow-lg text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Analyze
                  </button>
                </div>
              </div>
            </div>
          {{/if}}

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
