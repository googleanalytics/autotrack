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
    event = document.createEvent('StorageEvent');
    event.initEvent('storage');
    Object.defineProperties(event, {
      key: {value: key},
      newValue: {value: newValue},
      oldValue: {value: oldValue},
    });
  }
  window.dispatchEvent(event);
};


describe('Store', () => {
  beforeEach(() => {
    sandbox.restore();
    localStorage.clear();
  });
  afterEach(() => {
    sandbox.restore();
    localStorage.clear();
  });

  describe('static getOrCreate', () => {
    it('creates a localStorage key from the tracking ID and namespace', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      assert.strictEqual(store1.key_, 'autotrack:UA-12345-1:ns1');

      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');
      assert.strictEqual(store2.key_, 'autotrack:UA-67890-1:ns2');

      store1.destroy();
      store2.destroy();
    });

    it('does not create multiple instances for the same key', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');
      const store3 = Store.getOrCreate('UA-12345-1', 'ns1');

      assert.strictEqual(store1, store3);
      assert.notStrictEqual(store1, store2);

      store1.destroy();
      store2.destroy();
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

  describe('get', () => {
    it('reads data from localStorage for the store key', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      localStorage.setItem(store1.key_, JSON.stringify({foo: 12, bar: 34}));
      localStorage.setItem(store2.key_, JSON.stringify({qux: 56, baz: 78}));

      assert.deepEqual(store1.get(), {foo: 12, bar: 34});
      assert.deepEqual(store2.get(), {qux: 56, baz: 78});

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

      assert.deepEqual(store1.get(), {default: true, foo: 12, bar: 34});
      assert.deepEqual(store2.get(), {default: true, qux: 56, baz: 78});

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

      localStorage.setItem(store1.key_, 'bad data');

      assert.deepEqual(store1.get(), {default: true, foo: 1});
      assert.deepEqual(store2.get(), {default: true, qux: 2});

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

      store1.set({bar: 3});
      store2.set({baz: 4});

      assert.deepEqual(store1.get(), {default: true, foo: 1, bar: 3});
      assert.deepEqual(store2.get(), {default: true, qux: 2, baz: 4});

      store1.destroy();
      store2.destroy();
    });
  });

  describe('set', () => {
    it('writes data to localStorage for the store key', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      store1.set({foo: 12, bar: 34});
      store2.set({qux: 56, baz: 78});

      assert.deepEqual(
          JSON.parse(localStorage.getItem(store1.key_)),
          {foo: 12, bar: 34});
      assert.deepEqual(
          JSON.parse(localStorage.getItem(store2.key_)),
          {qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });

    it('stores the updated data in the local cache', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      store1.set({foo: 12, bar: 34});
      store2.set({qux: 56, baz: 78});

      assert.deepEqual(store1.cache_, {foo: 12, bar: 34});
      assert.deepEqual(store2.cache_, {qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });

    it('updates the cache even if the localStorage write fails', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      sandbox.stub(Store, 'set_').throws();
      store1.set({foo: 12, bar: 34});
      store2.set({qux: 56, baz: 78});

      assert.deepEqual(store1.cache_, {foo: 12, bar: 34});
      assert.deepEqual(store2.cache_, {qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });

    it('handles cases where the new data is older than the old data', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2', {
        timestampKey: 'time',
      });

      store1.set({time: 1000, value: 'A'});
      store2.set({time: 1000, value: 'A'});

      assert.deepEqual(store1.cache_, {time: 1000, value: 'A'});
      assert.deepEqual(store2.cache_, {time: 1000, value: 'A'});

      store1.set({time: 999, value: 'B'});
      store2.set({time: 999, value: 'B'});

      assert.deepEqual(store1.cache_, {time: 999, value: 'B'});

      // No data should have been written because the stored time is newer.
      assert.deepEqual(store2.cache_, {time: 1000, value: 'A'});

      store1.destroy();
      store2.destroy();
    });

    it('updates the cache of other stores in other tabs', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      // Simulate a storage event, meaning a `set()` call was made in
      // another tab.
      dispatchStorageEvent({
        key: store1.key_,
        oldValue: '',
        newValue: JSON.stringify({foo: 12, bar: 34}),
      });
      dispatchStorageEvent({
        key: store2.key_,
        oldValue: '',
        newValue: JSON.stringify({qux: 56, baz: 78}),
      });

      assert.deepEqual(store1.cache_, {foo: 12, bar: 34});
      assert.deepEqual(store2.cache_, {qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });
  });

  describe('clear', () => {
    it('removes the key from localStorage', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      store1.set({foo: 12, bar: 34});
      store2.set({qux: 56, baz: 78});

      assert.deepEqual(store1.get(), {foo: 12, bar: 34});
      assert.deepEqual(store2.get(), {qux: 56, baz: 78});

      store1.clear();
      store2.clear();

      assert.deepEqual(store1.get(), {});
      assert.deepEqual(store2.get(), {});
      assert.strictEqual(localStorage.getItem(store1.key_), null);
      assert.strictEqual(localStorage.getItem(store2.key_), null);

      store1.destroy();
      store2.destroy();
    });

    it('clears the cache even if the localStorage clear fails', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-67890-1', 'ns2');
      sandbox.stub(Store, 'clear_').throws();

      store1.set({foo: 12, bar: 34});
      store2.set({qux: 56, baz: 78});

      assert.deepEqual(store1.get(), {foo: 12, bar: 34});
      assert.deepEqual(store2.get(), {qux: 56, baz: 78});

      store1.clear();
      store2.clear();

      assert.deepEqual(store1.get(), {});
      assert.deepEqual(store2.get(), {});

      store1.destroy();
      store2.destroy();
    });
  });

  describe('destroy', () => {
    it('removes the instance from the global store', () => {
      const store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      const store2 = Store.getOrCreate('UA-12345-1', 'ns1');

      assert.strictEqual(store1, store2);

      store1.destroy();
      store2.destroy();

      const store3 = Store.getOrCreate('UA-12345-1', 'ns1');
      assert.notStrictEqual(store3, store1);
      assert.notStrictEqual(store3, store2);

      store3.destroy();
    });

    it('removes the storage listener when the last instance is destroyed',
        () => {
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
