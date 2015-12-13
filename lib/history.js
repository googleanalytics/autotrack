var defaults = require('./utilities').defaults;
var provide = require('./provide');


/**
 * Adds handler for the history API methods
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function HistoryTracker(tracker, opts) {

  this.opts = defaults(opts, {
    shouldPathUpdate: this.shouldPathUpdate
  });

  this.tracker = tracker;

  // Sets the initial page field.
  // Don't set this on the tracker yet so campaign data can be retreived
  // from the location field.
  this.path = getPath();

  // Overrides history.pushState.
  var originalPushState = history.pushState;
  history.pushState = function(state, title, url) {
    originalPushState.call(history, state, title, url);
    this.updateTrackerData();
  }.bind(this);

  // Overrides history.repaceState.
  var originalReplaceState = history.replaceState;
  history.replaceState = function(state, title, url) {
    originalReplaceState.call(history, state, title, url);
    this.updateTrackerData(false);
  }.bind(this);

  // Handles URL changes via user interaction.
  window.addEventListener('popstate', this.updateTrackerData.bind(this));
}


/**
 * Updates the page and title fields on the tracker if necessary and
 * optionally sends a pageview.
 * @param {boolean} sendPageview Sends a pageview hit if true (default).
 */
HistoryTracker.prototype.updateTrackerData = function(sendPageview) {

  // Sets defaults.
  if (sendPageview !== false) sendPageview = true;

  var oldPath = this.path;
  var newPath = getPath();

  if (oldPath != newPath &&
      this.opts.shouldTrackerUpdate.call(this, newPath, oldPath)) {

    this.path = newPath;
    this.tracker.set({
      page: newPath,
      title: document.title
    });
    if (sendPageview) this.tracker.send('pageview');
  }
};


/**
 * Determines whether or not the tracker should be updated with the new data.
 * This default implementation can be overrided in the config options.
 * @param {string} newPath
 * @param {string} oldPath
 * @return {boolean}
 */
HistoryTracker.prototype.shouldTrackerUpdate = function(newPath, oldPath) {
  return true;
};


/**
 * Returns the path value of the current URL.
 * @return {string}
 */
function getPath() {
  return location.pathname + location.search;
}


if (history.pushState) {
  provide('historyTracker', HistoryTracker);
}
