var assert = require('assert');


describe('Event tracking', function() {

  it('should support declarative event binding to DOM elements', function *() {

    var hitData = (yield browser
        .url('/test/event-tracker.html')
        .click('#event-button')
        .execute(getPageData))
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
        .execute(getPageData))
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
        .execute(getPageData))
        .value;

    assert.equal(hitData.count, 0);
  });


  it('should support customizing the attribute prefix', function *() {

    var hitData = (yield browser
        .url('/test/event-tracker-custom-prefix.html')
        .click('#event-button-custom-prefix')
        .execute(getPageData))
        .value;

    assert.equal(hitData[0].eventCategory, 'foo');
    assert.equal(hitData[0].eventAction, 'bar');
    assert.equal(hitData[0].eventLabel, 'qux');
    assert.equal(hitData[0].eventValue, 42);
  });

});


function getPageData() {
  return hitData;
}
