import delegate from 'delegate';
import provide from './provide';
import supports from './supports';


class OutBoundLinkTracker {

  /**
   * @constructor
   * Registers outbound link tracking on tracker object.
   * @param tracker {Object} Passed internally by analytics.js
   */
  constructor(tracker) {

    this.tracker = tracker;

    // Use the beacon transport mechanism if available.
    this.tracker.set('transport', 'beacon');

    delegate(document, 'a', 'click', this.handleLinkClicks.bind(this));
  }


  /**
   * Handles all clicks on link elements. A link is considered an outbound link
   * its hostname property does not match location.hostname. When the beacon
   * transport method is not available, the links target is set to "_blank" to
   * ensure the hit can be sent.
   * @param {Event} event The DOM click event.
   */
  handleLinkClicks(event) {

    // TODO(philipwalton): ignore outbound links with data attributes.

    let link = event.delegateTarget;
    if (link.hostname != location.hostname) {
      // Open outbound links in a new tab if the browser doesn't support
      // the beacon transport method.
      if (!supports.beacon()) {
        link.target = '_blank';
      }
      this.tracker.send('event', 'Outbound Link', 'click', link.href);
    }
  }
}


provide('outboundLinkTracker', OutBoundLinkTracker);
