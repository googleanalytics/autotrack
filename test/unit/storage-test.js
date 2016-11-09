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
          'UA-12345-1': {foo: 12345},
          'UA-67890-1': {bar: 67890},
        }
      }));

      assert.strictEqual(storage.get('UA-12345-1', 'foo'), 12345);
      assert.strictEqual(storage.get('UA-67890-1', 'bar'), 67890);
    });

    it('optionally reads data from a source string', function() {
      var event = {
        newValue: JSON.stringify({
          properties: {
            'UA-12345-1': {foo: 12345},
            'UA-67890-1': {bar: 67890},
          }
        })
      };

      assert.strictEqual(
          storage.get('UA-12345-1', 'foo', event.newValue), 12345);

      assert.strictEqual(
          storage.get('UA-67890-1', 'bar', event.newValue), 67890);
    });

    it('returns undefined if no property data is set', function() {
      assert.strictEqual(storage.get('UA-NOT-SET', 'foo'), undefined);
    });

    it('does not error if localStorage is not supported', function() {
      var ls = window.localStorage;
      delete window.localStorage;

      assert.doesNotThrow(function() {
        storage.get('UA-12345-1', 'foo');
      });

      window.localStorage = ls;
    });

    it('does not error if given an unparseable source string', function() {
      assert.doesNotThrow(function() {
        storage.get('UA-12345-1', 'foo', 'unparseable');
      });
    });
  });

  describe('set', function() {
    it('writes data to localStorage for the passed tracking ID', function() {
      storage.set('UA-12345-1', {foo: 12345});
      storage.set('UA-67890-1', {bar: 67890});

      assert.strictEqual(storage.get('UA-12345-1', 'foo'), 12345);
      assert.strictEqual(storage.get('UA-67890-1', 'bar'), 67890);
    });

    it('does not error if localStorage is not supported', function() {
      var ls = window.localStorage;
      delete window.localStorage;

      assert.doesNotThrow(function() {
        storage.set('UA-12345-1', {foo: 12345});
      });

      window.localStorage = ls;
    });
  });
});
