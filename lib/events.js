import delegate from 'delegate';
import provide from './provide';


const ATTR_PREFIX = 'data-event';


class EventTracker {

  /**
   * @constructor
   * Registers outbound link tracking on tracker object.
   * @param tracker {Object} Passed internally by analytics.js
   */
  constructor(tracker, opts = {}) {

    opts.prefix = opts.prefix || ATTR_PREFIX;

    this.tracker = tracker;
    this.options = opts;

    delegate(document, `[${this.options.prefix}-category]`, 'click',
        this.handleEventClicks.bind(this));
  }


  /**
   * Handles all clicks on elements with event tracking data.
   * @param {Event} event The DOM click event.
   */
  handleEventClicks(event) {

    let link = event.delegateTarget;

    this.tracker.send('event', {
      eventCategory: link.getAttribute(`${this.options.prefix}-category`),
      eventAction: link.getAttribute(`${this.options.prefix}-action`),
      eventLabel: link.getAttribute(`${this.options.prefix}-label`),
      eventValue: link.getAttribute(`${this.options.prefix}-value`)
    });
  }
}


provide('eventTracker', EventTracker);
