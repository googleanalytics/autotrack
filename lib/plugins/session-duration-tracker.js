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
var provide = require('../provide');


var DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes.


/**
 * Registers outbound link tracking on tracker object.
 * @constructor
 * @param {Object} tracker Passed internally by analytics.js
 * @param {?Object} opts Passed by the require command.
 */
function SessionDurationTracker(tracker, opts) {

  // Registers the plugin on the global gaplugins object.
  window.gaplugins = window.gaplugins || {};
  gaplugins.SessionDurationTracker = SessionDurationTracker;

  // Feature detects to prevent errors in unsupporting browsers.
  if (!window.addEventListener) return;

  this.opts = defaults(opts, {
    sessionTimeout: DEFAULT_SESSION_TIMEOUT
  });

  this.tracker = tracker;
  this.lastHitTime_ = +new Date;
  this.originalSendHitTask_ = this.tracker.get('sendHitTask');

  this.tracker.set('sendHitTask', function(model) {
    this.lastHitTime_ = +new Date;
    this.originalSendHitTask_(model);
  }.bind(this));

  window.addEventListener('unload', this.handleWindowUnload.bind(this));
}


/**
 * Handles the window unload event.
 */
SessionDurationTracker.prototype.handleWindowUnload = function() {
  if (this.isWithinSessionTimeout()) {
    // Note: This will fail in many cases when Beacon isn't supported,
    // but we try it because at least it's better than nothing.
    this.tracker.send('event', 'Window', 'unload', {
      nonInteraction: true,
      transport: 'beacon'
    });
  }
};


SessionDurationTracker.prototype.isWithinSessionTimeout = function() {
  return new Date - this.lastHitTime_ < this.opts.sessionTimeout;
}


provide('sessionDurationTracker', SessionDurationTracker);
