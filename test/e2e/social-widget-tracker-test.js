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


import assert from 'assert';
import uuid from 'uuid';
import * as ga from './ga';
import {bindLogAccessors} from './server';
import * as constants from '../../lib/constants';
import pkg from '../../package.json';


const DEFAULT_TRACKER_FIELDS = {
  trackingId: 'UA-12345-1',
  cookieDomain: 'auto',
  siteSpeedSampleRate: 0,
};


let testId;
let log;


describe('socialWidgetTracker', function() {
  this.retries(4);

  before(() => browser.url('/test/e2e/fixtures/social-widget-tracker.html'));

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);

    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
  });

  afterEach(() => {
    browser.execute(ga.run, 'socialWidgetTracker:remove');
    browser.execute(ga.run, 'remove');
    log.removeHits();
  });

  it('supports tweets and follows from the official twitter widgets',
      function() {
    if (!browserDriverSupportsTwitterWidgets()) return this.skip();

    browser.execute(ga.run, 'require', 'socialWidgetTracker');
    browser.waitForVisible('iframe.twitter-share-button');
    const tweetFrame = browser.element('iframe.twitter-share-button').value;

    browser.waitForVisible('iframe.twitter-follow-button');
    const followFrame = browser.element('iframe.twitter-follow-button').value;

    browser.frame(tweetFrame);
    browser.click('a');
    browser.frame();
    browser.frame(followFrame);
    browser.click('a');
    browser.frame();

    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits();
    assert.strictEqual(hits[0].sn, 'Twitter');
    assert.strictEqual(hits[0].sa, 'tweet');
    assert.strictEqual(hits[0].st, 'https://example.com');
    assert.strictEqual(hits[1].sn, 'Twitter');
    assert.strictEqual(hits[1].sa, 'follow');
    assert.strictEqual(hits[1].st, 'twitter');
  });

  // TODO(philipwalton): figure out why this doesn't work...
  // it('supports likes from the official facebook widget', () => {

  //   const mainWindow = browser
  //       .url('/test/e2e/fixtures/social-widget-tracker-widgets.html')
  //       .windowHandle().value;

  //   const likeFrame = browser
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
        nonInteraction: true,
      },
    });

    browser.waitForVisible('iframe.twitter-share-button');
    const tweetFrame = browser.element('iframe.twitter-share-button').value;

    browser.waitForVisible('iframe.twitter-follow-button');
    const followFrame = browser.element('iframe.twitter-follow-button').value;

    browser.frame(tweetFrame);
    browser.click('a');
    browser.frame();
    browser.frame(followFrame);
    browser.click('a');
    browser.frame();

    browser.waitUntil(log.hitCountEquals(2));

    const hits = log.getHits();
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
    const tweetFrame = browser.element('iframe.twitter-share-button').value;

    browser.waitForVisible('iframe.twitter-follow-button');
    const followFrame = browser.element('iframe.twitter-follow-button').value;

    browser.frame(tweetFrame);
    browser.click('a');
    browser.frame();
    browser.frame(followFrame);
    browser.click('a');
    browser.frame();

    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
    assert.strictEqual(hits[0].sn, 'Twitter');
    assert.strictEqual(hits[0].sa, 'follow');
    assert.strictEqual(hits[0].st, 'twitter');
    assert.strictEqual(hits[0].ni, '1');
    assert.strictEqual(hits[0].cd1, 'twitter');
    assert.strictEqual(hits[0].cd2, 'follow');
  });


  it('includes usage params with all hits', () => {
    browser.execute(ga.run, 'require', 'socialWidgetTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountEquals(1));

    const hits = log.getHits();
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
  const browserCaps = browser.session().value;

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
    hitFilter: (model, element, event) => {
      const action = model.get('socialAction');
      if (action == 'tweet') {
        throw new Error('Exclude tweet actions');
      } else {
        model.set('nonInteraction', true);
      }
      model.set('dimension1', element.getAttribute('data-screen-name'));
      model.set('dimension2', event.type);
    },
  });
}
