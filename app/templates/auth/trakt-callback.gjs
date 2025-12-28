import { pageTitle } from 'ember-page-title';
import RouteTemplate from 'ember-route-template';
import { LinkTo } from '@ember/routing';

export default RouteTemplate(
  <template>
    {{pageTitle "Trakt Authentication"}}

    <div class="min-h-screen bg-gradient-to-br from-trakt-dark via-gray-900 to-mal-blue flex items-center justify-center">
      <div class="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">

        {{#if @model.error}}
          <div class="text-center">
            <div class="text-6xl mb-4">❌</div>
            <h1 class="text-2xl font-bold text-white mb-4">Authentication Failed</h1>
            <p class="text-red-400 mb-6">{{@model.message}}</p>
            <LinkTo
              @route="dashboard"
              class="inline-block bg-trakt-red text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Dashboard
            </LinkTo>
          </div>
        {{else}}
          <div class="text-center">
            <div class="text-6xl mb-4">✅</div>
            <h1 class="text-2xl font-bold text-white mb-4">Successfully Connected!</h1>
            <p class="text-gray-300 mb-6">
              Your Trakt account has been connected. Redirecting to dashboard...
            </p>
            <div class="flex justify-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-trakt-red"></div>
            </div>
          </div>
        {{/if}}

      </div>
    </div>
  </template>
);
