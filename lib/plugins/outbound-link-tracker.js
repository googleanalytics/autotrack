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


var assign = require('object-assign');
var delegate = require('dom-utils/lib/delegate');
var parseUrl = require('dom-utils/lib/parse-url');
var provide = require('../provide');
var usage = require('../usage');
var createFieldsObj = require('../utilities').createFieldsObj;
var getAttributeFields = require('../utilities').getAttributeFields;
var withTimeout = require('../utilities').withTimeout;


/**
 * Registers outbound link tracking on a tracker object.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function OutboundLinkTracker(tracker, opts) {

  usage.track(tracker, usage.plugins.OUTBOUND_LINK_TRACKER);

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.addEventListener) return;

  this.opts = assign({
    events: ['click'],
    linkSelector: 'a, area',
    shouldTrackOutboundLink: this.shouldTrackOutboundLink,
    fieldsObj: {},
    attributePrefix: 'ga-',
    hitFilter: null
  }, opts);

  this.tracker = tracker;

  // Binds methods.
  this.handleLinkInteractions = this.handleLinkInteractions.bind(this);

  // Creates a mapping of events to their delegates
  this.delegates = {};
  this.opts.events.forEach(function(event) {
    this.delegates[event] = delegate(document, event, this.opts.linkSelector,
        this.handleLinkInteractions, {composed: true, useCapture: true});
  }.bind(this));
}


/**
 * Handles all interactions on link elements. A link is considered an outbound
 * link if its hostname property does not match location.hostname. When the
 * beacon transport method is not available, the links target is set to
 * "_blank" to ensure the hit can be sent.
 * @param {Event} event The DOM click event.
 * @param {Element} link The delegated event target.
 */
OutboundLinkTracker.prototype.handleLinkInteractions = function(event, link) {
  if (this.opts.shouldTrackOutboundLink(link, parseUrl)) {
    var href = link.getAttribute('href') || link.getAttribute('xlink:href');
    var url = parseUrl(href);

    var defaultFields = {
      transport: 'beacon',
      eventCategory: 'Outbound Link',
      eventAction: event.type,
      eventLabel: url.href
    };

    if (!navigator.sendBeacon &&
        linkClickWillUnloadCurrentPage(event, link)) {
      // Adds a new event handler at the last minute to minimize the chances
      // that another event handler for this click will run after this logic.
      window.addEventListener('click', function(event) {
        // Checks to make sure another event handler hasn't already prevented
        // the default action. If it has the custom redirect isn't needed.
        if (!event.defaultPrevented) {
          // Stops the click and waits until the hit is complete (with timeout)
          // for browsers that don't support beacon.
          event.preventDefault();
          defaultFields.hitCallback = withTimeout(function() {
            location.href = href;
          });
        }
      });
    }

    var userFields = assign({}, this.opts.fieldsObj,
        getAttributeFields(link, this.opts.attributePrefix));

    this.tracker.send('event', createFieldsObj(
        defaultFields, userFields, this.tracker, this.opts.hitFilter, link));
  }
};


/**
 * Determines whether or not the tracker should send a hit when a link is
 * clicked. By default links with a hostname property not equal to the current
 * hostname are tracked.
 * @param {Element} link The link that was clicked on.
 * @param {Function} parseUrl A cross-browser utility method for url parsing.
 * @return {boolean} Whether or not the link should be tracked.
 */
OutboundLinkTracker.prototype.shouldTrackOutboundLink =
    function(link, parseUrl) {

  var href = link.getAttribute('href') || link.getAttribute('xlink:href');
  var url = parseUrl(href);
  return url.hostname != location.hostname &&
      url.protocol.slice(0, 4) == 'http';
};


/**
 * Removes all event listeners and instance properties.
 */
OutboundLinkTracker.prototype.remove = function() {
  Object.keys(this.delegates).forEach(function(key) {
    this.delegates[key].destroy();
  }.bind(this));
};


/**
 * Determines if a link click event will cause the current page to upload.
 * Note: most link clicks *will* cause the current page to unload because they
 * initiate a page navigation. The most common reason a link click won't cause
 * the page to unload is if the clicked was to open the link in a new tab.
 * @param {Event} event The DOM event.
 * @param {Element} link The link element clicked on.
 * @return {boolean} True if the current page will be unloaded.
 */
function linkClickWillUnloadCurrentPage(event, link) {
  return !(
      // The event type can be customized; we only care about clicks here.
      event.type != 'click' ||
      // Links with target="_blank" set will open in a new window/tab.
      link.target == '_blank' ||
      // On mac, command clicking will open a link in a new tab. Control
      // clicking does this on windows.
      event.metaKey || event.ctrlKey ||
      // Shift clicking in Chrome/Firefox opens the link in a new window
      // In Safari it adds the URL to a favorites list.
      event.shiftKey ||
      // On Mac, clicking with the option key is used to download a resouce.
      event.altKey ||
      // Middle mouse button clicks (which == 2) are used to open a link
      // in a new tab, and right clicks (which == 3) on Firefox trigger
      // a click event.
      event.which > 1);
}


provide('outboundLinkTracker', OutboundLinkTracker);
