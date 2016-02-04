/**
 * Copyright 2016 Google Inc. All Rights Reserved.
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


var defaults = require('../utilities').defaults;
var delegate = require('delegate');
var provide = require('../provide');
var utilities = require('../utilities');


/**
 * Registers outbound form tracking.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function OutboundFormTracker(tracker, opts) {

  // Registers the plugin on the global gaplugins object.
  window.gaplugins = window.gaplugins || {};
  gaplugins.OutboundFormTracker = OutboundFormTracker;

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.addEventListener) return;

  this.opts = defaults(opts);
  this.tracker = tracker;

  delegate(document, 'form', 'submit', this.handleFormSubmits.bind(this));
}


/**
 * Handles all submits on form elements. A form submit is considered outbound
 * if its action attribute starts with http and does not contain
 * location.hostname.
 * When the beacon transport method is not available, the event's default
 * action is prevented and re-emitted after the hit is sent.
 * @param {Event} event The DOM submit event.
 */
OutboundFormTracker.prototype.handleFormSubmits = function(event) {

  var form = event.delegateTarget;
  var action = form.getAttribute('action');
  var fieldsObj = {transport: 'beacon'};

  // Checks if the action is outbound.
  if (action.indexOf('http') === 0 &&
      action.indexOf(location.hostname) < 0) {

    if (!navigator.sendBeacon) {
      // Stops the submit and waits until the hit is complete (with timeout)
      // for browsers that don't support beacon.
      event.preventDefault();
      fieldsObj.hitCallback = utilities.withTimeout(function() {
        form.submit();
      });
    }

    this.tracker.send('event', 'Outbound Form', 'submit', action, fieldsObj);
  }
};


provide('outboundFormTracker', OutboundFormTracker);
