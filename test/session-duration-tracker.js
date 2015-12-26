var assert = require('assert');
var get = require('lodash/object/get');


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
        .execute(stubBeacon)
        .click('#outbound-link')
        .frame()
        .waitUntil(pageDataMatches([
          ['count', 1],
          ['[0].count', 1],
          ['[0][0].eventCategory', 'Window'],
          ['[0][0].eventAction', 'unload'],
          ['[0][0].nonInteraction', true]
        ]));
  });



  it('should send the event sync when beacon is not supported', function() {

    if (notSupportedInBrowser()) return;
    if (noSyncCorsXhr()) return;

    return browser
        .frame(childFrame)
        .execute(stubNoBeacon)
        .click('#outbound-link')
        .frame()
        .waitUntil(pageDataMatches([
          ['[0].url', 'https://www.google-analytics.com/collect'],
          ['[0].async', false],
          ['[1].eventCategory', 'Window'],
          ['[1].eventAction', 'unload'],
          ['[1].nonInteraction', true]
        ]));
  });

});


function stubBeacon() {
  navigator.sendBeacon = function() {
    return true;
  };
}


function stubNoBeacon() {
  navigator.sendBeacon = undefined;
}


function getPageData() {
  return messages;
}


function pageDataMatches(expected) {
  return function() {
    return browser.execute(getPageData).then(function(pageData) {
      return expected.every(function(item) {
        return get(pageData.value, item[0]) === item[1];
      });
    });
  };
}


function isIE9() {
  return browserCaps.browserName == 'internet explorer' &&
         browserCaps.version == '9';
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


function noSyncCorsXhr() {
  return isIE9();
}
