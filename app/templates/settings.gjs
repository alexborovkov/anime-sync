import { pageTitle } from 'ember-page-title';
import { on } from '@ember/modifier';
import { LinkTo } from '@ember/routing';
import ConnectionCard from 'trakt-mal-sync/components/connection-card';

<template>
      {{pageTitle "Settings"}}

      <div class="min-h-screen bg-gradient-to-br from-trakt-dark via-gray-900 to-mal-blue">
        <div class="container mx-auto px-4 py-8">

          {{! Header }}
          <div class="mb-8">
            <LinkTo @route="dashboard" class="text-gray-400 hover:text-white mb-4 inline-block">
              ← Back to Dashboard
            </LinkTo>
            <h1 class="text-4xl font-bold text-white mb-2">Settings</h1>
            <p class="text-gray-300">Manage your connections and application settings</p>
          </div>

          {{! Connection Settings }}
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-white mb-4">Account Connections</h2>
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

          {{! Data Management }}
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-white mb-4">Data Management</h2>
            <div class="bg-gray-800 rounded-lg p-6">

              <div class="mb-6">
                <h3 class="text-lg font-bold text-white mb-2">Clear Cache</h3>
                <p class="text-gray-400 mb-4 text-sm">
                  Remove cached API responses and mapping data. Your account connections will remain intact.
                </p>
                <button
                  type="button"
                  {{on "click" this.clearCache}}
                  class="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Clear Cache
                </button>
              </div>

              <div class="border-t border-gray-700 pt-6">
                <h3 class="text-lg font-bold text-white mb-2">Clear All Data</h3>
                <p class="text-gray-400 mb-4 text-sm">
                  Remove all stored data including tokens and cache. You will need to reconnect your accounts.
                </p>
                <button
                  type="button"
                  {{on "click" this.clearAll}}
                  class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Clear All Data
                </button>
              </div>

            </div>
          </div>

          {{! About }}
          <div>
            <h2 class="text-2xl font-bold text-white mb-4">About</h2>
            <div class="bg-gray-800 rounded-lg p-6">
              <p class="text-gray-300 mb-4">
                Trakt ↔ MyAnimeList Sync is a client-side application for synchronizing anime lists between Trakt.tv and MyAnimeList.
              </p>
              <div class="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 class="text-gray-400 font-medium mb-1">Version</h4>
                  <p class="text-white">1.0.0</p>
                </div>
                <div>
                  <h4 class="text-gray-400 font-medium mb-1">Storage</h4>
                  <p class="text-white">localStorage & IndexedDB</p>
                </div>
                <div>
                  <h4 class="text-gray-400 font-medium mb-1">Authentication</h4>
                  <p class="text-white">OAuth 2.0 with PKCE</p>
                </div>
                <div>
                  <h4 class="text-gray-400 font-medium mb-1">Open Source</h4>
                  <p class="text-white">MIT License</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
</template>
