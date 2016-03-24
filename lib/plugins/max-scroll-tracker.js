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

var debounce = require('debounce');
var defaults = require('../utilities').defaults;
var provide = require('../provide');

var documentElement = window.documentElement || window.document;

/**
 * Registers max scroll tracking on a tracker object.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function MaxScrollTracker(tracker, opts) {

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.addEventListener) return;

  this.opts = defaults(opts, {
    scrollTimeout: 400
  });

  this.tracker = tracker;
  this.maxScroll = 0;
  this.handleScroll = debounce(this.updateMaxScroll, this.opts.scrollTimeout)
    .bind(this);
  this.handleBeforeunload = this.handleBeforeunload.bind(this);

  window.addEventListener('beforeunload', this.handleBeforeunload);
  window.addEventListener('scroll', this.handleScroll);

}


/**
 * Handles beforeunload event.
 * @param {Event} event The DOM beforeunload event.
 */
MaxScrollTracker.prototype.handleBeforeunload = function(event) {

  this.updateMaxScroll();

  // Cancel of maxScroll value out of bounds
  if (this.maxScroll > 100 || this.maxScroll <= 0) {
    return;
  }

  var bucket_low = (this.maxScroll > 10 ? 1 : 0) *
    (Math.floor((this.maxScroll - 1) / 10) * 10 + 1
  );
  var bucket_high = Math.ceil(this.maxScroll / 10) * 10;

  var bucket = '' + bucket_low + '%-' + bucket_high + '%';

  this.tracker.send('event', {
    eventCategory: 'Max Scroll',
    eventAction: bucket,
    eventLabel: '' + Math.floor(this.maxScroll) + '%',
    transport: 'beacon',
    nonInteraction: true
  });
};


/**
 * Updates the this.maxScroll property if current scroll is higher
 * @param {Event} event The DOM beforeunload event.
 */
MaxScrollTracker.prototype.updateMaxScroll = function (event) {

  var viewportSize = window.innerHeight || documentElement.clientHeight ||
    document.body.clientHeight || 0;

  var scroll = window.pageYOffset || document.body.scrollTop ||
    documentElement.scrollTop || 0;

  var doc_height = Math.max(
    document.body.scrollHeight || 0, documentElement.scrollHeight || 0,
    document.body.offsetHeight || 0, documentElement.offsetHeight || 0,
    document.body.clientHeight || 0, documentElement.clientHeight || 0
  );

  var scroll_percent = ((scroll + viewportSize) / doc_height) * 100;

  if (scroll_percent > this.maxScroll) {
    this.maxScroll = scroll_percent;
  }

};

/**
 * Removes all event listeners and instance properties.
 */
MaxScrollTracker.prototype.remove = function() {
  window.removeEventListener('scroll', this.handleScroll);
  window.removeEventListener('beforeunload', this.handleUnload);
  this.tracker = null;
  this.opts = null;
  this.maxScroll = null;
};


provide('maxScrollTracker', MaxScrollTracker);
