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
var ga = require('./analytics');
var constants = require('../lib/constants');


describe('autotrack', function() {

  afterEach(function () {
    return browser
        .execute(ga.clearHitData)
        .execute(ga.removeTracker);
  });

  it('should provide all plugins', function *() {

    var gaplugins = (yield browser
        .url('/test/fixtures/autotrack.html')
        .execute(ga.getProvidedPlugins))
        .value;

    assert(gaplugins.Autotrack);
    assert(gaplugins.EventTracker);
    assert(gaplugins.MediaQueryTracker);
    assert(gaplugins.OutboundFormTracker);
    assert(gaplugins.OutboundLinkTracker);
    assert(gaplugins.SocialTracker);
    assert(gaplugins.UrlChangeTracker);
  });


  it('should provide plugins even if sourced before the tracking snippet',
      function *() {

    var gaplugins = (yield browser
        .url('/test/fixtures/autotrack-reorder.html')
        .execute(ga.createTracker)
        .execute(ga.trackHitData)
        .execute(ga.requirePlugin, 'autotrack')
        .execute(ga.getProvidedPlugins))
        .value;

    assert(gaplugins.Autotrack);
    assert(gaplugins.EventTracker);
    assert(gaplugins.MediaQueryTracker);
    assert(gaplugins.OutboundFormTracker);
    assert(gaplugins.OutboundLinkTracker);
    assert(gaplugins.SocialTracker);
    assert(gaplugins.UrlChangeTracker);

    var hitData = (yield browser
        .execute(ga.sendHit, 'pageview')
        .execute(ga.getHitData)).value;

    assert.equal(hitData.count, 1);
  });


  it('should work with renaming the global object', function *() {

    var gaplugins = (yield browser
        .url('/test/fixtures/autotrack-rename.html')
        .execute(ga.createTracker)
        .execute(ga.trackHitData)
        .execute(ga.requirePlugin, 'autotrack')
        .execute(ga.getProvidedPlugins))
        .value;

    assert(gaplugins.Autotrack);
    assert(gaplugins.EventTracker);
    assert(gaplugins.MediaQueryTracker);
    assert(gaplugins.OutboundFormTracker);
    assert(gaplugins.OutboundLinkTracker);
    assert(gaplugins.SocialTracker);
    assert(gaplugins.UrlChangeTracker);

    var hitData = (yield browser
        .execute(ga.sendHit, 'pageview')
        .execute(ga.getHitData)).value;

    assert.equal(hitData.count, 1);
  });


  it('should include the &did param with all hits', function() {

    return browser
        .url('/test/autotrack.html')
        .execute(ga.createTracker)
        .execute(ga.trackHitData)
        .execute(ga.requirePlugin, 'autotrack')
        .execute(ga.sendHit, 'pageview')
        .waitUntil(ga.hitDataMatches([['[0].devId', constants.DEV_ID]]));
  });

});
