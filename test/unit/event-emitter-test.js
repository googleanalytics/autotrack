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


import EventEmitter from '../../lib/event-emitter';


describe('EventEmitter', () => {
  describe('constructor', () => {
    it('creates an internal registry for events', () => {
      const emitter = new EventEmitter();

      assert.deepEqual(emitter.registry_, {});
    });
  });

  describe('on', () => {
    it('adds a handler to the event registry', () => {
      const emitter = new EventEmitter();
      const spy = sinon.spy();
      emitter.on('foo', spy);

      assert.deepEqual(emitter.registry_.foo, [spy]);
    });

    it('supports multiple handlers and event types', () => {
      const emitter = new EventEmitter();
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();
      emitter.on('foo', spy1);
      emitter.on('foo', spy2);
      emitter.on('bar', spy1);
      emitter.on('bar', spy3);

      assert.deepEqual(emitter.registry_.foo, [spy1, spy2]);
      assert.deepEqual(emitter.registry_.bar, [spy1, spy3]);
    });
  });

  describe('off', () => {
    it('removes a handler from the event registry', () => {
      const emitter = new EventEmitter();
      const spy = sinon.spy();
      emitter.on('foo', spy);
      assert.deepEqual(emitter.registry_.foo, [spy]);

      emitter.off('foo', spy);
      assert.deepEqual(emitter.registry_.foo, []);
    });

    it('supports multiple handlers and event types', () => {
      const emitter = new EventEmitter();
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();
      emitter.on('foo', spy1);
      emitter.on('foo', spy2);
      emitter.on('bar', spy1);
      emitter.on('bar', spy3);
      assert.deepEqual(emitter.registry_.foo, [spy1, spy2]);
      assert.deepEqual(emitter.registry_.bar, [spy1, spy3]);

      emitter.off('foo', spy1);
      emitter.off('bar', spy3);
      assert.deepEqual(emitter.registry_.foo, [spy2]);
      assert.deepEqual(emitter.registry_.bar, [spy1]);

      emitter.off('foo', spy2);
      emitter.off('bar', spy1);
      assert.deepEqual(emitter.registry_.foo, []);
      assert.deepEqual(emitter.registry_.bar, []);
    });

    it('supports removing all handlers from all events', () => {
      const emitter = new EventEmitter();
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();
      emitter.on('foo', spy1);
      emitter.on('foo', spy2);
      emitter.on('bar', spy1);
      emitter.on('bar', spy3);
      assert.deepEqual(emitter.registry_.foo, [spy1, spy2]);
      assert.deepEqual(emitter.registry_.bar, [spy1, spy3]);

      emitter.off();
      assert.deepEqual(emitter.registry_, {});
    });
  });

  describe('emit', () => {
    it('invokes all handlers registered with the passed event name', () => {
      const emitter = new EventEmitter();
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      const spy3 = sinon.spy();
      emitter.on('foo', spy1);
      emitter.on('foo', spy2);
      emitter.on('bar', spy1);
      emitter.on('bar', spy3);

      emitter.emit('foo');
      emitter.emit('bar');

      assert(spy1.calledTwice);
      assert(spy2.calledOnce);
      assert(spy3.calledOnce);
    });
  });
});
