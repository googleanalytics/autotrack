var defaults = require('../utilities').defaults;
var delegate = require('delegate');
var provide = require('../provide');


/**
 * Registers outbound link tracking on a tracker object.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function OutBoundLinkTracker(tracker, opts) {

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.addEventListener) return;

  this.opts = defaults(opts);
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
OutBoundLinkTracker.prototype.handleLinkClicks = function(event) {

  // TODO(philipwalton): ignore outbound links with data attributes.

  var link = event.delegateTarget;
  if (link.hostname != location.hostname) {
    // Open outbound links in a new tab if the browser doesn't support
    // the beacon transport method.
    if (!navigator.sendBeacon) {
      link.target = '_blank';
    }
    this.tracker.send('event', 'Outbound Link', 'click', link.href);
  }
};


provide('outboundLinkTracker', OutBoundLinkTracker);
