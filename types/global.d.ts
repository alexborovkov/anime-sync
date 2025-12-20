import '@glint/environment-ember-loose';
import '@glint/environment-ember-template-imports';

import type OAuthService from 'trakt-mal-sync/services/oauth';
import type StorageService from 'trakt-mal-sync/services/storage';
import type SyncEngineService from 'trakt-mal-sync/services/sync-engine';
import type TraktService from 'trakt-mal-sync/services/trakt';
import type MalService from 'trakt-mal-sync/services/mal';
import type MappingService from 'trakt-mal-sync/services/mapping';
import type CacheService from 'trakt-mal-sync/services/cache';
import type RouterService from '@ember/routing/router-service';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    // Services
    oauth: OAuthService;
    storage: StorageService;
    'sync-engine': SyncEngineService;
    syncEngine: SyncEngineService;
    trakt: TraktService;
    mal: MalService;
    mapping: MappingService;
    cache: CacheService;
    router: RouterService;
  }
}
