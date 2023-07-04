/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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


import {parseUrl} from 'dom-utils';
import MethodChain from '../method-chain';
import provide from '../provide';
import Session from '../session';
import Store from '../store';
import TrackerQueue from '../tracker-queue';
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj, debounce, isObject, now} from '../utilities';


/**
 * Class for the `maxScrollQueryTracker` analytics.js plugin.
 * @implements {MaxScrollTrackerPublicInterface}
 */
class MaxScrollTracker {
  /**
   * Registers outbound link tracking on tracker object.
   * @param {!Tracker} tracker Passed internally by analytics.js
   * @param {?Object} opts Passed by the require command.
   */
  constructor(tracker, opts) {
    trackUsage(tracker, plugins.MAX_SCROLL_TRACKER);

    /** @type {MaxScrollTrackerOpts} */
    const defaultOpts = {
      increaseThreshold: 20,
      sessionTimeout: Session.DEFAULT_TIMEOUT,
      // timeZone: undefined,
      // maxScrollMetricIndex: undefined,
      fieldsObj: {},
      // hitFilter: undefined
    };

    this.opts = /** @type {MaxScrollTrackerOpts} */ (assign(defaultOpts, opts));
    this.tracker = tracker;

    // Binds methods to `this`.
    this.handleScroll = debounce(this.handleScroll.bind(this), 500);
    this.trackerSetOverride = this.trackerSetOverride.bind(this);

    // Override the built-in tracker.set method to watch for changes.
    MethodChain.add(tracker, 'set', this.trackerSetOverride);

    this.pagePath = this.getPagePath();

    const trackingId = tracker.get('trackingId');

    this.store = Store.getOrCreate(
        trackingId, 'plugins/max-scroll-tracker');

    this.session = Session.getOrCreate(
        tracker, this.opts.sessionTimeout, this.opts.timeZone);

    // Queue the rest of the initialization of the plugin idly.
    this.queue = TrackerQueue.getOrCreate(trackingId);

    this.listenForMaxScrollChanges();
  }

  /**
   * Adds a scroll event listener if the max scroll percentage for the
   * current page isn't already at 100%.
   */
  listenForMaxScrollChanges() {
    const maxScrollPercentage = this.getMaxScrollPercentageForCurrentPage();
    if (maxScrollPercentage < 100) {
      addEventListener('scroll', this.handleScroll);
    }
  }


  /**
   * Removes an added scroll listener.
   */
  stopListeningForMaxScrollChanges() {
    removeEventListener('scroll', this.handleScroll);
  }


  /**
   * Handles the scroll event. If the current scroll percentage is greater
   * than the stored scroll event by at least the specified increase threshold,
   * send an event with the increase amount.
   */
  handleScroll() {
    const pageHeight = getPageHeight();
    const scrollPos = window.pageYOffset; // scrollY isn't supported in IE.
    const windowHeight = window.innerHeight;

    this.queue.pushTask(({time}) => {
      // Ensure scrollPercentage is an integer between 0 and 100.
      const scrollPercentage = Math.min(100, Math.max(0,
          Math.round(100 * (scrollPos / (pageHeight - windowHeight)))));

      // If the max scroll data gets out of the sync with the session data
      // (for whatever reason), clear it.
      const sessionId = this.session.id;
      if (sessionId != this.store.data.sessionId) {
        this.store.clear();
        this.store.update({sessionId});
      }

      // If the session has expired, clear the stored data and don't send any
      // events (since they'd start a new session). Note: this check is needed,
      // in addition to the above check, to handle cases where the session IDs
      // got out of sync, but the session didn't expire.
      if (this.session.isExpired(this.store.data.sessionId)) {
        this.store.clear();
      } else {
        const maxScrollPercentage = this.getMaxScrollPercentageForCurrentPage();

        if (scrollPercentage > maxScrollPercentage) {
          if (scrollPercentage == 100 || maxScrollPercentage == 100) {
            this.stopListeningForMaxScrollChanges();
          }
          const increaseAmount = scrollPercentage - maxScrollPercentage;
          if (scrollPercentage == 100 ||
              increaseAmount >= this.opts.increaseThreshold) {
            this.setMaxScrollPercentageForCurrentPage(scrollPercentage);
            this.sendMaxScrollEvent(increaseAmount, scrollPercentage, time);
          }
        }
      }
    });
  }

  /**
   * Detects changes to the tracker object and triggers an update if the page
   * field has changed.
   * @param {function((Object|string), (string|undefined))} originalMethod
   *     A reference to the overridden method.
   * @return {function((Object|string), (string|undefined))}
   */
  trackerSetOverride(originalMethod) {
    return (field, value) => {
      originalMethod(field, value);

      /** @type {!FieldsObj} */
      const fields = isObject(field) ? field : {[field]: value};
      if (fields.page) {
        const lastPagePath = this.pagePath;
        this.pagePath = this.getPagePath();

        if (this.pagePath != lastPagePath) {
          // Since event listeners for the same function are never added twice,
          // we don't need to worry about whether we're already listening. We
          // can just add the event listener again.
          this.listenForMaxScrollChanges();
        }
      }
    };
  }

  /**
   * Sends an event for the increased max scroll percentage amount.
   * @param {number} increaseAmount
   * @param {number} scrollPercentage
   * @param {number} scrollTimestamp
   */
  sendMaxScrollEvent(increaseAmount, scrollPercentage, scrollTimestamp) {
    this.queue.pushTask(() => {
      /** @type {FieldsObj} */
      const defaultFields = {
        transport: 'beacon',
        eventCategory: 'Max Scroll',
        eventAction: 'increase',
        eventValue: increaseAmount,
        eventLabel: String(scrollPercentage),
        nonInteraction: true,
        queueTime: now() - scrollTimestamp,
      };

      // If a custom metric was specified, set it equal to the event value.
      if (this.opts.maxScrollMetricIndex) {
        defaultFields['metric' + this.opts.maxScrollMetricIndex] =
            increaseAmount;
      }

      this.tracker.send('event',
          createFieldsObj(defaultFields, this.opts.fieldsObj,
              this.tracker, this.opts.hitFilter));
    });
  }

  /**
   * Stores the current max scroll percentage for the current page.
   * @param {number} maxScrollPercentage
   */
  setMaxScrollPercentageForCurrentPage(maxScrollPercentage) {
    this.store.update({
      [this.pagePath]: maxScrollPercentage,
      sessionId: this.session.id,
    });
  }

  /**
   * Gets the stored max scroll percentage for the current page.
   * @return {number}
   */
  getMaxScrollPercentageForCurrentPage() {
    return this.store.data[this.pagePath] || 0;
  }

  /**
   * Gets the page path from the tracker object.
   * @return {string}
   */
  getPagePath() {
    const url = parseUrl(
        this.tracker.get('page') || this.tracker.get('location'));
    return url.pathname + url.search;
  }

  /**
   * Removes all event listeners and restores overridden methods.
   */
  remove() {
    this.queue.destroy();
    this.store.destroy();
    this.session.destroy();

    this.stopListeningForMaxScrollChanges();
    MethodChain.remove(this.tracker, 'set', this.trackerSetOverride);
  }
}


provide('maxScrollTracker', MaxScrollTracker);


/**
 * Gets the maximum height of the page including scrollable area.
 * @return {number}
 */
function getPageHeight() {
  const html = document.documentElement;
  const body = document.body;
  return Math.max(html.offsetHeight, html.scrollHeight,
      body.offsetHeight, body.scrollHeight);
}
