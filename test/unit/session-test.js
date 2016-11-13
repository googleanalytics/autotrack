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


var assert = require('assert');
var sinon = require('sinon');
var session = require('../../lib/session');
var storage = require('../../lib/storage');
var now = require('../../lib/utilities').now;


var TRACKING_ID = 'UA-12345-1';
var MINUTES = 60 * 1000;


describe('session', function() {
  var tracker;
  var store = storage.bindAccessors(TRACKING_ID, 'session');

  beforeEach(function(done) {
    localStorage.clear();
    window.ga('create', TRACKING_ID, 'auto');
    window.ga(function(t) {
      tracker = t;
      done();
    });
  });

  afterEach(function() {
    localStorage.clear();
    window.ga('remove');
  });

  describe('initSessionControl', function() {
    it('logs the time of the last interaction hit', function() {
      session.initSessionControl(tracker);

      var timeBeforePageview = now();
      tracker.send('pageview');

      var lastHitTime = store.get().hitTime;
      assert(lastHitTime >= timeBeforePageview);

      session.restoreSessionControl(tracker);
    });

    it('does not log the time of non-interaction hits', function() {
      session.initSessionControl(tracker);

      tracker.send('pageview', {nonInteraction: true});
      tracker.send('timing', 'foo', 'bar');
      tracker.send('data');

      var lastHitTime = store.get().hitTime;
      assert(!lastHitTime);

      session.restoreSessionControl(tracker);
    });

    it('sends hits normally after logging', function() {
      var sendHitTaskStub = sinon.stub();
      tracker.set('sendHitTask', sendHitTaskStub);
      session.initSessionControl(tracker);

      tracker.send('pageview');
      assert(sendHitTaskStub.calledOnce);

      session.restoreSessionControl(tracker);
    });
  });

  describe('restoreSessionControl', function() {
    it('stop logging and restores the original sendHitTask', function() {
      var sendHitTaskStub = sinon.stub();
      tracker.set('sendHitTask', sendHitTaskStub);

      session.initSessionControl(tracker);
      assert.notStrictEqual(tracker.get('sendHitTask'), sendHitTaskStub);

      session.restoreSessionControl(tracker);
      assert.strictEqual(tracker.get('sendHitTask'), sendHitTaskStub);

      tracker.send('pageview');
      assert(sendHitTaskStub.calledOnce);
    });
  });

  describe('isExpired', function() {
    it('returns true if the last hit was too long ago', function() {
      store.set({hitTime: now() - (60 * MINUTES)});
      assert(session.isExpired(tracker, 30));

      store.set({hitTime: now() - (15 * MINUTES)});
      assert(!session.isExpired(tracker, 30));
    });

    it('returns true if a new day has started', function() {
      try {
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles'
        }).format(new Date());
      } catch(err) {
        // Skip this test in browsers that don't support time zones.
        return this.skip();
      }

      var dateTimeFormatStub = stubDateTimeFormat();
      dateTimeFormatStub.onCall(0).returns('9/15/1982');
      dateTimeFormatStub.onCall(1).returns('9/14/1982');
      dateTimeFormatStub.returns('9/14/1982');

      store.set({hitTime: now() - (15 * MINUTES)});

      // The stubs above should return difference dates for now vs the last
      // hit, so even though 30 minutes hasn't passed, the session has expired.
      assert(session.isExpired(tracker, 30, 'America/Los_Angeles'));

      // In this assertion the current hit and last hit occur on the same day.
      assert(!session.isExpired(tracker, 30, 'America/Los_Angeles'));

      restoreDateTimeFormat();
    });

    it('does not error in browsers with no time zone support', function() {
      store.set({hitTime: now()});

      assert.doesNotThrow(function() {
        session.isExpired(tracker, 30, 'America/Los_Angeles');
      });
    });
  });
});


var originalDateTimeFormatDescriptor = Object.getOwnPropertyDescriptor(
    Intl.DateTimeFormat.prototype, 'format');


/**
 * `sinon.stub()` doesn't work with the `Intl.DateTimeFormat.prototype.format`
 * getter so it has to be manually stubbed.
 * @return {Function} A sinon stub function.
 */
function stubDateTimeFormat() {
  var stub = sinon.stub();
  Object.defineProperty(
      Intl.DateTimeFormat.prototype, 'format', {value: stub});

  return stub;
}


/**
 * Restores the `Intl.DateTimeFormat.prototype.format` stub.
 */
function restoreDateTimeFormat() {
  Object.defineProperty(Intl.DateTimeFormat.prototype, 'format',
      originalDateTimeFormatDescriptor);
}
