var defaults = require('../utilities').defaults;
var provide = require('../provide');


// Detects support for sync, cross-domain XHR.
// We can't fully rely on feature detects because IE9 supports XHR but not with
// CORS. It does support XDomainRequests, but that doesn't have a sync option:
// https://msdn.microsoft.com/en-us/library/cc288116(v=vs.85).aspx
var supportsSyncCorsXhr = window.XMLHttpRequest &&
    !(Function('/*@cc_on return document.documentMode<=9@*/')());


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

  // Use the beacon transport mechanism if available.
  this.tracker.set('transport', 'beacon');

  window.addEventListener('unload', this.handleWindowUnload.bind(this));
}


/**
 * Handles the window unload event.
 */
SessionDurationTracker.prototype.handleWindowUnload = function() {
  var fieldsObj = {};

  // Adds time since navigation start if supported.
  if (window.performance && performance.timing) {
    fieldsObj.eventValue = +new Date - performance.timing.navigationStart;
  }

  // Defaults to sending the hit via sync XHR if beacon isn't available and
  // cross-domain, sync XHR is available.
  if (!navigator.sendBeacon && supportsSyncCorsXhr) {
    fieldsObj.sendHitTask = this.sendSyncHit;
  }

  this.tracker.send('event', 'Window', 'unload', fieldsObj);
};


/**
 * Sends the hit payload data to Google Analytics via sync XHR to ensure
 * the hit gets sent before the page unloads.
 * @param {Object} model Passed internally by analytics.js
 */
SessionDurationTracker.prototype.sendSyncHit = function(model) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://www.google-analytics.com/collect', false);
  xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
  xhr.send(model.get('hitPayload'));
};


provide('sessionDurationTracker', SessionDurationTracker);
