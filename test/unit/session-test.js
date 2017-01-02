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


import assert from 'assert';
import sinon from 'sinon';
import Session from '../../lib/session';
import {now} from '../../lib/utilities';


var TRACKING_ID = 'UA-12345-1';
var MINUTES = 60 * 1000;


describe('Session', function() {
  var tracker;
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

  describe('constructor', function() {
    it('sets the passed args on the instance', function() {
      var session = new Session(tracker, 123, 'America/Los_Angeles');

      assert.strictEqual(session.tracker, tracker);
      assert.strictEqual(session.timeout, 123);
      assert.strictEqual(session.timeZone, 'America/Los_Angeles');

      session.destroy();
    });

    it('uses the default timeout if not set', function() {
      var session = new Session(tracker);

      assert.strictEqual(session.tracker, tracker);
      assert.strictEqual(session.timeout, Session.DEFAULT_TIMEOUT);
      assert.strictEqual(session.timeZone, undefined);

      session.destroy();
    });

    it('overrides the sendHitTask and stores the original', function() {
      var oldSendHitTask = tracker.get('sendHitTask');
      var session = new Session(tracker);

      assert.strictEqual(session.oldSendHitTask, oldSendHitTask);
      assert.strictEqual(
          session.tracker.get('sendHitTask'),
          session.sendHitTask);

      session.destroy();
    });

    it('does not create more than one instance per tracking ID', function() {
      var session1 = new Session(tracker);
      var session2 = new Session(tracker);

      assert.strictEqual(session1, session2);

      session1.destroy();
      session2.destroy(); // Not really needed.
    });

    it('adds a listener for storage changes', function() {
      var session = new Session(tracker);

      assert.strictEqual(
          session.store.storageDidChangeInAnotherWindow,
          session.handleStorage);

      session.destroy();
    });
  });

  describe('isExpired', function() {
    it('returns true if the last hit was too long ago', function() {
      var session = new Session(tracker);

      session.store.set({hitTime: now() - (60 * MINUTES)});
      assert(session.isExpired());

      session.store.set({hitTime: now() - (15 * MINUTES)});
      assert(!session.isExpired());

      session.destroy();
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

      var session = new Session(tracker, 30, 'America/Los_Angeles');
      session.store.set({hitTime: now() - (15 * MINUTES)});

      // The stubs above should return difference dates for now vs the last
      // hit, so even though 30 minutes hasn't passed, the session has expired.
      assert(session.isExpired());

      // In this assertion the current hit and last hit occur on the same day.
      assert(!session.isExpired());

      session.destroy();
      restoreDateTimeFormat();
    });

    it('returns true if the previous hit ended the session', function() {
      var session = new Session(tracker);

      tracker.send('pageview');
      tracker.send('event', 'cat', 'act', {sessionControl: 'end'});

      assert(session.isExpired());

      session.destroy();
    });

    it('does not error in browsers with no time zone support', function() {
      var session = new Session(tracker, 30, 'America/Los_Angeles');
      session.store.set({hitTime: now()});

      assert.doesNotThrow(function() {
        session.isExpired();
      });

      session.destroy();
    });
  });

  describe('isLastTrackerInteractionFromPreviousSession', function() {
    it('returns true if the tracker\'s last known interaction hit was ' +
        'from the previous session', function() {
      var session = new Session(tracker);

      // A timing hit is not interaction, but to previous session data exists,
      // so it's inconclusive.
      tracker.send('timing', 'foo', 'bar', 100);
      assert(!session.isLastTrackerInteractionFromPreviousSession());

      // A pageview hit is interaction, but still no previous session data
      // exists, so err on the side of caution.
      tracker.send('pageview');
      assert(!session.isLastTrackerInteractionFromPreviousSession());

      // Manually trigger the `handleStorage()` method, similar to how it
      // would happen if a hit were sent in another tab after expiration.
      var oldSessionData = session.store.get();
      var newSessionData = {
        hitTime: now(),
        sessionCount: oldSessionData.sessionCount + 1,
      };
      session.store.set(newSessionData);
      session.handleStorage(newSessionData, oldSessionData);

      // Since an interaction hit was sent prior to the sesson count
      // increasing, the last hit is known to be from the previous session.
      assert(session.isLastTrackerInteractionFromPreviousSession());

      session.destroy();
    });
  });

  describe('sendHitTask', function() {
    it('sends the hit normally prior to doing additional work', function() {
      var sendHitTaskStub = sinon.stub();
      tracker.set('sendHitTask', sendHitTaskStub);

      var session = new Session(tracker);
      tracker.send('pageview');
      assert(sendHitTaskStub.calledOnce);

      session.destroy();
    });

    it('logs the time of the last hit', function() {
      var session = new Session(tracker);

      var timeBeforePageview = now();
      tracker.send('pageview');
      var lastHitTime = session.store.get().hitTime;
      assert(lastHitTime >= timeBeforePageview);

      var timeBeforeTimingHit = now();
      tracker.send('timing', 'foo', 'bar', 1000);
      lastHitTime = session.store.get().hitTime;
      assert(lastHitTime >= timeBeforeTimingHit);

      session.destroy();
    });

    it('increments the session count when new sessions start', function() {
      var session = new Session(tracker);
      assert.strictEqual(session.store.get().sessionCount, 0);

      tracker.send('pageview');
      assert.strictEqual(session.store.get().sessionCount, 0);
      assert.strictEqual(session.sessionCount_, 0);

      // Manually expire the session.
      session.store.set({isExpired: true});

      tracker.send('pageview');
      assert.strictEqual(session.store.get().sessionCount, 1);
      assert.strictEqual(session.sessionCount_, 1);

      // Expire the session via sessionControl.
      tracker.send('event', 'cat', 'act', {sessionControl: 'end'});
      tracker.send('pageview');
      assert.strictEqual(session.store.get().sessionCount, 2);
      assert.strictEqual(session.sessionCount_, 2);

      // Start a new session via sessionControl.
      tracker.send('pageview', {sessionControl: 'start'});
      assert.strictEqual(session.store.get().sessionCount, 3);
      assert.strictEqual(session.sessionCount_, 3);

      session.destroy();
    });

    it('invokes the newSessionDidStart method after hits ' +
        'if the previous session expired', function() {
      var session = new Session(tracker);
      sinon.spy(Session.prototype, 'newSessionDidStart');

      tracker.send('pageview');
      assert(!Session.prototype.newSessionDidStart.called);

      // Manually expire the session.
      session.store.set({isExpired: true});

      // Send an interaction hit.
      tracker.send('pageview');
      assert(Session.prototype.newSessionDidStart.calledOnce);

      // Manually expire the session.
      session.store.set({isExpired: true});

      // Send a non-interaction hit.
      tracker.send('timing', 'foo', 'bar', 100);
      assert(Session.prototype.newSessionDidStart.called);

      Session.prototype.newSessionDidStart.restore();
      session.destroy();
    });
  });

  describe('handleStorage', function() {
    it('invokes newSessionDidStartInAnotherWindow if a new session ' +
        'has started in another window', function() {
      sinon.spy(Session.prototype, 'newSessionDidStartInAnotherWindow');

      var session = new Session(tracker);

      // Manually trigger the `handleStorage()` method, similar to how it
      // would happen if a hit were sent in another tab after expiration.
      var oldSessionData = session.store.get();
      var newSessionData = {
        hitTime: now(),
        sessionCount: oldSessionData.sessionCount + 1,
      };
      session.store.set(newSessionData);
      session.handleStorage(newSessionData, oldSessionData);

      assert(Session.prototype.newSessionDidStartInAnotherWindow.calledOnce);

      Session.prototype.newSessionDidStartInAnotherWindow.restore();
      session.destroy();
    });
  });

  describe('destroy', function() {
    it('restores the original sendHitTask', function() {
      var sendHitTaskStub = sinon.stub();
      tracker.set('sendHitTask', sendHitTaskStub);

      var session = new Session(tracker);
      assert.notStrictEqual(tracker.get('sendHitTask'), sendHitTaskStub);

      session.destroy();
      assert.strictEqual(tracker.get('sendHitTask'), sendHitTaskStub);

      tracker.send('pageview');
      assert(sendHitTaskStub.calledOnce);
    });

    it('removes the instance from the global store', function() {
      var session1 = new Session(tracker);
      var session2 = new Session(tracker);

      assert.strictEqual(session1, session2);

      session1.destroy();
      session2.destroy();

      var session3 = new Session(tracker);
      assert.notStrictEqual(session3, session1);
      assert.notStrictEqual(session3, session2);

      session3.destroy();
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
