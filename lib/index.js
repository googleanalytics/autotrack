// Imports sub-plugins.
require('./custom-media');
require('./events');
require('./form');
require('./history');
require('./links');
require('./session-duration');
require('./social');


// Imports dependencies.
var provide = require('./provide');


/**
 *
 * Requires all sub-plugins via a single plugin.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function Autotrack(tracker, opts) {
  var name = tracker.get('name');
  ga(name + '.require', 'customMediaTracker', opts);
  ga(name + '.require', 'eventTracker', opts);
  ga(name + '.require', 'historyTracker', opts);
  ga(name + '.require', 'outboundFormTracker', opts);
  ga(name + '.require', 'outboundLinkTracker', opts);
  ga(name + '.require', 'sessionDurationTracker', opts);
  ga(name + '.require', 'socialTracker', opts);
}


provide('autotrack', Autotrack);
