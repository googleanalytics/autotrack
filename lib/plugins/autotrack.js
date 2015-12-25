// Imports sub-plugins.
require('./event-tracker');
require('./media-query-tracker');
require('./outbound-form-tracker');
require('./outbound-link-tracker');
require('./session-duration-tracker');
require('./social-tracker');
require('./url-change-tracker');


// Imports dependencies.
var provide = require('../provide');


/**
 *
 * Requires all sub-plugins via a single plugin.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function Autotrack(tracker, opts) {
  var ga = window[window.GoogleAnalyticsObject || 'ga'];
  var name = tracker.get('name');

  // Registers the plugin on the global gaplugins object.
  window.gaplugins = window.gaplugins || {};
  gaplugins.Autotrack = Autotrack;

  ga(name + '.require', 'eventTracker', opts);
  ga(name + '.require', 'mediaQueryTracker', opts);
  ga(name + '.require', 'outboundFormTracker', opts);
  ga(name + '.require', 'outboundLinkTracker', opts);
  ga(name + '.require', 'sessionDurationTracker', opts);
  ga(name + '.require', 'socialTracker', opts);
  ga(name + '.require', 'urlChangeTracker', opts);
}


provide('autotrack', Autotrack);
