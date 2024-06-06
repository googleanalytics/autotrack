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


import MethodChain from '../method-chain';
import provide from '../provide';
import TrackerQueue from '../tracker-queue';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj, now} from '../utilities';


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

    this.queue = TrackerQueue.getOrCreate(tracker.get('trackingId'));

    // Binds methods.
    this.pushStateOverride = this.pushStateOverride.bind(this);
    this.replaceStateOverride = this.replaceStateOverride.bind(this);
    this.handlePopState = this.handlePopState.bind(this);

    // Watches for history changes.
    MethodChain.add(history, 'pushState', this.pushStateOverride);
    MethodChain.add(history, 'replaceState', this.replaceStateOverride);
    window.addEventListener('popstate', this.handlePopState);
  }

  /**
   * Handles invocations of the native `history.pushState` and calls
   * `handleUrlChange()` indicating that the history updated.
   * @param {!Function} originalMethod A reference to the overridden method.
   * @return {!Function}
   */
  pushStateOverride(originalMethod) {
    return (...args) => {
      originalMethod(...args);
      this.handleUrlChange(true);
    };
  }

  /**
   * Handles invocations of the native `history.replaceState` and calls
   * `handleUrlChange()` indicating that history was replaced.
   * @param {!Function} originalMethod A reference to the overridden method.
   * @return {!Function}
   */
  replaceStateOverride(originalMethod) {
    return (...args) => {
      originalMethod(...args);
      this.handleUrlChange(false);
    };
  }

  /**
   * Handles responding to the popstate event and calls
   * `handleUrlChange()` indicating that history was updated.
   */
  handlePopState() {
    this.handleUrlChange(true);
  }

  /**
   * Updates the page field on the tracker and sends a pageview if a new
   * history entry was created.
   * Note: we don't update the title because analytics.js automatically uses
   * the value of `document.title`, so we rely on the SPA code to do that.
   * @param {boolean} historyDidUpdate True if the history was changed via
   *     `pushState()` or the `popstate` event. False if the history was just
   *     modified via `replaceState()`.
   */
  handleUrlChange(historyDidUpdate) {
    // Call the update logic asychronously to help ensure that app logic
    // responding to the URL change happens prior to this.
    setTimeout(() => {
      const oldPath = this.path;
      const newPath = getPath();

      if (oldPath != newPath &&
          this.opts.shouldTrackUrlChange.call(this, newPath, oldPath)) {
        this.path = newPath;

      /** @type {FieldsObj} */
        const newFields = {page: newPath};

        this.tracker.set(newFields);

        if (historyDidUpdate || this.opts.trackReplaceState) {
          // Pass the new fields here in addition to setting them above
          // on the off-chance that another URL change happens before this
          // one gets sent.
          this.sendPageview(newFields);
        }
      }
    }, 0);
  }

  /**
   * Sends a pageview hit when idle.
   * @param {!FieldsObj} fieldsObj
   */
  sendPageview(fieldsObj) {
    this.queue.pushTask(({time}) => {
      /** @type {FieldsObj} */
      const defaultFields = {
        transport: 'beacon',
        page: fieldsObj.page,
        queueTime: now() - time,
      };

      this.tracker.send('pageview', createFieldsObj(defaultFields,
          this.opts.fieldsObj, this.tracker, this.opts.hitFilter));
    });
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
   * Removes all event listeners and restores overridden methods.
   */
  remove() {
    this.queue.destroy();
    MethodChain.remove(history, 'pushState', this.pushStateOverride);
    MethodChain.remove(history, 'replaceState', this.replaceStateOverride);
    window.removeEventListener('popstate', this.handlePopState);
  }
}


provide('urlChangeTracker', UrlChangeTracker);


/**
 * @return {string} The path value of the current URL.
 */
function getPath() {
  return location.pathname + location.search;
}
