/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import getHistoryWatcher from '../history-watcher';
import provide from '../provide';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj} from '../utilities';


/**
 * Class for the `urlChangeTracker` analytics.js plugin.
 * @implements {UrlChangeTrackerPublicInterface}
 */
class UrlChangeTracker {
  /**
   * Adds handler for the history API methods
   * @param {!Tracker} tracker Passed internally by analytics.js
   * @param {?Object} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.URL_CHANGE_TRACKER);

    // Feature detects to prevent errors in unsupporting browsers.
    if (!history.pushState || !window.addEventListener) return;

    /** @type {UrlChangeTrackerOpts} */
    const defaultOpts = {
      shouldTrackUrlChange: this.shouldTrackUrlChange,
      trackReplaceState: false,
      fieldsObj: {},
      hitFilter: null,
    };

    this.opts = /** @type {UrlChangeTrackerOpts} */ (assign(defaultOpts, opts));

    this.tracker = tracker;

    // Sets the initial page field.
    // Don't set this on the tracker yet so campaign data can be retreived
    // from the location field.
    this.path = getPath();

    this.historyWatcher = getHistoryWatcher();
    this.historyWatcher.on('pushstate', () => this.handleUrlChange(true));
    this.historyWatcher.on('replacestate', () => this.handleUrlChange(false));
    this.historyWatcher.on('popstate', () => this.handleUrlChange(true));
  }

  /**
   * Updates the page and title fields on the tracker and sends a pageview
   * if a new history entry was created.
   * @param {boolean} historyDidUpdate True if the history was changed via
   *     `pushState()` or the `popstate` event. False if the history was just
   *     modified via `replaceState()`.
   */
  handleUrlChange(historyDidUpdate) {
    // Calls the update logic asychronously to help ensure that app logic
    // responding to the URL change happens prior to this.
    setTimeout(() => {
      const oldPath = this.path;
      const newPath = getPath();

      if (oldPath != newPath &&
          this.opts.shouldTrackUrlChange.call(this, newPath, oldPath)) {
        this.path = newPath;
        this.tracker.set({page: newPath});

        if (historyDidUpdate || this.opts.trackReplaceState) {
          /** @type {FieldsObj} */
          const defaultFields = {transport: 'beacon'};
          this.tracker.send('pageview', createFieldsObj(defaultFields,
              this.opts.fieldsObj, this.tracker, this.opts.hitFilter));
        }
      }
    }, 0);
  }

  /**
   * Determines whether or not the tracker should send a hit with the new page
   * data. This default implementation can be overrided in the config options.
   * @param {string} newPath The path after the URL change.
   * @param {string} oldPath The path prior to the URL change.
   * @return {boolean} Whether or not the URL change should be tracked.
   */
  shouldTrackUrlChange(newPath, oldPath) {
    return !!(newPath && oldPath);
  }

  /**
   * Removes all event listeners and instance properties.
   */
  remove() {
    this.historyWatcher.destroy();
  }
}


provide('urlChangeTracker', UrlChangeTracker);


/**
 * @return {string} The path value of the current URL.
 */
function getPath() {
  return location.pathname + location.search;
}
