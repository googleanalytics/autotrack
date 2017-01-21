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
import Store from '../../lib/store';


describe('Store', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  afterEach(function() {
    localStorage.clear();
  });

  describe('constuctor', function() {
    it('creates a localStorage key from the tracking ID and namespace',
        function() {
      var store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      assert.strictEqual(store1.key, 'autotrack:UA-12345-1:ns1');

      var store2 = Store.getOrCreate('UA-67890-1', 'ns2', {default: true});
      assert.strictEqual(store2.key, 'autotrack:UA-67890-1:ns2');

      store1.destroy();
      store2.destroy();
    });

    it('does not create multiple instances for the same key', function() {
      var store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      var store2 = Store.getOrCreate('UA-67890-1', 'ns2');
      var store3 = Store.getOrCreate('UA-12345-1', 'ns1');

      assert.strictEqual(store1, store3);
      assert.notStrictEqual(store1, store2);

      store1.destroy();
      store2.destroy();
    });

    it('stores the optional defaults object on the instance', function() {
      var store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      assert.deepEqual(store1.defaults, {});

      var store2 = Store.getOrCreate('UA-67890-1', 'ns2', {default: true});
      assert.deepEqual(store2.defaults, {default: true});

      store1.destroy();
      store2.destroy();
    });

    it('adds a single event listener for the storage event', function() {
      sinon.spy(window, 'addEventListener');

      var store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      var store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      assert(window.addEventListener.calledOnce);

      store1.destroy();
      store2.destroy();

      window.addEventListener.restore();
    });
  });

  describe('get', function() {
    it('reads data from localStorage for the store key', function() {
      var store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      var store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      localStorage.setItem(store1.key, JSON.stringify({foo: 12, bar: 34}));
      localStorage.setItem(store2.key, JSON.stringify({qux: 56, baz: 78}));

      assert.deepEqual(store1.get(), {foo: 12, bar: 34});
      assert.deepEqual(store2.get(), {qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });

    it('returns the default data if the store is missing or corrupted',
        function() {
      var store1 = Store.getOrCreate('UA-12345-1', 'ns1', {default: true, foo: 1});
      var store2 = Store.getOrCreate('UA-67890-1', 'ns2', {default: true, qux: 2});

      localStorage.setItem(store1.key, 'bad data');

      assert.deepEqual(store1.get(), {default: true, foo: 1});
      assert.deepEqual(store2.get(), {default: true, qux: 2});

      store1.destroy();
      store2.destroy();
    });

    it('merges the stored data with the defaults', function() {
      var store1 = Store.getOrCreate('UA-12345-1', 'ns1', {default: true, foo: 1});
      var store2 = Store.getOrCreate('UA-67890-1', 'ns2', {default: true, qux: 2});

      localStorage.setItem(store1.key, JSON.stringify({foo: 12, bar: 34}));
      localStorage.setItem(store2.key, JSON.stringify({qux: 56, baz: 78}));

      assert.deepEqual(store1.get(), {default: true, foo: 12, bar: 34});
      assert.deepEqual(store2.get(), {default: true, qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });
  });

  describe('set', function() {
    it('writes data to localStorage for store key', function() {
      var store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      var store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      store1.set({foo: 12, bar: 34});
      store2.set({qux: 56, baz: 78});

      assert.deepEqual(store1.get(), {foo: 12, bar: 34});
      assert.deepEqual(store2.get(), {qux: 56, baz: 78});

      store1.destroy();
      store2.destroy();
    });
  });

  describe('clear', function() {
    it('removes the key from localStorage', function() {
      var store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      var store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      store1.set({foo: 12, bar: 34});
      store2.set({qux: 56, baz: 78});

      assert.deepEqual(store1.get(), {foo: 12, bar: 34});
      assert.deepEqual(store2.get(), {qux: 56, baz: 78});

      store1.clear();
      store2.clear();

      assert.deepEqual(store1.get(), {});
      assert.deepEqual(store2.get(), {});
      assert.strictEqual(localStorage.getItem(store1.key), null);
      assert.strictEqual(localStorage.getItem(store2.key), null);

      store1.destroy();
      store2.destroy();
    });
  });

  describe('destroy', function() {
    it('removes the instance from the global store', function() {
      var store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      var store2 = Store.getOrCreate('UA-12345-1', 'ns1');

      assert.strictEqual(store1, store2);

      store1.destroy();
      store2.destroy();

      var store3 = Store.getOrCreate('UA-12345-1', 'ns1');
      assert.notStrictEqual(store3, store1);
      assert.notStrictEqual(store3, store2);

      store3.destroy();
    });

    it('removes the storage listener when the last instance is destroyed',
        function() {
      sinon.spy(window, 'addEventListener');
      sinon.spy(window, 'removeEventListener');

      var store1 = Store.getOrCreate('UA-12345-1', 'ns1');
      var store2 = Store.getOrCreate('UA-67890-1', 'ns2');

      assert(window.addEventListener.calledOnce);
      var listener = window.addEventListener.firstCall.args[0];

      store1.destroy();
      assert(!window.removeEventListener.called);

      store2.destroy();
      assert(window.removeEventListener.calledOnce);
      assert(window.removeEventListener.alwaysCalledWith(listener));

      window.addEventListener.restore();
      window.removeEventListener.restore();
    });
  });
});
