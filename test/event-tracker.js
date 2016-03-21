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
var constants = require('../lib/constants');


describe('eventTracker', function() {

  before(function() {
    return browser.url('/test/event-tracker.html')
  });

  beforeEach(function() {
    return browser
        .execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto')
        .execute(ga.trackHitData)
  })

  afterEach(function () {
    return browser
        .execute(ga.clearHitData)
        .execute(ga.run, 'eventTracker:remove')
        .execute(ga.run, 'remove');
  });

  it('should support declarative event binding to DOM elements', function *() {

    var hitData = (yield browser
        .execute(ga.run, 'require', 'eventTracker')
        .click('#event-button')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'foo');
    assert.equal(hitData[0].eventAction, 'bar');
    assert.equal(hitData[0].eventLabel, 'qux');
    assert.equal(hitData[0].eventValue, '42');
  });


  it('should support only specifying some of the event fields', function *() {

    var hitData = (yield browser
        .execute(ga.run, 'require', 'eventTracker')
        .click('#event-button-some-fields')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'foo');
    assert.equal(hitData[0].eventAction, 'bar');
    assert.equal(hitData[0].eventLabel, 'qux');
    assert.equal(hitData[0].eventValue, undefined);
  });


  it('should not capture clicks without the category and action fields',
      function *() {

    var hitData = (yield browser
        .execute(ga.run, 'require', 'eventTracker')
        .click('#event-button-missing-fields')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should support customizing the attribute prefix', function *() {

    var hitData = (yield browser
        .execute(ga.run, 'require', 'eventTracker', {attributePrefix: ''})
        .click('#event-button-custom-prefix')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'foo');
    assert.equal(hitData[0].eventAction, 'bar');
    assert.equal(hitData[0].eventLabel, 'qux');
    assert.equal(hitData[0].eventValue, 42);
  });


  it('should include the &did param with all hits', function() {

    return browser
        .execute(ga.run, 'require', 'eventTracker')
        .execute(ga.run, 'send', 'pageview')
        .waitUntil(ga.hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});
