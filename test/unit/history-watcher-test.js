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
var dispatch = require('dom-utils/lib/dispatch');
var sinon = require('sinon');
var historyWatcher = require('../../lib/history-watcher');


var nativePushState = window.history.pushState;
var nativeReplaceState = window.history.replaceState;


describe('history', function() {
  var title = document.title;
  var path = location.pathname + location.search;
  afterEach(function() {
    window.history.replaceState({}, title, path);
  });

  describe('addListener', function() {
    it('adds a single listener to the history watcher', function() {
      var spy = sinon.spy();
      historyWatcher.addListener(spy);

      window.history.pushState({}, 'Foo', 'foo.html');
      assert(spy.calledOnce);

      historyWatcher.removeListener(spy);
    });

    it('supports adding multiple listeners to the history watcher', function() {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      var spy3 = sinon.spy();
      historyWatcher.addListener(spy1);
      historyWatcher.addListener(spy2);
      historyWatcher.addListener(spy3);

      window.history.pushState({}, 'Foo', 'foo.html');
      window.history.pushState({}, 'Bar', 'bar.html');
      assert(spy1.calledTwice);
      assert(spy2.calledTwice);
      assert(spy3.calledTwice);

      historyWatcher.removeListener(spy1);
      historyWatcher.removeListener(spy2);
      historyWatcher.removeListener(spy3);
    });

    it('indicates whether the history was updated or replaced', function() {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      historyWatcher.addListener(spy1);
      historyWatcher.addListener(spy2);

      window.history.pushState({}, 'Foo', 'foo.html');
      window.history.replaceState({}, 'Bar', 'bar.html');
      assert(spy1.calledTwice);
      assert(spy2.calledTwice);

      assert.strictEqual(spy1.firstCall.args[0], true);
      assert.strictEqual(spy2.firstCall.args[0], true);
      assert.strictEqual(spy1.secondCall.args[0], false);
      assert.strictEqual(spy2.secondCall.args[0], false);

      historyWatcher.removeListener(spy1);
      historyWatcher.removeListener(spy2);
    });

    it('invokes listeners on popstate', function() {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      historyWatcher.addListener(spy1);
      historyWatcher.addListener(spy2);

      window.history.pushState({}, 'Foo', 'foo.html');
      dispatch(window, 'popstate');

      assert(spy1.calledTwice);
      assert(spy2.calledTwice);

      historyWatcher.removeListener(spy1);
      historyWatcher.removeListener(spy2);
    });
  });

  describe('removeListener', function() {
    it('removes a listener from the history watcher', function() {
      var spy = sinon.spy();
      historyWatcher.addListener(spy);

      window.history.pushState({}, 'Foo', 'foo.html');
      assert(spy.calledOnce);

      historyWatcher.removeListener(spy);

      window.history.pushState({}, 'Bar', 'bar.html');
      assert(spy.calledOnce);

    });

    it('unwraps history methods if all listeners are removed', function() {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      var spy3 = sinon.spy();
      historyWatcher.addListener(spy1);
      historyWatcher.addListener(spy2);
      historyWatcher.addListener(spy3);

      window.history.pushState({}, 'Foo', 'foo.html');
      window.history.replaceState({}, 'Bar', 'bar.html');
      dispatch(window, 'popstate');
      assert.strictEqual(spy1.callCount, 3);
      assert.strictEqual(spy2.callCount, 3);
      assert.strictEqual(spy3.callCount, 3);

      historyWatcher.removeListener(spy1);
      historyWatcher.removeListener(spy2);
      window.history.pushState({}, 'Qux', 'qux.html');
      dispatch(window, 'popstate');

      assert.strictEqual(spy1.callCount, 3);
      assert.strictEqual(spy2.callCount, 3);
      assert.strictEqual(spy3.callCount, 5);

      assert.notEqual(window.history.pushState, nativePushState);
      assert.notEqual(window.history.replaceState, nativeReplaceState);

      historyWatcher.removeListener(spy3);

      assert.equal(window.history.pushState, nativePushState);
      assert.equal(window.history.replaceState, nativeReplaceState);
    });
  });
});
