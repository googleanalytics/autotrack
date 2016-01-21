var assert = require('assert');
var get = require('lodash/object/get');
var constants = require('../lib/constants');


describe('outboundLinkTracker', function() {

  it('should send events on outbound link clicks', function *() {

    var hitData = (yield browser
        .url('/test/outbound-link-tracker.html')
        .execute(stopClickEvents)
        .execute(stubBeacon)
        .click('#outbound-link')
        .execute(getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'Outbound Link');
    assert.equal(hitData[0].eventAction, 'click');
    assert.equal(hitData[0].eventLabel, 'http://google-analytics.com/collect');
  });


  it('should not send events on local link clicks', function *() {

    var testData = (yield browser
        .url('/test/outbound-link-tracker.html')
        .execute(stopClickEvents)
        .execute(stubBeacon)
        .click('#local-link')
        .execute(getHitData))
        .value;

    assert(!testData.count);
  });


  it('should navigate to the proper location on submit', function *() {

    yield browser
        .url('/test/outbound-link-tracker.html')
        .execute(stubBeacon)
        .click('#outbound-link')
        .waitUntil(urlMatches('http://google-analytics.com/collect'));

    yield browser
        .url('/test/outbound-link-tracker.html')
        .execute(stubBeacon)
        .click('#local-link')
        .waitUntil(urlMatches('/test/blank.html'));
  });


  it('should set the target to "_blank" when beacon is not supported',
      function* () {

    var target = (yield browser
        .url('/test/outbound-link-tracker.html')
        .execute(stubNoBeacon)
        .execute(stopClickEvents)
        .click('#outbound-link')
        .getAttribute('#outbound-link', 'target'));

    assert.equal('_blank', target);
  });


  it('should include the &did param with all hits', function() {

    return browser
        .url('/test/outbound-link-tracker.html')
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


function urlMatches(expectedUrl) {
  return function() {
    return browser.url().then(function(result) {
      var actualUrl = result.value;
      return actualUrl.indexOf(expectedUrl) > -1;
    });
  }
}


function stopClickEvents() {
  window.__stopClickEvents__ = true;
}


function stubBeacon() {
  navigator.sendBeacon = function() {
    return true;
  };
}


function stubNoBeacon() {
  navigator.sendBeacon = undefined;
}
