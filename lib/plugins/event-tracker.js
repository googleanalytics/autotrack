var delegate = require('delegate');
var defaults = require('../utilities').defaults;
var provide = require('../provide');


/**
 * Registers declarative event tracking.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function EventTracker(tracker, opts) {

  this.opts = defaults(opts, {
    attributePrefix: 'data-'
  });

  this.tracker = tracker;

  var prefix = this.opts.attributePrefix;
  var selector = '[' + prefix + 'event-category][' + prefix + 'event-action]';

  delegate(document, selector, 'click', this.handleEventClicks.bind(this));
}


/**
 * Handles all clicks on elements with event attributes.
 * @param {Event} event The DOM click event.
 */
EventTracker.prototype.handleEventClicks = function(event) {

  var link = event.delegateTarget;
  var prefix = this.opts.attributePrefix;

  this.tracker.send('event', {
    eventCategory: link.getAttribute(prefix + 'event-category'),
    eventAction: link.getAttribute(prefix + 'event-action'),
    eventLabel: link.getAttribute(prefix + 'event-label'),
    eventValue: link.getAttribute(prefix + 'event-value')
  });
};


provide('eventTracker', EventTracker);
