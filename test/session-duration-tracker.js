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
var get = require('lodash/object/get');
var constants = require('../lib/constants');


var browserCaps;


describe('sessionDurationTracker', function() {

  before(function *() {
    browserCaps = (yield browser.session()).value;
  });


  it('should send an event when the page is being unloaded', function *() {

    if (notSupportedInBrowser()) return;

    var childFrame = (yield browser
        .url('/test/session-duration-tracker.html')
        .element('iframe')).value;

    return browser
        .frame(childFrame)
        .click('#outbound-link')
        .frame()
        .waitUntil(messagesDataMatches([
          ['count', 1],
          ['[0].count', 1],
          ['[0][0].eventCategory', 'Window'],
          ['[0][0].eventAction', 'unload'],
          ['[0][0].nonInteraction', true]
        ]));
  });


  it('should not send an event if the session has timed out', function *() {

    if (notSupportedInBrowser()) return;

    var childFrame = (yield browser
        .url('/test/session-duration-tracker-timeout.html')
        .element('iframe')).value;

    var messages = (yield browser
        .frame(childFrame)
        .execute(sendPageview)
        .pause(2000)
        .click('#outbound-link')
        .frame()
        .execute(getMessages)).value;

    assert.equal(messages[0].count, 1);
    assert.equal(messages[0][0].hitType, 'pageview');
  });


  it('should let other hits reset the session timeout', function *() {

    if (notSupportedInBrowser()) return;

    var childFrame = (yield browser
        .url('/test/session-duration-tracker-timeout.html')
        .element('iframe')).value;

    var messages = (yield browser
        .frame(childFrame)
        .pause(2000)
        .execute(sendPageview)
        .click('#outbound-link')
        .frame()
        .execute(getMessages)).value;

    assert.equal(messages[0].count, 2);
    assert.equal(messages[0][0].hitType, 'pageview');
    assert.equal(messages[0][1].hitType, 'event');
    assert.equal(messages[0][1].eventCategory, 'Window');
    assert.equal(messages[0][1].eventAction, 'unload');
    assert.equal(messages[0][1].nonInteraction, true);
  });


  it('should include the &did param with all hits', function() {

    return browser
        .url('/test/session-duration-tracker-frame.html')
        .execute(sendPageview)
        .waitUntil(hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});


function sendPageview() {
  ga('send', 'pageview');
}


function getHitData() {
  return hitData;
}


function hitDataMatches(expected) {
  return function() {
    return browser.execute(getHitData).then(function(hitData) {
      return expected.every(function(item) {
        return get(hitData.value, item[0]) === item[1];
      });
    });
  };
}


function getMessages() {
  return messages;
}


function messagesDataMatches(expected) {
  return function() {
    return browser.execute(getMessages).then(function(pageData) {
      return expected.every(function(item) {
        return get(pageData.value, item[0]) === item[1];
      });
    });
  };
}


function isEdge() {
  return browserCaps.browserName == 'MicrosoftEdge';
}


function notSupportedInBrowser() {
  // TODO(philipwalton): Some capabilities aren't implemented, so we can't test
  // against Edge right now. Wait for build 10532 to support frame
  // https://dev.windows.com/en-us/microsoft-edge/platform/status/webdriver/details/
  return isEdge();
}
