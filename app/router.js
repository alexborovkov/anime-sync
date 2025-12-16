import EmberRouter from '@embroider/router';
import config from 'trakt-mal-sync/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('dashboard');
  this.route('settings');

  this.route('auth', function() {
    this.route('trakt-callback');
    this.route('mal-callback');
  });

  this.route('sync', function() {
    this.route('preview');
    this.route('progress');
    this.route('results');
  });
});
