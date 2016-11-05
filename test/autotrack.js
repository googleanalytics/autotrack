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
var ga = require('./analytics');


describe('autotrack', function() {
  this.retries(4);

  before(function() {
    browser.url('/test/autotrack.html');
  });

  afterEach(function() {
    browser.execute(ga.run, 'remove');
  });

  it('logs a deprecation error when requiring autotrack directly', function() {
    browser.execute(function() {
      if (!window.console) return;
      window.__consoleErrors__ = [];
      window.__originalConsoleError__ = window.console.error;
      window.console.error = function() {
        window.__consoleErrors__.push(arguments);
        window.__originalConsoleError__.apply(window.console, arguments);
      };
    });

    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.run, 'require', 'autotrack');

    var consoleErrors = browser.execute(function() {
      return window.__consoleErrors__;
    }).value;

    assert(consoleErrors.length, 1);
    assert(consoleErrors[0][0].indexOf('https://goo.gl/XsXPg5') > -1);
  });

});
