import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SyncProgressController extends Controller {
  @service syncEngine;
  @service router;

  queryParams = ['direction', 'operations'];

  @tracked results = null;
  @tracked syncing = false;
  @tracked hasStarted = false;

  @action
  async startSync() {
    if (this.syncing || this.hasStarted) return;
    if (!this.model?.operations || this.model.operations.length === 0) return;

    this.hasStarted = true;
    this.syncing = true;

    try {
      this.results = await this.syncEngine.executeSyncOperations(
        this.model.operations,
        (progress, total) => {
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
}
