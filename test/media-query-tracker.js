var assert = require('assert');


var CHANGE_TIMEOUT = 1000;


describe('Media query tracking', function() {

  beforeEach(function() {
    return browser
        // Loads a blank page to speed up testing.
        .url('/test/blank.html')
        .setViewportSize({width:800, height:600});
  });

  it('should set initial data via custom dimensions', function *() {
    var result = (yield browser
        .url('/test/media-query-tracker.html')
        .execute(getPageData))
        .value;

    assert.equal(result.dimensions.dimension1, 'lg');
    assert.equal(result.dimensions.dimension2, 'md');
  });

  it('should send events with the matched media changes', function *() {
    var result = (yield browser
        .url('/test/media-query-tracker.html')
        .setViewportSize({width:400, height:400})
        .pause(CHANGE_TIMEOUT)
        .execute(getPageData))
        .value;

    assert.equal(result.dimensions.dimension1, 'sm');
    assert.equal(result.dimensions.dimension2, 'sm');
    assert.equal(result.hitData[0].eventCategory, 'Width');
    assert.equal(result.hitData[0].eventAction, 'change');
    assert.equal(result.hitData[0].eventLabel, 'lg => sm');
    assert.equal(result.hitData[1].eventCategory, 'Height');
    assert.equal(result.hitData[1].eventAction, 'change');
    assert.equal(result.hitData[1].eventLabel, 'md => sm');
  });

  it('should wait for the timeout to set or send changes', function *() {
    var result = (yield browser
        .url('/test/media-query-tracker.html')
        .setViewportSize({width:400, height:400})
        .execute(getPageData))
        .value;

    assert.notEqual(result.dimensions.dimension1, 'sm');
    assert.notEqual(result.dimensions.dimension2, 'sm');
    assert.equal(result.hitData.length, 0);
  });

  it('should support customizing the timeout period', function *() {
    var result = (yield browser
        .url('/test/media-query-tracker-change-timeout.html')
        .setViewportSize({width:400, height:400})
        .pause(CHANGE_TIMEOUT)
        .execute(getPageData))
        .value;

    assert.notEqual(result.dimensions.dimension1, 'sm');
    assert.notEqual(result.dimensions.dimension2, 'sm');
    assert.equal(result.hitData.length, 0);

    result = (yield browser
        .pause(CHANGE_TIMEOUT * 2)
        .execute(getPageData))
        .value;

    assert.equal(result.dimensions.dimension1, 'sm');
    assert.equal(result.dimensions.dimension2, 'sm');
    assert.equal(result.hitData.length, 2);
  });

  it('should support customizing the change template', function *() {
    var result = (yield browser
        .url('/test/media-query-tracker-change-template.html')
        .setViewportSize({width:400, height:400})
        .pause(CHANGE_TIMEOUT)
        .execute(getPageData))
        .value;

    assert.equal(result.hitData[0].eventLabel, 'lg:sm');
    assert.equal(result.hitData[1].eventLabel, 'md:sm');
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
  }
}
