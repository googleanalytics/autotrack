var defaults = require('../utilities').defaults;
var provide = require('../provide');


/**
 * Registers outbound link tracking on tracker object.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function SessionDurationTracker(tracker, opts) {

  // Registers the plugin on the global gaplugins object.
  window.gaplugins = window.gaplugins || {};
  gaplugins.SessionDurationTracker = SessionDurationTracker;

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.addEventListener) return;

  this.opts = defaults(opts);
  this.tracker = tracker;

  window.addEventListener('unload', this.handleWindowUnload.bind(this));
}


/**
 * Handles the window unload event.
 */
SessionDurationTracker.prototype.handleWindowUnload = function() {
  var fieldsObj = {
    nonInteraction: true,
    transport: 'beacon'
  };

  // Adds time since navigation start if supported.
  if (window.performance && performance.timing) {
    fieldsObj.eventValue = +new Date - performance.timing.navigationStart;
  }

  // Note: This will fail in many cases when Beacon isn't supported,
  // but at least it's better than nothing.
  this.tracker.send('event', 'Window', 'unload', fieldsObj);
};


provide('sessionDurationTracker', SessionDurationTracker);
