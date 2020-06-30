

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
        trackingId, 'plugins/max-scroll-tracker-dynamic');

    this.session = Session.getOrCreate(
        tracker, this.opts.sessionTimeout, this.opts.timeZone);

    // Queue the rest of the initialization of the plugin idly.
    this.queue = TrackerQueue.getOrCreate(trackingId);

    this.listenForMaxScrollChanges();
  }

  /**
   * Adds a scroll event listener 
   */
  listenForMaxScrollChanges() {
      addEventListener('scroll', this.handleScroll);
    
  }
  stopListeningForMaxScrollChanges() {
    removeEventListener('scroll', this.handleScroll);
  }



  handleScroll() {
 
    this.queue.pushTask(({time}) => {

 
  //--------------------------
      function getDocHeight() {
        var D = document;
        return Math.max(
            D.body.scrollHeight, D.documentElement.scrollHeight,
            D.body.offsetHeight, D.documentElement.offsetHeight,
            D.body.clientHeight, D.documentElement.clientHeight
        )
    }
    
    var docheight = getDocHeight()
        var winheight= window.innerHeight || (document.documentElement || document.body).clientHeight
        var docheight = getDocHeight()
        var scrollTop = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop
        // console.log(scrollTop)  ---> Can be used for testing
    

    //---------------------------



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
        const maxScrollTop = this.getMaxScrollPercentageForCurrentPage();

        if (scrollTop > maxScrollTop) {
   
          const increaseAmount = scrollTop - maxScrollTop;
          
            this.setMaxScrollPercentageForCurrentPage(scrollTop);
            this.sendMaxScrollEvent(increaseAmount, scrollTop, time);
          
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
  sendMaxScrollEvent(increaseAmount, scrollTop, scrollTimestamp) {
    this.queue.pushTask(() => {
      /** @type {FieldsObj} */
      const defaultFields = {
        transport: 'beacon',
        eventCategory: 'Max Scroll',
        eventAction: 'increase',
        eventValue: increaseAmount,
        eventLabel: String(scrollTop),
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
  setMaxScrollPercentageForCurrentPage(maxScrollTop) {
    this.store.update({
      [this.pagePath]: maxScrollTop,
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

