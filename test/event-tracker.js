var assert = require('assert');
var get = require('lodash/object/get');
var constants = require('../lib/constants');


describe('eventTracker', function() {

  it('should support declarative event binding to DOM elements', function *() {

    var hitData = (yield browser
        .url('/test/event-tracker.html')
        .click('#event-button')
        .execute(getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'foo');
    assert.equal(hitData[0].eventAction, 'bar');
    assert.equal(hitData[0].eventLabel, 'qux');
    assert.equal(hitData[0].eventValue, '42');
  });


  it('should support only specifying some of the event fields', function *() {

    var hitData = (yield browser
        .url('/test/event-tracker.html')
        .click('#event-button-some-fields')
        .execute(getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'foo');
    assert.equal(hitData[0].eventAction, 'bar');
    assert.equal(hitData[0].eventLabel, 'qux');
    assert.equal(hitData[0].eventValue, undefined);
  });


  it('should not capture clicks without the category and action fields',
      function *() {

    var hitData = (yield browser
        .url('/test/event-tracker.html')
        .click('#event-button-missing-fields')
        .execute(getHitData))
        .value;

    assert.equal(hitData.count, 0);
  });


  it('should support customizing the attribute prefix', function *() {

    var hitData = (yield browser
        .url('/test/event-tracker-custom-prefix.html')
        .click('#event-button-custom-prefix')
        .execute(getHitData))
        .value;

    assert.equal(hitData[0].eventCategory, 'foo');
    assert.equal(hitData[0].eventAction, 'bar');
    assert.equal(hitData[0].eventLabel, 'qux');
    assert.equal(hitData[0].eventValue, 42);
  });


  it('should include the &did param with all hits', function() {

    return browser
        .url('/test/event-tracker.html')
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
