var assert = require('assert');

describe('webdriver.io page', function() {

    it('should have the right title - the good old callback way', function(done) {

        browser
            .url('/')
            .getTitle(function(err, title) {
                assert.equal(err, undefined);
                assert.equal(title, 'WebdriverIO - Selenium 2.0 javascript bindings for nodejs');
            })
            .call(done);

    });

});
