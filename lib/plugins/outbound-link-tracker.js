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


/**
 * Registers outbound link tracking on a tracker object.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function OutboundLinkTracker(tracker, opts) {

  // Registers the plugin on the global gaplugins object.
  window.gaplugins = window.gaplugins || {};
  gaplugins.OutboundLinkTracker = OutboundLinkTracker;

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.addEventListener) return;

  this.opts = defaults(opts);
  this.tracker = tracker;

  delegate(document, 'a', 'click', this.handleLinkClicks.bind(this));
}


/**
 * Handles all clicks on link elements. A link is considered an outbound link
 * its hostname property does not match location.hostname. When the beacon
 * transport method is not available, the links target is set to "_blank" to
 * ensure the hit can be sent.
 * @param {Event} event The DOM click event.
 */
OutboundLinkTracker.prototype.handleLinkClicks = function(event) {

  // TODO(philipwalton): ignore outbound links with data attributes.

  var link = event.delegateTarget;
  if (link.hostname != location.hostname) {
    // Open outbound links in a new tab if the browser doesn't support
    // the beacon transport method.
    if (!navigator.sendBeacon) {
      link.target = '_blank';
    }
    this.tracker.send('event', 'Outbound Link', 'click', link.href, {
      transport: 'beacon'
    });
  }
};


provide('outboundLinkTracker', OutboundLinkTracker);
