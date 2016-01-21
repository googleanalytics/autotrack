var assert = require('assert');
var get = require('lodash/object/get');
var constants = require('../lib/constants');


describe('autotrack', function() {

  it('should require all other plugins', function *() {

    var gaplugins = (yield browser
        .url('/test/autotrack.html')
        .execute(getGaPlugins))
        .value;

    assert(gaplugins.Autotrack);
    assert(gaplugins.EventTracker);
    assert(gaplugins.MediaQueryTracker);
    assert(gaplugins.OutboundFormTracker);
    assert(gaplugins.OutboundLinkTracker);
    assert(gaplugins.SessionDurationTracker);
    assert(gaplugins.SocialTracker);
    assert(gaplugins.UrlChangeTracker);
  });

  it('should include the &did param with all hits', function() {

    return browser
        .url('/test/autotrack.html')
        .execute(sendPageview)
        .waitUntil(hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});


function sendPageview() {
  ga('send', 'pageview');
}


function getGaPlugins() {
  return gaplugins;
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
