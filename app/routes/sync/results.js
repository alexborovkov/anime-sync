import Route from '@ember/routing/route';

export default class SyncResultsRoute extends Route {
  queryParams = {
    results: { refreshModel: false },
  };

  async model(params) {
    let results = null;
    try {
      results = params.results ? JSON.parse(params.results) : null;
    } catch {
      results = null;
    }

    return { results };
  }
}
