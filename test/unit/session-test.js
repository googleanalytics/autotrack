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


import Session from '../../lib/session';


const TRACKING_ID = 'UA-12345-1';
const MINUTES = 60 * 1000;
const DEFAULT_TIMEOUT = 30; // minutes

let tracker;

describe('Session', () => {
  before(() => {
    localStorage.clear();
  });

  beforeEach((done) => {
    window.ga('create', TRACKING_ID, 'auto');
    window.ga((t) => {
      tracker = t;
      done();
    });
  });

  afterEach(() => {
    window.ga('remove');
  });

  describe('static getOrCreate', () => {
    it('does not create more than one instance per tracking ID', () => {
      const session1 = Session.getOrCreate(tracker);
      const session2 = Session.getOrCreate(tracker);

      assert.strictEqual(session1, session2);

      session1.destroy();
      session2.destroy();
    });
  });

  xdescribe('constructor', () => {
    it('stores a unique ID', () => {
      const session = Session.getOrCreate(tracker);

      assert(session.id);

      session.destroy();
    });

    it('reuses a stored ID if found', () => {
      localStorage.setItem(
          'autotrack:UA-12345-1:session', JSON.stringify({id: 'foo'}));

      const session = Session.getOrCreate(tracker);
      assert.strictEqual(session.id, 'foo');

      session.destroy();
    });

    it('sets the passed args on the instance', () => {
      const session = Session.getOrCreate(tracker, 123, 'America/Los_Angeles');

      assert.strictEqual(session.tracker, tracker);
      assert.strictEqual(session.timeout, 123);
      assert.strictEqual(session.timeZone, 'America/Los_Angeles');

      session.destroy();
    });

    it('uses the default timeout if not set', () => {
      const session = Session.getOrCreate(tracker);

      assert.strictEqual(session.tracker, tracker);
      assert.strictEqual(session.timeout, DEFAULT_TIMEOUT);
      assert.strictEqual(session.timeZone, undefined);

      session.destroy();
    });

    it('adds a listener for storage changes', () => {
      const session = Session.getOrCreate(tracker);

      assert.strictEqual(
          session.store.storageDidChangeInAnotherWindow,
          session.handleStorage);

      session.destroy();
    });
  });

  describe('get id', () => {
    it('returns the stored ID', () => {
      const session = Session.getOrCreate(tracker);

      assert(session.id);

      session.destroy();
    });
  });

  describe('isExpired', () => {
    it('returns true if the last hit was too long ago', () => {
      const clock = sinon.useFakeTimers({now: 1e12});

      const session = Session.getOrCreate(tracker);
      tracker.send('pageview');
      assert(!session.isExpired());

      clock.tick(15 * MINUTES);
      assert(!session.isExpired());

      clock.tick(60 * MINUTES);
      assert(session.isExpired());

      session.destroy();
      clock.restore();
    });

    it('returns true if a new day has started', function() {
      try {
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
        });
      } catch (err) {
        // Skip this test in browsers that don't support time zones.
        return this.skip();
      }

      const clock = sinon.useFakeTimers({now: 1e12});

      const dateTimeFormatStub = stubDateTimeFormat();
      dateTimeFormatStub.onCall(0).returns('9/15/1982');
      dateTimeFormatStub.onCall(1).returns('9/14/1982');

      const session = Session.getOrCreate(tracker, 30, 'America/Los_Angeles');
      tracker.send('pageview');

      clock.tick(15 * MINUTES);

      // The stubs above should return difference dates for now vs the last
      // hit, so even though 30 minutes hasn't passed, the session has expired.
      assert(session.isExpired());

      // In this assertion the current hit and last hit occur on the same day.
      assert(!session.isExpired());

      session.destroy();
      restoreDateTimeFormat();
      clock.restore();
    });

    it('returns true if the previous hit ended the session', () => {
      const session = Session.getOrCreate(tracker);

      tracker.send('pageview');
      tracker.send('event', 'cat', 'act', {sessionControl: 'end'});

      assert(session.isExpired());

      session.destroy();
    });

    it('does not error in browsers with no time zone support', () => {
      const session = Session.getOrCreate(tracker, 30, 'America/Los_Angeles');

      assert.doesNotThrow(() => session.isExpired());

      session.destroy();
    });

    it('accepts an optional session ID', () => {
      const session = Session.getOrCreate(tracker);

      assert(!session.isExpired());
      assert(session.isExpired('old-id'));

      session.destroy();
    });
  });

  xdescribe('sendHitTaskHook', () => {
    it('logs the time of the last hit', () => {
      const clock = sinon.useFakeTimers({now: 1e12});

      const session = Session.getOrCreate(tracker);
      tracker.send('pageview');

      assert(session.store.get().hitTime, 1e12);

      clock.tick(10 * MINUTES);

      tracker.send('timing', 'foo', 'bar', 1000);
      assert(session.store.get().hitTime, 1e12 + (10 * MINUTES));

      session.destroy();
      clock.restore();
    });

    it('updates the session ID if the session has expired', () => {
      const clock = sinon.useFakeTimers({now: 1e12});

      const session = Session.getOrCreate(tracker);
      const id = session.id;
      tracker.send('pageview');

      clock.tick(60 * MINUTES);

      assert.strictEqual(id, session.id);

      // Start a new session by sending a hit, which should generate a new ID.
      tracker.send('pageview');

      assert.notStrictEqual(id, session.id);

      session.destroy();
      clock.restore();
    });

    it('updates the session ID if sessionControl was set to start', () => {
      const session = Session.getOrCreate(tracker);
      const id = session.id;

      assert.strictEqual(id, session.id);

      // Start a new session via the sessionControl field.
      tracker.send('pageview', {sessionControl: 'start'});

      assert.notStrictEqual(id, session.id);

      session.destroy();
    });
  });

  describe('destroy', () => {
    it('releases the reference to the instance', () => {
      const session1 = Session.getOrCreate(tracker);
      const session2 = Session.getOrCreate(tracker);

      assert.strictEqual(session1, session2);

      session1.destroy();

      // session2 still has a reference, so this shouldn't create a new one
      const session3 = Session.getOrCreate(tracker);
      assert.strictEqual(session2, session3);

      session2.destroy();
      session3.destroy();

      // All the references should be released, so a new one should be created.
      const session4 = Session.getOrCreate(tracker);
      assert.notStrictEqual(session3, session4);

      session4.destroy();
    });

    it('clears the store if no more references exist', () => {
      const session1 = Session.getOrCreate(tracker);
      const session2 = Session.getOrCreate(tracker);

      assert.strictEqual(session1, session2);

      // Force the session to write store data.
      tracker.send('pageview');

      session1.destroy();

      // A reference still exists, so the store shouldn't be cleared.
      assert.notStrictEqual(
          localStorage.getItem('autotrack:UA-12345-1:session'), null);

      session2.destroy();

      assert.strictEqual(
          localStorage.getItem('autotrack:UA-12345-1:session'), null);
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
