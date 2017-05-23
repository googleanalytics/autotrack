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


const TRACKING_ID = 'UA-12345-1';
const MINUTES = 60 * 1000;
const DEFAULT_TIMEOUT = 30; // minutes


describe('Session', () => {
  let tracker;
  beforeEach((done) => {
    localStorage.clear();
    window.ga('create', TRACKING_ID, 'auto');
    window.ga((t) => {
      tracker = t;
      done();
    });
  });

  afterEach(() => {
    localStorage.clear();
    window.ga('remove');
  });

  describe('static getOrCreate', () => {
    it('does not create more than one instance per tracking ID', () => {
      const session1 = Session.getOrCreate(tracker);
      const session2 = Session.getOrCreate(tracker);

      assert.strictEqual(session1, session2);

      session1.destroy();
      session2.destroy(); // Not really needed.
    });
  });

  describe('constructor', () => {
    it('stores a unique ID', () => {
      const session = new Session(tracker);

      assert(session.getId());

      session.destroy();
    });

    it('reuses a stored ID if found', () => {
      localStorage.setItem(
          'autotrack:UA-12345-1:session', JSON.stringify({id: 'foo'}));

      const session = new Session(tracker);
      assert.strictEqual(session.getId(), 'foo');

      session.destroy();
    });

    it('sets the passed args on the instance', () => {
      const session = new Session(tracker, 123, 'America/Los_Angeles');

      assert.strictEqual(session.tracker, tracker);
      assert.strictEqual(session.timeout, 123);
      assert.strictEqual(session.timeZone, 'America/Los_Angeles');

      session.destroy();
    });

    it('uses the default timeout if not set', () => {
      const session = new Session(tracker);

      assert.strictEqual(session.tracker, tracker);
      assert.strictEqual(session.timeout, DEFAULT_TIMEOUT);
      assert.strictEqual(session.timeZone, undefined);

      session.destroy();
    });

    it('adds a listener for storage changes', () => {
      const session = new Session(tracker);

      assert.strictEqual(
          session.store.storageDidChangeInAnotherWindow,
          session.handleStorage);

      session.destroy();
    });
  });

  describe('getId', () => {
    it('returns the stored ID', () => {
      const session = new Session(tracker);

      assert(session.getId());

      session.destroy();
    });
  });

  describe('isExpired', () => {
    it('returns true if the last hit was too long ago', () => {
      const session = new Session(tracker);

      session.store.set({hitTime: now() - (60 * MINUTES)});

      assert(session.isExpired());

      session.store.set({hitTime: now() - (15 * MINUTES)});
      assert(!session.isExpired());

      session.destroy();
    });

    it('returns true if a new day has started', function() {
      try {
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
        }).format(new Date());
      } catch(err) {
        // Skip this test in browsers that don't support time zones.
        return this.skip();
      }

      const dateTimeFormatStub = stubDateTimeFormat();
      dateTimeFormatStub.onCall(0).returns('9/15/1982');
      dateTimeFormatStub.onCall(1).returns('9/14/1982');
      dateTimeFormatStub.returns('9/14/1982');

      const session = new Session(tracker, 30, 'America/Los_Angeles');
      session.store.set({hitTime: now() - (15 * MINUTES)});

      // The stubs above should return difference dates for now vs the last
      // hit, so even though 30 minutes hasn't passed, the session has expired.
      assert(session.isExpired());

      // In this assertion the current hit and last hit occur on the same day.
      assert(!session.isExpired());

      session.destroy();
      restoreDateTimeFormat();
    });

    it('returns true if the previous hit ended the session', () => {
      const session = new Session(tracker);

      tracker.send('pageview');
      tracker.send('event', 'cat', 'act', {sessionControl: 'end'});

      assert(session.isExpired());

      session.destroy();
    });

    it('does not error in browsers with no time zone support', () => {
      const session = new Session(tracker, 30, 'America/Los_Angeles');
      session.store.set({hitTime: now()});

      assert.doesNotThrow(() => session.isExpired());

      session.destroy();
    });

    it('accepts an optional session ID', () => {
      const session = new Session(tracker);
      session.store.set({hitTime: now()});

      assert(!session.isExpired());
      assert(session.isExpired('old-id'));

      session.destroy();
    });
  });

  describe('sendHitTaskHook', () => {
    it('logs the time of the last hit', () => {
      const session = new Session(tracker);

      const timeBeforePageview = now();
      tracker.send('pageview');
      let lastHitTime = session.store.get().hitTime;
      assert(lastHitTime >= timeBeforePageview);

      const timeBeforeTimingHit = now();
      tracker.send('timing', 'foo', 'bar', 1000);
      lastHitTime = session.store.get().hitTime;
      assert(lastHitTime >= timeBeforeTimingHit);

      session.destroy();
    });

    it('updates the session ID if the session has expired', () => {
      const session = new Session(tracker);
      const id = session.getId();
      session.store.set({hitTime: now() - (60 * MINUTES)});

      assert.strictEqual(id, session.getId());

      // Start a new session by sending a hit, which should generate a new ID.
      tracker.send('pageview');

      assert.notStrictEqual(id, session.getId());

      session.destroy();
    });

    it('updates the session ID if sessionControl was set to start', () => {
      const session = new Session(tracker);
      const id = session.getId();
      session.store.set({hitTime: now()});

      assert.strictEqual(id, session.getId());

      // Start a new session via the sessionControl field.
      tracker.send('pageview', {sessionControl: 'start'});

      assert.notStrictEqual(id, session.getId());

      session.destroy();
    });
  });

  describe('destroy', () => {
    it('removes the instance from the global store', () => {
      const session1 = Session.getOrCreate(tracker);
      const session2 = Session.getOrCreate(tracker);

      assert.strictEqual(session1, session2);

      session1.destroy();
      session2.destroy();

      const session3 = new Session(tracker);
      assert.notStrictEqual(session3, session1);
      assert.notStrictEqual(session3, session2);

      session3.destroy();
    });
  });
});


const originalDateTimeFormatDescriptor = window.Intl &&
    window.Intl.DateTimeFormat && Object.getOwnPropertyDescriptor(
        Intl.DateTimeFormat.prototype, 'format');


/**
 * `sinon.stub()` doesn't work with the `Intl.DateTimeFormat.prototype.format`
 * getter so it has to be manually stubbed.
 * @return {Function} A sinon stub function.
 */
function stubDateTimeFormat() {
  const stub = sinon.stub();
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
