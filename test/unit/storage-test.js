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
var storage = require('../../lib/storage');


var AUTOTRACK_LOCAL_STORAGE_KEY = 'autotrack';


describe('storage', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  afterEach(function() {
    localStorage.clear();
  });

  describe('get', function() {
    it('reads data from localStorage for the passed tracking ID', function() {
      localStorage.setItem(AUTOTRACK_LOCAL_STORAGE_KEY, JSON.stringify({
        properties: {
          'UA-12345-1': {foo: 123},
          'UA-67890-1': {bar: 456},
        }
      }));

      assert.deepEqual(storage.get('UA-12345-1'), {foo: 123});
      assert.deepEqual(storage.get('UA-67890-1'), {bar: 456});
    });

    it('returns an empty object if no property data is set', function() {
      assert.deepEqual(storage.get('UA-NOT-SET'), {});
    });

    it('accepts an optional namespace', function() {
      localStorage.setItem(AUTOTRACK_LOCAL_STORAGE_KEY, JSON.stringify({
        properties: {
          'UA-12345-1': {
            'foo': 123,
            'bar': 456,
            'ns:qux': 'QUX',
            'ns:baz': 'BAZ',
          },
        }
      }));

      assert.deepEqual(storage.get('UA-12345-1', 'ns'), {
        qux: 'QUX',
        baz: 'BAZ',
      });
    });

    it('returns an empty object if no namespace items are found', function() {
      localStorage.setItem(AUTOTRACK_LOCAL_STORAGE_KEY, JSON.stringify({
        properties: {
          'UA-12345-1': {
            'foo': 123,
            'bar': 456,
            'ns:qux': 'QUX',
            'ns:baz': 'BAZ',
          },
        }
      }));

      assert.deepEqual(storage.get('UA-12345-1', 'noNS'), {});
    });

    it('does not error if localStorage is not supported', function() {
      var ls = window.localStorage;
      delete window.localStorage;

      assert.doesNotThrow(function() {
        storage.get('UA-12345-1');
        storage.get('UA-12345-1', 'ns');
      });

      window.localStorage = ls;
    });

  });

  describe('set', function() {
    it('writes data to localStorage for the passed tracking ID', function() {
      storage.set('UA-12345-1', {foo: 123});
      storage.set('UA-67890-1', {bar: 456});

      assert.deepEqual(storage.get('UA-12345-1'), {foo: 123});
      assert.deepEqual(storage.get('UA-67890-1'), {bar: 456});
    });

    it('accepts an optional namespace to return', function() {
      storage.set('UA-12345-1', 'ns', {foo: 123, bar: 456});

      assert.deepEqual(storage.get('UA-12345-1', 'ns'), {
        foo: 123,
        bar: 456
      });
      assert.deepEqual(storage.get('UA-12345-1'), {
        'ns:foo': 123,
        'ns:bar': 456
      });
    });

    it('does not error if localStorage is not supported', function() {
      var ls = window.localStorage;
      delete window.localStorage;

      assert.doesNotThrow(function() {
        storage.set('UA-12345-1', {foo: 123});
      });

      window.localStorage = ls;
    });
  });

  describe('clear', function() {
    it('clear all data for the passed tracking ID', function() {
      storage.set('UA-12345-1', {
        'foo': 123,
        'ns:bar': 456,
        'ns:qux': 789,
      });

      storage.clear('UA-12345-1');

      assert.deepEqual(storage.get('UA-12345-1'), {});
    });

    it('clears an optional namespace for the passed tracking ID', function() {
      storage.set('UA-12345-1', {
        'foo': 123,
        'ns:bar': 456,
        'ns:qux': 789,
      });

      storage.clear('UA-12345-1', 'ns');

      assert.deepEqual(storage.get('UA-12345-1'), {foo: 123});
    });

    it('does not error if localStorage is not supported', function() {
      var ls = window.localStorage;
      delete window.localStorage;

      assert.doesNotThrow(function() {
        storage.clear('UA-12345-1');
        storage.clear('UA-12345-1', 'ns');
      });

      window.localStorage = ls;
    });
  });

  describe('bindAccessors', function() {
    it('binds methods to the tracking ID and namespace', function() {
      var bound = storage.bindAccessors('UA-12345-1', 'ns');
      storage.set('UA-12345-1', {'foo': 123});

      bound.set({
        bar: 456,
        qux: 789,
      });
      assert.deepEqual(storage.get('UA-12345-1'), {
        'foo': 123,
        'ns:bar': 456,
        'ns:qux': 789,
      });

      assert.deepEqual(bound.get(), {
        bar: 456,
        qux: 789,
      });

      bound.clear();
      assert.deepEqual(storage.get('UA-12345-1'), {foo: 123});
    });

    it('does not error if localStorage is not supported', function() {
      var ls = window.localStorage;
      delete window.localStorage;

      assert.doesNotThrow(function() {
        var bound = storage.bindAccessors('UA-12345-1', 'ns');
        bound.set({foo: 123});
        bound.get();
        bound.clear('ns');
      });

      window.localStorage = ls;
    });
  });
});
