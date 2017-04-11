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


describe('index', function() {
  this.retries(4);

  beforeEach(() => {
    testId = uuid();
    log = bindLogAccessors(testId);
  });

  afterEach(() => {
    browser.execute(ga.run, 'cleanUrlTracker:remove');
    browser.execute(ga.run, 'eventTracker:remove');
    browser.execute(ga.run, 'impressionTracker:remove');
    browser.execute(ga.run, 'mediaQueryTracker:remove');
    browser.execute(ga.run, 'outboundFormTracker:remove');
    browser.execute(ga.run, 'outboundLinkTracker:remove');
    browser.execute(ga.run, 'pageVisibilityTracker:remove');
    browser.execute(ga.run, 'socialWidgetTracker:remove');
    browser.execute(ga.run, 'urlChangeTracker:remove');
    browser.execute(ga.run, 'maxScrollTracker:remove');
    browser.execute(ga.run, 'remove');
    log.removeHits();
  });

  it('provides all plugins', () => {
    browser.url('/test/e2e/fixtures/autotrack.html');
    const gaplugins = browser.execute(ga.getProvidedPlugins).value;

    assert(gaplugins.includes('CleanUrlTracker'));
    assert(gaplugins.includes('EventTracker'));
    assert(gaplugins.includes('ImpressionTracker'));
    assert(gaplugins.includes('MediaQueryTracker'));
    assert(gaplugins.includes('OutboundFormTracker'));
    assert(gaplugins.includes('OutboundLinkTracker'));
    assert(gaplugins.includes('PageVisibilityTracker'));
    assert(gaplugins.includes('SocialWidgetTracker'));
    assert(gaplugins.includes('UrlChangeTracker'));
    assert(gaplugins.includes('MaxScrollTracker'));
  });

  it('provides plugins even if sourced before the tracking snippet',
      () => {
    browser.url('/test/e2e/fixtures/autotrack-reorder.html');

    const gaplugins = browser.execute(ga.getProvidedPlugins).value;
    assert(gaplugins.includes('CleanUrlTracker'));
    assert(gaplugins.includes('ImpressionTracker'));
    assert(gaplugins.includes('EventTracker'));
    assert(gaplugins.includes('MediaQueryTracker'));
    assert(gaplugins.includes('OutboundFormTracker'));
    assert(gaplugins.includes('OutboundLinkTracker'));
    assert(gaplugins.includes('PageVisibilityTracker'));
    assert(gaplugins.includes('SocialWidgetTracker'));
    assert(gaplugins.includes('UrlChangeTracker'));
    assert(gaplugins.includes('MaxScrollTracker'));
  });

  it('works with all plugins required', () => {
    browser.url('/test/e2e/fixtures/autotrack.html');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'cleanUrlTracker');
    browser.execute(ga.run, 'require', 'eventTracker');
    browser.execute(ga.run, 'require', 'impressionTracker');
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.execute(ga.run, 'require', 'mediaQueryTracker');
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.execute(ga.run, 'require', 'pageVisibilityTracker');
    browser.execute(ga.run, 'require', 'socialWidgetTracker');
    browser.execute(ga.run, 'require', 'urlChangeTracker');
    browser.execute(ga.run, 'require', 'maxScrollTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountIsAtLeast(1));

    const lastHit = log.getHits().slice(-1)[0];
    assert.strictEqual(lastHit.t, 'pageview');
  });

  it('works when renaming the global object', () => {
    browser.url('/test/e2e/fixtures/autotrack-rename.html');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'cleanUrlTracker');
    browser.execute(ga.run, 'require', 'eventTracker');
    browser.execute(ga.run, 'require', 'impressionTracker');
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.execute(ga.run, 'require', 'mediaQueryTracker');
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.execute(ga.run, 'require', 'pageVisibilityTracker');
    browser.execute(ga.run, 'require', 'socialWidgetTracker');
    browser.execute(ga.run, 'require', 'urlChangeTracker');
    browser.execute(ga.run, 'require', 'maxScrollTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountIsAtLeast(1));

    const lastHit = log.getHits().slice(-1)[0];
    assert.strictEqual(lastHit.t, 'pageview');
  });

  it('tracks usage for all required plugins', () => {
    browser.url('/test/e2e/fixtures/autotrack.html');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);
    browser.execute(ga.run, 'require', 'cleanUrlTracker');
    browser.execute(ga.run, 'require', 'eventTracker');
    browser.execute(ga.run, 'require', 'impressionTracker');
    browser.execute(ga.run, 'require', 'outboundLinkTracker');
    browser.execute(ga.run, 'require', 'mediaQueryTracker');
    browser.execute(ga.run, 'require', 'outboundFormTracker');
    browser.execute(ga.run, 'require', 'pageVisibilityTracker');
    browser.execute(ga.run, 'require', 'socialWidgetTracker');
    browser.execute(ga.run, 'require', 'urlChangeTracker');
    browser.execute(ga.run, 'require', 'maxScrollTracker');
    browser.execute(ga.run, 'send', 'pageview');
    browser.waitUntil(log.hitCountIsAtLeast(1));

    const lastHit = log.getHits().slice(-1)[0];
    assert.strictEqual(lastHit.did, constants.DEV_ID);
    assert.strictEqual(lastHit[constants.VERSION_PARAM], pkg.version);

    // '3ff' = '1111111111' in hex
    assert.strictEqual(lastHit[constants.USAGE_PARAM], '3ff');
  });

  it('tracks usage when plugins send hits before other plugins are required',
      () => {
    browser.url('/test/e2e/fixtures/autotrack.html');
    browser.execute(ga.run, 'create', DEFAULT_TRACKER_FIELDS);
    browser.execute(ga.logHitData, testId);

    // Run all require commands in the same execute() block so they occur in
    // the same call stack (as most people do in their tracking snippet).
    browser.execute(() => {
      ga('require', 'cleanUrlTracker');
      ga('require', 'eventTracker');
      ga('require', 'impressionTracker');
      ga('require', 'outboundLinkTracker');
      ga('require', 'mediaQueryTracker');
      ga('require', 'outboundFormTracker');
      ga('require', 'pageVisibilityTracker', {sendInitialPageview: true});
      ga('require', 'socialWidgetTracker');
      ga('require', 'urlChangeTracker');
      ga('require', 'maxScrollTracker');
    });

    browser.waitUntil(log.hitCountIsAtLeast(1));

    const lastHit = log.getHits().slice(-1)[0];
    assert.strictEqual(lastHit.did, constants.DEV_ID);
    assert.strictEqual(lastHit[constants.VERSION_PARAM], pkg.version);

    // '3ff' = '1111111111' in hex
    assert.strictEqual(lastHit[constants.USAGE_PARAM], '3ff');
  });
});
