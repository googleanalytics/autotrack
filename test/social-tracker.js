var assert = require('assert');
var get = require('lodash/object/get');


var browserCaps;


describe('socialTracker', function() {

  before(function *() {
    browserCaps = (yield browser.session()).value;
  });


  it('should support declarative event binding to DOM elements', function *() {

    var hitData = (yield browser
        .url('/test/social-tracker.html')
        .waitUntil(pageIsLoaded())
        .click('#social-button')
        .execute(getPageData))
        .value;

    assert.equal(hitData[0].socialNetwork, 'Twitter');
    assert.equal(hitData[0].socialAction, 'tweet');
    assert.equal(hitData[0].socialTarget, 'foo');
  });


  it('should support only specifying some of the social fields', function *() {

    var hitData = (yield browser
        .url('/test/social-tracker.html')
        .waitUntil(pageIsLoaded())
        .click('#social-button-some-fields')
        .execute(getPageData))
        .value;

    assert.equal(hitData[0].socialNetwork, 'Twitter');
    assert.equal(hitData[0].socialAction, 'tweet');
    assert.equal(hitData[0].socialTarget, undefined);
  });


  it('should not capture clicks without the network and action fields',
      function *() {

    var hitData = (yield browser
        .url('/test/social-tracker.html')
        .waitUntil(pageIsLoaded())
        .click('#social-button-missing-fields')
        .execute(getPageData))
        .value;

    assert.equal(hitData.count, 0);
  });


  it('should support customizing the attribute prefix', function *() {

    var hitData = (yield browser
        .url('/test/social-tracker-custom-prefix.html')
        .waitUntil(pageIsLoaded())
        .click('#social-button-custom-prefix')
        .execute(getPageData))
        .value;

    assert.equal(hitData[0].socialNetwork, 'Twitter');
    assert.equal(hitData[0].socialAction, 'tweet');
    assert.equal(hitData[0].socialTarget, 'foo');
  });


  it('should support tweets and follows from the official twitter widgets',
      function *() {

    if (notSupportedInBrowser()) return;

    var tweetFrame = (yield browser
        .url('/test/social-tracker-widgets.html')
        .waitForVisible('iframe.twitter-share-button')
        .pause(1000) // Needed for Safari (for some reason).
        .element('iframe.twitter-share-button')).value;

    var followFrame = (yield browser
        .waitForVisible('iframe.twitter-follow-button')
        .pause(1000) // Needed for Safari (for some reason).
        .element('iframe.twitter-follow-button')).value;

    yield browser
        .frame(tweetFrame)
        .click('a')
        .frame()
        .frame(followFrame)
        .click('a')
        .frame()
        .waitUntil(pageDataMatches([
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

});


function getPageData() {
  return hitData;
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


function pageIsLoaded() {
  return function() {
    return browser.execute(function() {
      return document.readyState;
    })
    .then(function(response) {
      return response.value == 'complete';
    });
  };
}


function socialButtonsAreRendered() {
  return function() {
    return browser.execute(function() {
      return {
        shareBtn: !!document.querySelector('iframe.twitter-share-button'),
        followBtn: !!document.querySelector('iframe.twitter-follow-button')
      };
    })
    .then(function(response) {
      return response.value.shareBtn && response.value.followBtn;
    });
  };
}


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
