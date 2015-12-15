var defaults = require('../utilities').defaults;
var delegate = require('delegate');
var parseUrl = require('../parse-url');
var provide = require('../provide');
var utilities = require('../utilities');


/**
 * Registers outbound form tracking.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function OutboundFormTracker(tracker, opts) {

  this.opts = defaults(opts);
  this.tracker = tracker;

  // Use the beacon transport mechanism if available.
  this.tracker.set('transport', 'beacon');

  delegate(document, 'form', 'click', handleFormElementClicks);
  delegate(document, 'form', 'submit', this.handleFormSubmits.bind(this));
}


/**
 * Handles all submits on form elements. A form submit is considered outbound
 * if its action property does not match location.hostname.
 * When the beacon transport method is not available, the event default action
 * is prevented and re-emitted after the hit is successful.
 * @param {Event} event The DOM submit event.
 */
OutboundFormTracker.prototype.handleFormSubmits = function(event) {

  var form = event.delegateTarget;
  var action = parseUrl(getTrueFormAction(form));

  if (action.hostname != location.hostname) {
    if (false && navigator.sendBeacon) {
      this.tracker.send('event', 'Outbound Form', 'submit', action.href);
    }
    else {
      // Stops the submit and waits until the hit is complete (with timeout)
      // for browsers that don't support beacon.
      event.preventDefault();
      this.tracker.send('event', 'Outbound Form', 'submit', action.href, {
        hitCallback: utilities.withTimeout(function() {
          form.submit();
        })
      });
    }
  }

  resetTrueFormAction(form);
};


function handleFormElementClicks(event) {
  var el = event.target;
  var form = event.delegateTarget;

  // <button> elements of type submit (or no type declared) can submit a
  // form an override the form's action.
  if (el.tagName.toLowerCase() == 'button') {
    if (el.getAttribute('type') == 'submit' || !el.hasAttribute('type')) {
      setTrueFormAction(el, form);
    }
  }

  // <input> elements of type submit or image can submit a
  // form an override the form's action.
  else if (el.tagName.toLowerCase() == 'input') {
    if (el.getAttribute('type') == 'submit' ||
        el.getAttribute('type') == 'image') {
      setTrueFormAction(el, form);
    }
  }
}


function setTrueFormAction(el, form) {
  console.log('click', el);
  form.__trueAction__ = el.getAttribute('formaction');
  // Deletes the true action property after the form submits.
  setTimeout(resetTrueFormAction.bind(null, form), 0);
}


function getTrueFormAction(form) {
  return form.__trueAction__ || form.getAttribute('action');
}


function resetTrueFormAction(form) {
  delete form.__trueAction__;
}


provide('outboundFormTracker', OutboundFormTracker);
