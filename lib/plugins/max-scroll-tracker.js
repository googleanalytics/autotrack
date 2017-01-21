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
import {plugins, trackUsage} from '../usage';
import {assign, createFieldsObj, debounce, isObject} from '../utilities';


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

    // Feature detects to prevent errors in unsupporting browsers.
    if (!window.addEventListener) return;

    /** @type {MaxScrollTrackerOpts} */
    const defaultOpts = {
      increaseThreshold: 20,
      sessionTimeout: Session.DEFAULT_TIMEOUT,
      // timeZone: undefined,
      // maxScrollMetricIndex: undefined,
      fieldsObj: {},
      // hitFilter: undefined
    };

    this.opts = /** @type {MaxScrollTrackerOpts} */ (
        assign(defaultOpts, opts));

    this.tracker = tracker;
    this.pagePath = this.getPagePath();

    // Binds methods to `this`.
    this.handleScroll = debounce(this.handleScroll.bind(this), 500);
    this.trackerSetOverride = this.trackerSetOverride.bind(this);

    // Creates the store and binds storage change events.
    this.store = Store.getOrCreate(
        tracker.get('trackingId'), 'plugins/max-scroll-tracker');

    // Creates the session and binds session events.
    this.session = new Session(
        tracker, this.opts.sessionTimeout, this.opts.timeZone);

    // Override the built-in tracker.set method to watch for changes.
    MethodChain.add(tracker, 'set', this.trackerSetOverride);

    this.listenForMaxScrollChanges();
  }


  /**
   * Adds a scroll event listener if the max scroll percentage for the
   * current page isn't already at 100%.
   */
  listenForMaxScrollChanges() {
    const maxScrollPercentage = this.getMaxScrollPercentageForCurrentPage();
    if (maxScrollPercentage < 100) {
      window.addEventListener('scroll', this.handleScroll);
    }
  }


  /**
   * Removes an added scroll listener.
   */
  stopListeningForMaxScrollChanges() {
    window.removeEventListener('scroll', this.handleScroll);
  }


  /**
   * Handles the scroll event. If the current scroll percentage is greater
   * that the stored scroll event by at least the specified increase threshold,
   * send an event with the increase amount.
   */
  handleScroll() {
    const pageHeight = getPageHeight();
    const scrollPos = window.pageYOffset; // scrollY isn't supported in IE.
    const windowHeight = window.innerHeight;

    // Ensure scrollPercentage is an integer between 0 and 100.
    const scrollPercentage = Math.min(100, Math.max(0,
        Math.round(100 * (scrollPos / (pageHeight - windowHeight)))));

    // If the session has expired, clear old scroll data and send no events.
    if (this.session.isExpired()) {
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
          this.sendMaxScrollEvent(increaseAmount, scrollPercentage);
        }
      }
    }
  }

  /**
   * Detects changes to the tracker object and triggers an update if the page
   * field has changed.
   * @param {function(...*)} originalMethod A reference to the overridden
   *     method.
   * @return {function(...*)}
   */
  trackerSetOverride(originalMethod) {
    return (...args) => {
      originalMethod(...args);

      /** @type {!FieldsObj} */
      const fields = isObject(args[0]) ? args[0] : {[args[0]]: args[1]};
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
    }
  }

  /**
   * Sends an event for the increased max scroll percentage amount.
   * @param {number} increaseAmount
   * @param {number} scrollPercentage
   */
  sendMaxScrollEvent(increaseAmount, scrollPercentage) {
    /** @type {FieldsObj} */
    const defaultFields = {
      transport: 'beacon',
      nonInteraction: true,
      eventCategory: 'Max Scroll',
      eventAction: 'increase',
      eventValue: increaseAmount,
      eventLabel: String(scrollPercentage),
    };

    // If a custom metric was specified, set it equal to the event value.
    if (this.opts.maxScrollMetricIndex) {
      defaultFields['metric' + this.opts.maxScrollMetricIndex] = increaseAmount;
    }

    this.tracker.send('event',
        createFieldsObj(defaultFields, this.opts.fieldsObj,
            this.tracker, this.opts.hitFilter));
  }

  /**
   * Stores the current max scroll percentage for the current page.
   * @param {number} maxScrollPercentage
   */
  setMaxScrollPercentageForCurrentPage(maxScrollPercentage) {
    this.store.set({[this.pagePath]: maxScrollPercentage});
  }

  /**
   * Gets the stored max scroll percentage for the current page.
   * @return {number}
   */
  getMaxScrollPercentageForCurrentPage() {
    return this.store.get()[this.pagePath] || 0;
  }

  /**
   * Gets the page path from the tracker object.
   * @return {number}
   */
  getPagePath() {
    return parseUrl(
        this.tracker.get('page') || this.tracker.get('location')).path;
  }

  /**
   * Removes all event listeners and restores overridden methods.
   */
  remove() {
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
      body.offsetHeight, body.scrollHeight)
}
