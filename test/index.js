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


describe('index', function() {
  this.retries(4);

  beforeEach(function() {
    testId = uuid();
    log = utilities.bindLogAccessors(testId);
  });

  afterEach(function() {
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

  it('provides all plugins', function() {
    browser.url('/test/autotrack.html');
    var gaplugins = browser.execute(ga.getProvidedPlugins).value;

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
      function() {
    browser.url('/test/autotrack-reorder.html');

    var gaplugins = browser.execute(ga.getProvidedPlugins).value;
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

  it('works with all plugins required', function() {
    browser.url('/test/autotrack.html');
    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
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

    var lastHit = log.getHits().slice(-1)[0];
    assert.strictEqual(lastHit.t, 'pageview');
  });

  it('works when renaming the global object', function() {
    browser.url('/test/autotrack-rename.html');
    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
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

    var lastHit = log.getHits().slice(-1)[0];
    assert.strictEqual(lastHit.t, 'pageview');
  });

  it('tracks usage for all required plugins', function() {
    browser.url('/test/autotrack.html');
    browser.execute(ga.run, 'create', 'UA-XXXXX-Y', 'auto');
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

    var lastHit = log.getHits().slice(-1)[0];
    assert.strictEqual(lastHit.did, constants.DEV_ID);
    assert.strictEqual(lastHit[constants.VERSION_PARAM], pkg.version);

    // '3ff' = '1111111111' in hex
    assert.strictEqual(lastHit[constants.USAGE_PARAM], '3ff');
  });
});
