var assert = require('assert');
var get = require('lodash/object/get');
var constants = require('../lib/constants');


var browserCaps;


describe('sessionDurationTracker', function() {

  var childFrame;


  before(function *() {
    browserCaps = (yield browser.session()).value;
  });


  beforeEach(function *() {
    childFrame = (yield browser
        .url('/test/session-duration-tracker.html')
        .element('iframe')).value;
  });


  it('should send an event when the page is being unloaded', function() {

    if (notSupportedInBrowser()) return;

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


function getMessagesData() {
  return messages;
}


function messagesDataMatches(expected) {
  return function() {
    return browser.execute(getMessagesData).then(function(pageData) {
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
