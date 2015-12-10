import provide from './provide';
import supports from './supports';


class SessionDurationTracker {

  /**
   * @constructor
   * Registers outbound link tracking on tracker object.
   * @param {Object} tracker Passed internally by analytics.js
   */
  constructor(tracker, opts = {}) {

    this.tracker = tracker;

    // Use the beacon transport mechanism if available.
    this.tracker.set('transport', 'beacon');

    window.addEventListener('unload', this.handleWindowUnload.bind(this));
  }


  /**
   * Handles the window unload event.
   */
  handleWindowUnload() {
    let fieldsObj = {};

    // Adds time since navigation start if supported.
    if (window.performance && performance.timing) {
      fieldsObj.eventValue = +new Date - performance.timing.navigationStart;
    }

    // Defaults to sending the hit via sync XHR if beacon isn't available.
    if (!supports.beacon()) {
      fieldsObj.sendHitTask = this.sendSyncHit;
    }

    this.tracker.send('event', 'Window', 'unload', fieldsObj);
  }


  /**
   * Sends the hit payload data to Google Analytics via sync XHR to ensure
   * the hit gets sent before the page unloads.
   * @param {Object} model Passed internally by analytics.js
   */
  sendSyncHit(model) {
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '//www.google-analytics.com/collect', false);
    xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
    xhr.send(model.get('hitPayload'));
  }
}


provide('sessionDurationTracker', SessionDurationTracker);
