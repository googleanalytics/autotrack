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

import Store from '../../lib/store';


const sandbox = sinon.createSandbox();

// TODO(philipwalton): remove once dom=utils supports
// using Object.defineProperty on events.
const dispatchStorageEvent = ({key, oldValue, newValue}) => {
  let event;
  try {
    event = new StorageEvent('storage', {key, oldValue, newValue});
  } catch (err) {
    // We can't use StorageEvent because the properties aren't writable in IE.
    event = document.createEvent('Event');
    event.initEvent('storage', false, false);
    Object.defineProperties(event, {
      key: {value: key},
      newValue: {value: newValue},
      oldValue: {value: oldValue},
    });
  }
  window.dispatchEvent(event);
};


describe('Store', () => {
  before(() => {
    localStorage.clear();
  });

  beforeEach(() => {
    sandbox.restore();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('static getOrCreate', () => {
    it('does not create multiple instances for the same key', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');
      const store3 = Store.getOrCreate('UA-12345-1', 'ns1');

      assert.strictEqual(store1, store3);
      assert.notStrictEqual(store1, store2);

      store1.destroy();
      store2.destroy();
      store3.destroy();
    });

    it('adds a single event listener for the storage event', () => {
      sandbox.spy(window, 'addEventListener');

      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      assert(window.addEventListener.calledOnce);

      store1.destroy();
      store2.destroy();
    });
  });

  describe('get data', () => {
    it('reads data from localStorage for the store key', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      localStorage.setItem(store1.key_, JSON.stringify({foo: 12, bar: 34}));
      localStorage.setItem(store2.key_, JSON.stringify({qux: 56, baz: 78}));

      assert.deepEqual(store1.data, {foo: 12, bar: 34});
      assert.deepEqual(store2.data, {qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });

    it('merges the stored data with the defaults', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1', {
        defaults: {default: true, foo: 1},
      });
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2', {
        defaults: {default: true, qux: 2},
      });

      localStorage.setItem(store1.key_, JSON.stringify({foo: 12, bar: 34}));
      localStorage.setItem(store2.key_, JSON.stringify({qux: 56, baz: 78}));

      assert.deepEqual(store1.data, {default: true, foo: 12, bar: 34});
      assert.deepEqual(store2.data, {default: true, qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });

    it('returns the cached data if the store read errors', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1', {
        defaults: {default: true, foo: 1},
      });
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2', {
        defaults: {default: true, qux: 2},
      });

      localStorage.setItem('autotrack:UA-12345-1:ns1', 'bad data');

      assert.deepEqual(store1.data, {default: true, foo: 1});
      assert.deepEqual(store2.data, {default: true, qux: 2});

      store1.destroy();
      store2.destroy();
    });

    it('returns the cached data if localStorage is not supported', () => {
      sandbox.stub(Store, 'isSupported_').returns(false);

      const store1 = Store.getOrCreate('UA-12345-1', 'ns1', {
        defaults: {default: true, foo: 1},
      });
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2', {
        defaults: {default: true, qux: 2},
      });

      store1.update({bar: 3});
      store2.update({baz: 4});

      assert.deepEqual(store1.data, {default: true, foo: 1, bar: 3});
      assert.deepEqual(store2.data, {default: true, qux: 2, baz: 4});

      store1.destroy();
      store2.destroy();
    });
  });

  describe('update', () => {
    it('writes data to localStorage for the store key', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      store1.update({foo: 12, bar: 34});
      store2.update({qux: 56, baz: 78});

      assert.deepEqual(
          JSON.parse(localStorage.getItem('autotrack:UA-12345-1:ns1')),
          {foo: 12, bar: 34});
      assert.deepEqual(
          JSON.parse(localStorage.getItem('autotrack:UA-67890-1:ns2')),
          {qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });

    it('stores the updated data in the local cache to quicker reads', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      store1.update({foo: 12, bar: 34});
      store2.update({qux: 56, baz: 78});

      // `localStorage.setItem` can't be stubbed in some browsers.
      sandbox.spy(Store, 'get_');

      assert.deepEqual(store1.data, {foo: 12, bar: 34});
      assert.deepEqual(store2.data, {qux: 56, baz: 78});

      assert(Store.get_.notCalled);

      store1.destroy();
      store2.destroy();
    });

    it('updates the cache even if the localStorage write fails', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      // `localStorage.setItem` can't be stubbed in some browsers.
      sandbox.stub(Store, 'set_').throws();

      store1.update({foo: 12, bar: 34});
      store2.update({qux: 56, baz: 78});

      // No write should have happened.
      assert.strictEqual(
          localStorage.getItem('autotrack:UA-12345-1:ns1'), null);
      assert.strictEqual(
          localStorage.getItem('autotrack:UA-67890-1:ns2'), null);

      // `localStorage.getItem` can't be stubbed in some browsers.
      sandbox.spy(Store, 'get_');
      assert.deepEqual(store1.data, {foo: 12, bar: 34});
      assert.deepEqual(store2.data, {qux: 56, baz: 78});

      // The `.data getter`should read from cache.
      assert(Store.get_.notCalled);

      store1.destroy();
      store2.destroy();
    });

    it('handles cases where the new data is older than the old data', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2', {
        timestampKey: 'time',
      });

      store1.update({time: 1000, value: 'A'});
      store2.update({time: 1000, value: 'A'});

      assert.deepEqual(
          JSON.parse(localStorage.getItem('autotrack:UA-12345-1:ns1')),
          {time: 1000, value: 'A'});

      assert.deepEqual(
          JSON.parse(localStorage.getItem('autotrack:UA-67890-1:ns2')),
          {time: 1000, value: 'A'});

      store1.update({time: 999, value: 'B'});
      store2.update({time: 999, value: 'B'});

      assert.deepEqual(
          JSON.parse(localStorage.getItem('autotrack:UA-12345-1:ns1')),
          {time: 999, value: 'B'});

      // No data should have been written because the stored time is newer.
      assert.deepEqual(
          JSON.parse(localStorage.getItem('autotrack:UA-67890-1:ns2')),
          {time: 1000, value: 'A'});

      store1.destroy();
      store2.destroy();
    });

    it('updates the cache of other stores in other tabs', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      // Simulate a storage event, meaning a `set()` call was made in
      // another tab.
      dispatchStorageEvent({
        key: 'autotrack:UA-12345-1:ns1',
        oldValue: '',
        newValue: JSON.stringify({foo: 12, bar: 34}),
      });
      dispatchStorageEvent({
        key: 'autotrack:UA-67890-1:ns2',
        oldValue: '',
        newValue: JSON.stringify({qux: 56, baz: 78}),
      });

      // `localStorage.getItem` can't be stubbed in some browsers.
      sandbox.spy(Store, 'get_');

      assert.deepEqual(store1.data, {foo: 12, bar: 34});
      assert.deepEqual(store2.data, {qux: 56, baz: 78});

      assert(Store.get_.notCalled);

      store1.destroy();
      store2.destroy();
    });

    it('is not invoked when the storage event fires for other keys', () => {
      const store = Store.getOrCreate('UA-12345-1', 'ns1');

      sandbox.spy(store, 'update');

      // Simulate a storage event, meaning a `set()` call was made in
      // another tab.
      dispatchStorageEvent({
        key: 'other-key',
        oldValue: '',
        newValue: JSON.stringify({foo: 12, bar: 34}),
      });

      assert(store.update.notCalled);

      store.destroy();
    });
  });

  describe('clear', () => {
    it('removes the key from localStorage', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2', {
        defaults: {qux: 1},
      });

      store1.update({foo: 12, bar: 34});
      store2.update({qux: 56, baz: 78});

      assert.deepEqual(store1.data, {foo: 12, bar: 34});
      assert.deepEqual(store2.data, {qux: 56, baz: 78});

      store1.clear();
      store2.clear();

      assert.deepEqual(store1.data, {});
      assert.deepEqual(store2.data, {qux: 1});

      assert.strictEqual(
          localStorage.getItem('autotrack:UA-12345-1:ns1'), null);
      assert.strictEqual(
          localStorage.getItem('autotrack:UA-67890-1:ns2'), null);

      store1.destroy();
      store2.destroy();
    });

    it('clears the cache even if the localStorage clear fails', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2', {
        defaults: {qux: 1},
      });

      sandbox.stub(Store, 'clear_').throws();

      store1.update({foo: 12, bar: 34});
      store2.update({qux: 56, baz: 78});

      assert.deepEqual(store1.data, {foo: 12, bar: 34});
      assert.deepEqual(store2.data, {qux: 56, baz: 78});

      store1.clear();
      store2.clear();

      assert.deepEqual(store1.data, {});
      assert.deepEqual(store2.data, {qux: 1});

      store1.destroy();
      store2.destroy();
    });
  });

  describe('destroy', () => {
    it('releases the reference to the instance', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-12345-1', 'ns1');

      assert.strictEqual(store1, store2);

      store1.destroy();

      // store2 still has a reference, so this shouldn't create a new one
      const store3 = Store.getOrCreate('UA-12345-1', 'ns1');
      assert.strictEqual(store2, store3);

      store2.destroy();
      store3.destroy();

      // All the references should be released, so a new one should be created.
      const store4 = Store.getOrCreate('UA-12345-1', 'ns1');
      assert.notStrictEqual(store3, store4);

      store4.destroy();
    });

    it('clears the localStorage entry if no more references exist', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store3 = Store.getOrCreate('UA-67890-1', 'ns2');
      const store4 = Store.getOrCreate('UA-67890-1', 'ns2');

      assert.strictEqual(store1, store2);
      assert.strictEqual(store3, store4);

      store1.update({stuff: 1});
      store3.update({things: 2});

      assert.notStrictEqual(
          localStorage.getItem('autotrack:UA-12345-1:ns1'), null);

      assert.notStrictEqual(
          localStorage.getItem('autotrack:UA-67890-1:ns2'), null);

      // This shouldn't clear the stores since other references exist.
      store1.destroy();
      store3.destroy();

      assert.notStrictEqual(
          localStorage.getItem('autotrack:UA-12345-1:ns1'), null);

      assert.notStrictEqual(
          localStorage.getItem('autotrack:UA-67890-1:ns2'), null);

      // This *should* clear the stores because no other references exist.
      store2.destroy();
      store4.destroy();

      assert.strictEqual(
          localStorage.getItem('autotrack:UA-12345-1:ns1'), null);

      assert.strictEqual(
          localStorage.getItem('autotrack:UA-67890-1:ns2'), null);
    });

    it('removes the storage listener when all instances are destroyed', () => {
      sandbox.spy(window, 'addEventListener');
      sandbox.spy(window, 'removeEventListener');

      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      assert(window.addEventListener.calledOnce);
      const listener = window.addEventListener.firstCall.args[0];

      store1.destroy();
      assert(!window.removeEventListener.called);

      store2.destroy();
      assert(window.removeEventListener.calledOnce);
      assert(window.removeEventListener.alwaysCalledWith(listener));
    });
  });

  describe('[[events]]', () => {
    describe('externalSet', () => {
      it('is invoked when the stored data is updated in another tab', () => {
        const spy = sandbox.spy();
        const store = Store.getOrCreate('UA-12345-1', 'ns');

        store.on('externalSet', spy);

        dispatchStorageEvent({
          key: 'autotrack:UA-12345-1:ns',
          oldValue: JSON.stringify({data: 'foo'}),
          newValue: JSON.stringify({data: 'bar'}),
        });

        assert(spy.calledOnce);
        assert.deepEqual(spy.firstCall.args[0], {data: 'bar'});
        assert.deepEqual(spy.firstCall.args[1], {data: 'foo'});

        store.destroy();
      });
    });
  });
});
