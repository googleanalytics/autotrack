var assert = require('assert');
var get = require('lodash/object/get');
var constants = require('../lib/constants');


describe('outboundFormTracker', function() {

  it('should send events on outbound form submits', function *() {

    var hitData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stopFormSubmitEvents)
        .execute(stubBeacon)
        .click('#submit-1')
        .execute(getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'Outbound Form');
    assert.equal(hitData[0].eventAction, 'submit');
    assert.equal(hitData[0].eventLabel, 'http://google-analytics.com/collect');
  });


  it('should not send events on local form submits', function *() {

    var testData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stopFormSubmitEvents)
        .execute(stubBeacon)
        .click('#submit-2')
        .execute(getHitData))
        .value;

    assert(!testData.count);
  });


  it('should navigate to the proper location on submit', function *() {

    yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubBeacon)
        .click('#submit-1')
        .waitUntil(urlMatches('http://google-analytics.com/collect'));

    yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubBeacon)
        .click('#submit-2')
        .waitUntil(urlMatches('/test/blank.html'));
  });


  it('should stop the event when beacon is not supported and re-emit ' +
      'after the hit succeeds or times out', function* () {

    var hitData = (yield browser
        .url('/test/outbound-form-tracker.html')
        .execute(stubNoBeacon)
        .execute(disableFormSubmitMethod)
        .click('#submit-1')
        .execute(getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'Outbound Form');
    assert.equal(hitData[0].eventAction, 'submit');
    assert.equal(hitData[0].eventLabel, 'http://google-analytics.com/collect');

    yield browser
        .url('/test/outbound-form-tracker.html')
        .click('#submit-1')
        .waitUntil(urlMatches('http://google-analytics.com/collect'));

    // TODO(philipwalton): figure out a way to test the hitCallback timing out.
  });


  it('should include the &did param with all hits', function() {

    return browser
        .url('/test/outbound-form-tracker.html')
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


function stopFormSubmitEvents() {
  window.__stopFormSubmitEvents__ = true;
}


function stubBeacon() {
  navigator.sendBeacon = function() {
    return true;
  };
}


function stubNoBeacon() {
  navigator.sendBeacon = undefined;
}


function disableFormSubmitMethod() {
  for (var i = 0, form; form = document.forms[i]; i++) {
    form.submit = function() {};
  }
}
