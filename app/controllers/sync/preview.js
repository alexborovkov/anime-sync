import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SyncPreviewController extends Controller {
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
}
