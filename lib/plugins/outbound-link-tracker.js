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


var delegate = require('delegate');
var provide = require('../provide');
var createFieldsObj = require('../utilities').createFieldsObj;
var defaults = require('../utilities').defaults;


/**
 * Registers outbound link tracking on a tracker object.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function OutboundLinkTracker(tracker, opts) {

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.addEventListener) return;

  this.opts = defaults(opts, {
    linkSelector: 'a',
    shouldTrackOutboundLink: this.shouldTrackOutboundLink,
    getLinkHref: this.getLinkHref,
    fieldsObj: null,
    hitFilter: null
  });

  this.tracker = tracker;

  this.delegate = delegate(document, this.opts.linkSelector,
      'click', this.handleLinkClicks.bind(this));
}


/**
 * Handles all clicks on link elements. A link is considered an outbound link
 * its hostname property does not match location.hostname. When the beacon
 * transport method is not available, the links target is set to "_blank" to
 * ensure the hit can be sent.
 * @param {Event} event The DOM click event.
 */
OutboundLinkTracker.prototype.handleLinkClicks = function(event) {
  var link = event.delegateTarget;
  if (this.opts.shouldTrackOutboundLink(link)) {
    // Opens outbound links in a new tab if the browser doesn't support
    // the beacon transport method.
    if (!navigator.sendBeacon) {
      link.target = '_blank';
    }

    var defaultFields = {
      transport: 'beacon',
      eventCategory: 'Outbound Link',
      eventAction: 'click',
      eventLabel: this.opts.getLinkHref(link)
    };
    this.tracker.send('event', createFieldsObj(defaultFields,
        this.opts.fieldsObj, this.tracker, this.opts.hitFilter));
  }
};


/**
 * Determines whether or not the tracker should send a hit when a link is
 * clicked. By default links with a hostname property not equal to the current
 * hostname are tracked.
 * @param {Element} link The link that was clicked on.
 * @return {boolean} Whether or not the link should be tracked.
 */
OutboundLinkTracker.prototype.shouldTrackOutboundLink = function(link) {
  return link.hostname != location.hostname &&
      link.protocol && link.protocol.indexOf('http') === 0;
};


/**
 * Gets the href value of links. This value gets set on the `eventLabel` field.
 * Customizing this is useful when you don't want to use the href as the event
 * label. It's also useful if you have outbound link tracking on elements that
 * aren't actually links and don't have an href property.
 * @param {Element} link The link that was clicked on.
 * @return {string} The value (usually the href) to send as the event label.
 */
OutboundLinkTracker.prototype.getLinkHref = function(link) {
  return link.href;
};


/**
 * Removes all event listeners and instance properties.
 */
OutboundLinkTracker.prototype.remove = function() {
  this.delegate.destroy();
};


provide('outboundLinkTracker', OutboundLinkTracker);
