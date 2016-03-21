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


var browserCaps;


describe('socialTracker', function() {

  before(function *() {
    browserCaps = (yield browser.session()).value;

    yield browser.url('/test/social-tracker.html');
  });


  beforeEach(function() {
    return browser
        .execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto')
        .execute(ga.trackHitData);
  });


  afterEach(function () {
    return browser
        .execute(ga.clearHitData)
        .execute(ga.run, 'socialTracker:remove')
        .execute(ga.run, 'remove');
  });


  it('should support declarative event binding to DOM elements', function *() {

    var hitData = (yield browser
        .execute(ga.run, 'require', 'socialTracker')
        .click('#social-button')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 1);
    assert.equal(hitData[0].socialNetwork, 'Twitter');
    assert.equal(hitData[0].socialAction, 'tweet');
    assert.equal(hitData[0].socialTarget, 'foo');
  });

  it('should not capture clicks without the network, action, and target fields',
      function *() {

    var hitData = (yield browser
        .execute(ga.run, 'require', 'socialTracker')
        .click('#social-button-missing-fields')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 0);
  });


  it('should support customizing the attribute prefix', function *() {

    var hitData = (yield browser
        .execute(ga.run, 'require', 'socialTracker', {attributePrefix: ''})
        .click('#social-button-custom-prefix')
        .execute(ga.getHitData))
        .value;

    assert.equal(hitData.length, 1);
    assert.equal(hitData[0].socialNetwork, 'Twitter');
    assert.equal(hitData[0].socialAction, 'tweet');
    assert.equal(hitData[0].socialTarget, 'foo');
  });


  it('should support tweets and follows from the official twitter widgets',
      function *() {

    if (notSupportedInBrowser()) return;

    yield browser.execute(ga.run, 'require', 'socialTracker')

    var tweetFrame = (yield browser
        .waitForVisible('iframe.twitter-share-button')
        .element('iframe.twitter-share-button')).value;

    var followFrame = (yield browser
        .waitForVisible('iframe.twitter-follow-button')
        .element('iframe.twitter-follow-button')).value;

    yield browser
        .frame(tweetFrame)
        .click('a')
        .frame()
        .frame(followFrame)
        .click('a')
        .frame()
        .waitUntil(ga.hitDataMatches([
          ['[0].socialNetwork', 'Twitter'],
          ['[0].socialAction', 'tweet'],
          ['[0].socialTarget', 'http://example.com'],
          ['[1].socialNetwork', 'Twitter'],
          ['[1].socialAction', 'follow'],
          ['[1].socialTarget', 'twitter']
        ]));
  });


  // TODO(philipwalton): figure out why this doesn't work...
  // it('should support likes from the official facebook widget', function *() {

  //   var mainWindow = (yield browser
  //       .url('/test/social-tracker-widgets.html')
  //       .windowHandle()).value;

  //   var likeFrame = (yield browser
  //       .waitForVisible('.fb-like iframe')
  //       .element('.fb-like iframe')).value;

  //   yield browser
  //       .frame(likeFrame)
  //       .click('form .pluginButtonLabel')
  //       .debug();
  // });


  it('should include the &did param with all hits', function() {

    return browser
        .execute(ga.run, 'require', 'socialTracker')
        .execute(ga.run, 'send', 'pageview')
        .waitUntil(ga.hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });


});


function isEdge() {
  return browserCaps.browserName == 'MicrosoftEdge';
}


function isIE() {
  return browserCaps.browserName == 'internet explorer';
}


function notSupportedInBrowser() {
  // TODO(philipwalton): IE and Edge are flaky with the tweet button test,
  // though they work when manually testing.
  return isEdge() || isIE();
}
