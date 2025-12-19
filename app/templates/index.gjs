import { pageTitle } from 'ember-page-title';
import { LinkTo } from '@ember/routing';

<template>
  {{pageTitle "Trakt ↔ MyAnimeList Sync"}}

  <div class="min-h-screen bg-gradient-to-br from-trakt-dark via-gray-900 to-mal-blue">
    <div class="container mx-auto px-4 py-16">

      {{! Hero Section }}
      <div class="text-center mb-16">
        <h1 class="text-5xl md:text-6xl font-bold text-white mb-6">
          Trakt ↔ MyAnimeList
          <span class="block text-transparent bg-clip-text bg-gradient-to-r from-trakt-red to-mal-lightblue">
            Sync Made Easy
          </span>
        </h1>
        <p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Seamlessly synchronize your anime lists between Trakt.tv and MyAnimeList.
          Keep your watch history in sync across both platforms.
        </p>
        <LinkTo
          @route="dashboard"
          class="inline-block bg-gradient-to-r from-trakt-red to-mal-lightblue text-white font-bold py-4 px-8 rounded-lg text-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
        >
          Get Started
        </LinkTo>
      </div>

      {{! Features Grid }}
      <div class="grid md:grid-cols-3 gap-8 mb-16">

        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
          <div class="text-4xl mb-4">🔄</div>
          <h3 class="text-xl font-bold text-white mb-2">Bidirectional Sync</h3>
          <p class="text-gray-400">
            Transfer your anime lists in either direction. Trakt to MAL or MAL to Trakt - you choose.
          </p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
          <div class="text-4xl mb-4">🔐</div>
          <h3 class="text-xl font-bold text-white mb-2">Secure Authentication</h3>
          <p class="text-gray-400">
            OAuth 2.0 with PKCE flow. Your credentials stay safe and are never stored on our servers.
          </p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
          <div class="text-4xl mb-4">⚡</div>
          <h3 class="text-xl font-bold text-white mb-2">Smart Mapping</h3>
          <p class="text-gray-400">
            Automatic anime ID matching using anime-offline-database for accurate synchronization.
          </p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
          <div class="text-4xl mb-4">📊</div>
          <h3 class="text-xl font-bold text-white mb-2">Preview Changes</h3>
          <p class="text-gray-400">
            Review all changes before syncing. You're always in control of what gets updated.
          </p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
          <div class="text-4xl mb-4">💾</div>
          <h3 class="text-xl font-bold text-white mb-2">Offline Support</h3>
          <p class="text-gray-400">
            Smart caching with IndexedDB for faster performance and offline capabilities.
          </p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
          <div class="text-4xl mb-4">🎯</div>
          <h3 class="text-xl font-bold text-white mb-2">Rate Limited</h3>
          <p class="text-gray-400">
            Respects API limits automatically. No worries about getting blocked or throttled.
          </p>
        </div>

      </div>

      {{! How It Works }}
      <div class="bg-gray-800 rounded-lg p-8 mb-16">
        <h2 class="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
        <div class="grid md:grid-cols-4 gap-6">

          <div class="text-center">
            <div class="bg-trakt-red text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              1
            </div>
            <h4 class="text-white font-bold mb-2">Connect</h4>
            <p class="text-gray-400 text-sm">Link your Trakt and MyAnimeList accounts</p>
          </div>

          <div class="text-center">
            <div class="bg-mal-blue text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              2
            </div>
            <h4 class="text-white font-bold mb-2">Analyze</h4>
            <p class="text-gray-400 text-sm">We compare your lists and find differences</p>
          </div>

          <div class="text-center">
            <div class="bg-trakt-red text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              3
            </div>
            <h4 class="text-white font-bold mb-2">Preview</h4>
            <p class="text-gray-400 text-sm">Review what will be synced before proceeding</p>
          </div>

          <div class="text-center">
            <div class="bg-mal-blue text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              4
            </div>
            <h4 class="text-white font-bold mb-2">Sync</h4>
            <p class="text-gray-400 text-sm">Sit back while we sync your anime lists</p>
          </div>

        </div>
      </div>

      {{! CTA }}
      <div class="text-center">
        <h2 class="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
        <p class="text-gray-300 mb-6">Connect your accounts and start syncing in minutes.</p>
        <LinkTo
          @route="dashboard"
          class="inline-block bg-white text-gray-900 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Go to Dashboard →
        </LinkTo>
      </div>

    </div>
  </div>
</template>
