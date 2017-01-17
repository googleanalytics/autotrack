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
var uuid = require('uuid');
var ga = require('./analytics');
var utilities = require('./utilities');
var constants = require('../lib/constants');
var pkg = require('../package.json');


var testId;
var log;


describe('socialWidgetTracker', function() {
  this.retries(4);

  before(function() {
    browser.url('/test/social-widget-tracker.html');
  });

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);

    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
    browser.execute(ga.logHitData, testId);
  });

  afterEach(function () {
    browser.execute(ga.run, 'socialWidgetTracker:remove');
    browser.execute(ga.run, 'remove');
    log.removeHits();
  });

  it('supports tweets and follows from the official twitter widgets',
      function() {
    if (!browserDriverSupportsTwitterWidgets()) return this.skip();

    browser.execute(ga.run, 'require', 'socialWidgetTracker');
    browser.waitForVisible('iframe.twitter-share-button');
    var tweetFrame = browser.element('iframe.twitter-share-button').value;

    browser.waitForVisible('iframe.twitter-follow-button');
    var followFrame = browser.element('iframe.twitter-follow-button').value;

    browser.frame(tweetFrame);
    browser.click('a');
    browser.frame();
    browser.frame(followFrame);
    browser.click('a');
    browser.frame();

    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].sn, 'Twitter');
    assert.strictEqual(hits[0].sa, 'tweet');
    assert.strictEqual(hits[0].st, 'https://example.com');
    assert.strictEqual(hits[1].sn, 'Twitter');
    assert.strictEqual(hits[1].sa, 'follow');
    assert.strictEqual(hits[1].st, 'twitter');
  });

  // TODO(philipwalton): figure out why this doesn't work...
  // it('supports likes from the official facebook widget', function() {

  //   var mainWindow = browser
  //       .url('/test/social-widget-tracker-widgets.html')
  //       .windowHandle().value;

  //   var likeFrame = browser
  //       .waitForVisible('.fb-like iframe')
  //       .element('.fb-like iframe').value;

  //   browser
  //       .frame(likeFrame)
  //       .click('form .pluginButtonLabel')
  //       .debug();
  // });

  it('supports customizing any field via the fieldsObj', function() {
    if (!browserDriverSupportsTwitterWidgets()) return this.skip();

    browser.execute(ga.run, 'require', 'socialWidgetTracker', {
      fieldsObj: {
        nonInteraction: true
      }
    });

    browser.waitForVisible('iframe.twitter-share-button');
    var tweetFrame = browser.element('iframe.twitter-share-button').value;

    browser.waitForVisible('iframe.twitter-follow-button');
    var followFrame = browser.element('iframe.twitter-follow-button').value;

    browser.frame(tweetFrame);
    browser.click('a');
    browser.frame();
    browser.frame(followFrame);
    browser.click('a');
    browser.frame();

    browser.waitUntil(log.hitCountEquals(2));

    var hits = log.getHits();
    assert.strictEqual(hits[0].sn, 'Twitter');
    assert.strictEqual(hits[0].sa, 'tweet');
    assert.strictEqual(hits[0].st, 'https://example.com');
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[1].sn, 'Twitter');
    assert.strictEqual(hits[1].sa, 'follow');
    assert.strictEqual(hits[1].st, 'twitter');
    assert.strictEqual(hits[1].ni, '1');
  });

  it('supports specifying a hit filter', function() {
    if (!browserDriverSupportsTwitterWidgets()) return this.skip();

    browser.execute(requireSocialWidgetTracker_hitFilter);

    browser.waitForVisible('iframe.twitter-share-button');
    var tweetFrame = browser.element('iframe.twitter-share-button').value;

    browser.waitForVisible('iframe.twitter-follow-button');
    var followFrame = browser.element('iframe.twitter-follow-button').value;

    browser.frame(tweetFrame);
    browser.click('a');
    browser.frame();
    browser.frame(followFrame);
    browser.click('a');
    browser.frame();

    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].sn, 'Twitter');
    assert.strictEqual(hits[0].sa, 'follow');
    assert.strictEqual(hits[0].st, 'twitter');
    assert.strictEqual(hits[0].ni, '1');
  });


  it('includes usage params with all hits', function() {
    browser.execute(ga.run, 'require', 'socialWidgetTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    var hits = log.getHits();
    assert.strictEqual(hits[0].did, constants.DEV_ID);
    assert.strictEqual(hits[0][constants.VERSION_PARAM], pkg.version);

    // '80' = '0010000000' in hex
    assert.strictEqual(hits[0][constants.USAGE_PARAM], '80');
  });
});


/**
 * @return {boolean} True if the current browser doesn't support all features
 *    required for these tests.
 */
function browserDriverSupportsTwitterWidgets() {
  var browserCaps = browser.session().value;

  return !(
    // TODO(philipwalton): IE and Edge are flaky with the tweet button test,
    // though they work when manually testing.
    browserCaps.browserName == 'MicrosoftEdge' ||
    browserCaps.browserName == 'internet explorer' ||

    // TODO(philipwalton): Safari 10 doesn't seem to detect the tweet button,
    // nor does it like to wait for iframes.
    (browserCaps.browserName == 'safari' &&
        browserCaps.version.split('.')[0] > 9)
  );
}


/**
 * Since function objects can't be passed via parameters from server to
 * client, this one-off function must be used to set the value for
 * `hitFilter`.
 */
function requireSocialWidgetTracker_hitFilter() {
  ga('require', 'socialWidgetTracker', {
    hitFilter: function(model) {
      var action = model.get('socialAction');
      if (action == 'tweet') {
        throw 'Exclude tweet actions';
      }
      else {
        model.set('nonInteraction', true);
      }
    }
  });
}
