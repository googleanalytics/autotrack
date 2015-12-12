import provide from './provide';


/**
 * Returns the path value of the current URL.
 * @return {string}
 */
function getPath() {
  return location.pathname + location.search
}


class HistoryTracker {

  /**
   * Adds handler for the history API methods
   * @constructor
   * @param {Object} tracker Passed internally by analytics.js
   * @param {Object} opts Passed to the require command.
   */
  constructor(tracker, opts = {}) {

    this.tracker = tracker;
    if (opts.shouldPathUpdate) this.shouldPathUpdate = opts.shouldPathUpdate;

    // Sets the initial page field.
    // Don't set this on the tracker yet so campaign data can be retreived
    // from the location field.
    this.path = getPath();

    // Overrides history.pushState.
    let originalPushState = history.pushState;
    history.pushState = (state, title, url) => {
      originalPushState.call(history, state, title, url);
      this.updateTrackerData();
    };

    // Overrides history.repaceState.
    let originalReplaceState = history.replaceState;
    history.replaceState = (state, title, url) => {
      originalReplaceState.call(history, state, title, url);
      this.updateTrackerData(false);
    };

    // Handles URL changes via user interaction.
    window.addEventListener('popstate', () => {
      this.updateTrackerData(this)
    });
  }


  /**
   * Updates the page and title fields on the tracker if necessary and
   * optionally sends a pageview.
   * @param {boolean} sendPageview Sends a pageview hit if true (default).
   */
  updateTrackerData(sendPageview = true) {
    var oldPath = this.path;
    var newPath = getPath();

    if (oldPath != newPath && this.shouldTrackerUpdate(newPath, oldPath)) {
      this.path = newPath;
      this.tracker.set({
        page: newPath,
        title: document.title
      });
      if (sendPageview) this.tracker.send('pageview');
    }
  }


  /**
   * Determines whether or not the tracker should be updated with the new data.
   * This default implementation can be overrided in the config options.
   * @param {string} newPath
   * @param {string} oldPath
   * @return {boolean}
   */
  shouldTrackerUpdate(newPath, oldPath) {
    return true;
  }
}


provide('historyTracker', HistoryTracker);
