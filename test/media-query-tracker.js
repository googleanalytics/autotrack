var assert = require('assert');
var get = require('lodash/object/get');


var browserCaps;
var TIMEOUT = 1000;


describe('Media query tracking', function() {

  before(function *() {
    browserCaps = (yield browser.session()).value;
  });


  beforeEach(function() {

    if (notSupportedInBrowser()) return;

    return browser
        // Loads a blank page to speed up testing.
        .url('/test/blank.html')
        .setViewportSize({width:800, height:600}, false);
  });


  it('should set initial data via custom dimensions', function *() {

    if (notSupportedInBrowser()) return;

    return browser
        .url('/test/media-query-tracker.html')
        .waitUntil(pageDataMatches([
          ['dimensions.dimension1', 'lg'],
          ['dimensions.dimension2', 'md']
        ]));
  });


  it('should send events when the matched media changes', function() {

    if (notSupportedInBrowser()) return;

    return browser
        .url('/test/media-query-tracker.html')
        .setViewportSize({width:400, height:400}, false)
        .waitUntil(pageDataMatches([
          ['dimensions.dimension1', 'sm'],
          ['dimensions.dimension2', 'sm'],
          ['hitData[0].eventCategory', 'Width'],
          ['hitData[0].eventAction', 'change'],
          ['hitData[0].eventLabel', 'lg => sm'],
          ['hitData[1].eventCategory', 'Height'],
          ['hitData[1].eventAction', 'change'],
          ['hitData[1].eventLabel', 'md => sm']
        ]));
  });


  it('should wait for the timeout to set or send changes', function *() {

    if (notSupportedInBrowser()) return;

    yield browser
        .url('/test/media-query-tracker.html')
        .setViewportSize({width:400, height:400}, false)

    var timeoutStart = Date.now();
    yield browser.waitUntil(pageDataMatches([
      ['dimensions.dimension1', 'sm'],
      ['dimensions.dimension2', 'sm'],
      ['hitData.count', 2]
    ]));
    var timeoutDuration = Date.now() - timeoutStart;

    assert(timeoutDuration >= TIMEOUT);
  });


  it('should support customizing the timeout period', function *() {

    if (notSupportedInBrowser()) return;

    yield browser
        .url('/test/media-query-tracker-change-timeout.html')
        .setViewportSize({width:400, height:400}, false)

    var shortTimeoutStart = Date.now();
    yield browser.waitUntil(pageDataMatches([
      ['dimensions.dimension1', 'sm'],
      ['dimensions.dimension2', 'sm'],
      ['hitData.count', 2]
    ]));
    var shortTimeoutDuration = Date.now() - shortTimeoutStart;

    yield browser
        .setViewportSize({width:800, height:600}, false)
        .url('/test/media-query-tracker.html')
        .setViewportSize({width:400, height:400}, false);

    var longTimeoutStart = Date.now();
    yield browser.waitUntil(pageDataMatches([
      ['dimensions.dimension1', 'sm'],
      ['dimensions.dimension2', 'sm'],
      ['hitData.count', 2]
    ]));
    var longTimeoutDuration = Date.now() - longTimeoutStart;

    // The long timeout should, in theory, be 1000ms longer, but we compare
    // to 500 just to be safe and avoid flakiness.
    assert(longTimeoutDuration - shortTimeoutDuration > (TIMEOUT/2));
  });


  it('should support customizing the change template', function() {

    if (notSupportedInBrowser()) return;

    return browser
        .url('/test/media-query-tracker-change-template.html')
        .setViewportSize({width:400, height:400}, false)
        .waitUntil(pageDataMatches([
          ['hitData[0].eventLabel', 'lg:sm'],
          ['hitData[1].eventLabel', 'md:sm']
        ]));
  });
});


function getPageData() {
  var tracker = ga.getAll()[0];
  return {
    dimensions: {
      dimension1: tracker.get('dimension1'),
      dimension2: tracker.get('dimension2')
    },
    hitData: hitData
  };
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


function isEdge() {
  return browserCaps.browserName == 'MicrosoftEdge';
}


function isIE9() {
  return browserCaps.browserName == 'internet explorer' &&
         browserCaps.version == '9';
}


function notSupportedInBrowser() {
  // TODO(philipwalton): Some capabilities aren't implemented, so we can't test
  // against Edge right now. Wait for build 10532 to support setViewportSize
  // https://dev.windows.com/en-us/microsoft-edge/platform/status/webdriver/details/

  // IE9 doesn't support matchMedia, so it's not tested.
  return isEdge() || isIE9();
}
