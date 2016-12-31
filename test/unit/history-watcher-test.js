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
import dispatch from 'dom-utils/lib/dispatch';
import sinon from 'sinon';
import EventEmitter from '../../lib/event-emitter';
import getHistoryWatcher, {HistoryWatcher} from '../../lib/history-watcher';


const nativePushState = window.history.pushState;
const nativeReplaceState = window.history.replaceState;


describe('HistoryWatcher', () => {
  const title = document.title;
  const path = location.pathname + location.search;

  afterEach(() => {
    window.history.replaceState({}, title, path);
  });

  it('extends the EventEmitter class', () => {
    const historyWatcher = new HistoryWatcher();

    assert(historyWatcher instanceof EventEmitter);

    historyWatcher.destroy();
  });

  it('invokes handlers after the history changes via pushState', () => {
    const historyWatcher = new HistoryWatcher();

    const spy1 = sinon.spy();
    const spy2 = sinon.spy();
    const spy3 = sinon.spy();
    historyWatcher.on('pushstate', spy1);
    historyWatcher.on('pushstate', spy2);
    historyWatcher.on('pushstate', spy3);

    window.history.pushState({}, 'Foo', 'foo.html');
    window.history.pushState({}, 'Bar', 'bar.html');
    assert(spy1.calledTwice);
    assert(spy2.calledTwice);
    assert(spy3.calledTwice);

    assert.deepEqual(spy1.firstCall.args, [{}, 'Foo', 'foo.html']);
    assert.deepEqual(spy1.secondCall.args, [{}, 'Bar', 'bar.html']);
    assert.deepEqual(spy2.firstCall.args, [{}, 'Foo', 'foo.html']);
    assert.deepEqual(spy2.secondCall.args, [{}, 'Bar', 'bar.html']);
    assert.deepEqual(spy3.firstCall.args, [{}, 'Foo', 'foo.html']);
    assert.deepEqual(spy3.secondCall.args, [{}, 'Bar', 'bar.html']);

    historyWatcher.destroy();
  });

  it('invokes handlers after the history changes via replaceState', () => {
    const historyWatcher = new HistoryWatcher();

    const spy1 = sinon.spy();
    const spy2 = sinon.spy();
    const spy3 = sinon.spy();
    historyWatcher.on('replacestate', spy1);
    historyWatcher.on('replacestate', spy2);
    historyWatcher.on('replacestate', spy3);

    window.history.replaceState({}, 'Foo', 'foo.html');
    window.history.replaceState({}, 'Bar', 'bar.html');
    assert(spy1.calledTwice);
    assert(spy2.calledTwice);
    assert(spy3.calledTwice);

    assert.deepEqual(spy1.firstCall.args, [{}, 'Foo', 'foo.html']);
    assert.deepEqual(spy1.secondCall.args, [{}, 'Bar', 'bar.html']);
    assert.deepEqual(spy2.firstCall.args, [{}, 'Foo', 'foo.html']);
    assert.deepEqual(spy2.secondCall.args, [{}, 'Bar', 'bar.html']);
    assert.deepEqual(spy3.firstCall.args, [{}, 'Foo', 'foo.html']);
    assert.deepEqual(spy3.secondCall.args, [{}, 'Bar', 'bar.html']);

    historyWatcher.destroy();
  });

  it('invokes handlers after the history changes via popstate', () => {
    const historyWatcher = new HistoryWatcher();
    const spy1 = sinon.spy();
    const spy2 = sinon.spy();
    historyWatcher.on('popstate', spy1);
    historyWatcher.on('popstate', spy2);
    dispatch(window, 'popstate');

    assert(spy1.calledOnce);
    assert(spy2.calledOnce);

    historyWatcher.destroy();
  });

  it('invokes handlers after running the native methods', () => {
    const historyWatcher = new HistoryWatcher();
    const handler1 = () => assert(location.href.indexOf('foo.html') > -1);
    const handler2 = () => assert(location.href.indexOf('bar.html') > -1);

    historyWatcher.on('pushstate', handler1);
    historyWatcher.on('replacestate', handler2);

    window.history.pushState({}, 'Foo', 'foo.html');
    window.history.replaceState({}, 'Bar', 'bar.html');

    historyWatcher.destroy();
  });


  describe('constructor', () => {
    it('overrides the native push and replace state methods', () => {
      assert.equal(window.history.pushState, nativePushState);
      assert.equal(window.history.replaceState, nativeReplaceState);

      const historyWatcher = new HistoryWatcher();

      assert.equal(
          window.history.pushState,
          historyWatcher.handlePushState_);
      assert.equal(
          window.history.replaceState,
          historyWatcher.handleReplaceState_);

      historyWatcher.destroy();
    });
  });

  describe('destroy', () => {
    it('removes all handlers and restores native methods', () => {
      const historyWatcher = new HistoryWatcher();
      assert.notEqual(window.history.pushState, nativePushState);
      assert.notEqual(window.history.replaceState, nativeReplaceState);

      const spy = sinon.spy();
      historyWatcher.on('pushstate', spy);

      window.history.pushState({}, 'Foo', 'foo.html');
      assert(spy.calledOnce);

      historyWatcher.destroy();

      window.history.pushState({}, 'Bar', 'bar.html');
      assert(spy.calledOnce);

      assert.equal(window.history.pushState, nativePushState);
      assert.equal(window.history.replaceState, nativeReplaceState);
    });
  });
});


describe('getHistoryWatcher', () => {
  it('returns a singleton HistoryWatcher instance', () => {
    assert.strictEqual(getHistoryWatcher(), getHistoryWatcher());
    getHistoryWatcher().destroy();
  });
});
