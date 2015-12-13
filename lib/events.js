var delegate = require('delegate');
var defaults = require('./utilities').defaults;
var provide = require('./provide');


/**
 * Registers declarative event tracking.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function EventTracker(tracker, opts) {

  this.opts = defaults(opts, {
    prefix: 'data-event'
  });

  this.tracker = tracker;

  delegate(document, '[' + this.opts.prefix + '-category]', 'click',
      this.handleEventClicks.bind(this));
}


/**
 * Handles all clicks on elements with event attributes.
 * @param {Event} event The DOM click event.
 */
EventTracker.prototype.handleEventClicks = function(event) {

  var link = event.delegateTarget;

  this.tracker.send('event', {
    eventCategory: link.getAttribute(this.opts.prefix + '-category'),
    eventAction: link.getAttribute(this.opts.prefix + '-action'),
    eventLabel: link.getAttribute(this.opts.prefix + '-label'),
    eventValue: link.getAttribute(this.opts.prefix + '-value')
  });
};


provide('eventTracker', EventTracker);
