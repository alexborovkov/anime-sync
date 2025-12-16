import { pageTitle } from 'ember-page-title';
import RouteTemplate from 'ember-route-template';
import { LinkTo } from '@ember/routing';

export default RouteTemplate(
  <template>
    {{pageTitle "Sync Results"}}

    <div class="min-h-screen bg-gradient-to-br from-trakt-dark via-gray-900 to-mal-blue">
      <div class="container mx-auto px-4 py-8">

        <div class="max-w-4xl mx-auto">

          {{#if @model.results}}

            {{! Success Header }}
            <div class="text-center mb-8">
              <div class="text-6xl mb-4">
                {{#if @model.results.error}}
                  ❌
                {{else}}
                  ✅
                {{/if}}
              </div>
              <h1 class="text-4xl font-bold text-white mb-2">
                {{#if @model.results.error}}
                  Sync Failed
                {{else}}
                  Sync Complete!
                {{/if}}
              </h1>
              <p class="text-gray-300">
                {{#if @model.results.error}}
                  An error occurred during synchronization
                {{else}}
                  Your anime lists have been synchronized
                {{/if}}
              </p>
            </div>

            {{! Error Message }}
            {{#if @model.results.error}}
              <div class="bg-red-900/30 border border-red-600 rounded-lg p-6 mb-8">
                <h3 class="text-red-400 font-bold mb-2">Error Details</h3>
                <p class="text-gray-300">{{@model.results.error}}</p>
              </div>
            {{else}}

              {{! Summary Stats }}
              <div class="grid md:grid-cols-3 gap-6 mb-8">

                <div class="bg-gray-800 rounded-lg p-6">
                  <h3 class="text-gray-400 text-sm font-medium mb-2">Successful</h3>
                  <p class="text-3xl font-bold text-green-400">
                    {{@model.results.successful}}
                  </p>
                </div>

                <div class="bg-gray-800 rounded-lg p-6">
                  <h3 class="text-gray-400 text-sm font-medium mb-2">Failed</h3>
                  <p class="text-3xl font-bold text-red-400">
                    {{@model.results.failed}}
                  </p>
                </div>

                <div class="bg-gray-800 rounded-lg p-6">
                  <h3 class="text-gray-400 text-sm font-medium mb-2">Skipped</h3>
                  <p class="text-3xl font-bold text-yellow-400">
                    {{@model.results.skipped}}
                  </p>
                </div>

              </div>

              {{! Details List }}
              {{#if @model.results.details}}
                <div class="bg-gray-800 rounded-lg p-6 mb-8">
                  <h2 class="text-2xl font-bold text-white mb-4">Operation Details</h2>
                  <div class="space-y-2 max-h-96 overflow-y-auto">

                    {{#each @model.results.details as |detail|}}
                      <div class="bg-gray-700 rounded p-4 flex items-center justify-between">
                        <div class="flex-1">
                          <h4 class="text-white font-medium">{{detail.entry.title}}</h4>
                          <p class="text-sm text-gray-400">
                            {{detail.action}}
                            {{#if detail.error}}
                              - <span class="text-red-400">{{detail.error}}</span>
                            {{/if}}
                          </p>
                        </div>
                        <span class="text-xl ml-4">
                          {{#if (eq detail.status "success")}}
                            <span class="text-green-400">✓</span>
                          {{else if (eq detail.status "error")}}
                            <span class="text-red-400">✗</span>
                          {{else}}
                            <span class="text-yellow-400">⊘</span>
                          {{/if}}
                        </span>
                      </div>
                    {{/each}}

                  </div>
                </div>
              {{/if}}

            {{/if}}

            {{! Actions }}
            <div class="flex gap-4 justify-center">
              <LinkTo
                @route="dashboard"
                class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Back to Dashboard
              </LinkTo>
              <LinkTo
                @route="sync.preview"
                class="bg-gradient-to-r from-trakt-red to-mal-lightblue hover:shadow-lg text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Sync Again
              </LinkTo>
            </div>

          {{else}}

            {{! No Results }}
            <div class="bg-gray-800 rounded-lg p-12 text-center">
              <div class="text-6xl mb-4">🤷</div>
              <h2 class="text-2xl font-bold text-white mb-4">No Results Available</h2>
              <p class="text-gray-300 mb-6">
                There are no sync results to display. Please start a sync operation first.
              </p>
              <LinkTo
                @route="dashboard"
                class="inline-block bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Go to Dashboard
              </LinkTo>
            </div>

          {{/if}}

        </div>

      </div>
    </div>
  </template>
);
