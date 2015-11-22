// SELENIUM_REMOTE_URL="http://philipwalton-ga:a5b9cee1-fdeb-47b0-bf8b-96c09727a933@ondemand.saucelabs.com:80/wd/hub" mocha -t 10000 test

var assert = require('assert');
var SauceLabs = require('saucelabs');
var test = require('selenium-webdriver/testing');
var webdriver = require('selenium-webdriver');


const WAIT_TIMEOUT = 60000;


const BASE_URL = 'http://localhost:4040';


test.describe('The home page', function() {

  var By = require('selenium-webdriver').By;
  var driver;
  var hasFailures = false;
  var until = webdriver.until;


  test.before(function() {

    var builder = new webdriver.Builder().withCapabilities({
      'browserName': process.env._BROWSER || 'firefox',
      'platform': process.env._PLATFORM,
      'version': process.env._VERSION,
      'name': 'analytics.js autotrack tests',
      'build': process.env.TRAVIS_BUILD_NUMBER,
      'tags': [
        process.env._ENV || 'desktop',
        process.env._BROWSER,
        process.env._PLATFORM,
        process.env._VERSION
      ]
    });

    if (process.env.CI) {
      builder.usingServer('http://' + process.env.SAUCE_USERNAME + ':' +
          process.env.SAUCE_ACCESS_KEY + '@ondemand.saucelabs.com:80/wd/hub');
    }

    driver = builder.build();
  });

  test.afterEach(function() {
    if (this.currentTest.state == 'failed') hasFailures = true;
  })

  test.after(function() {

    // When runnign in SauceLabs, update the job with the test status.
    if (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
      var sauceAccount = new SauceLabs({
        username: 'philipwalton-ga',
        password: 'a5b9cee1-fdeb-47b0-bf8b-96c09727a933'
      });

      driver.getSession().then(function(session) {
        return new webdriver.promise.Promise(function(resolve, reject) {

          var jobId = session.getId();
          var data = {
            passed: !hasFailures,
            build: 3
          };

          sauceAccount.updateJob(jobId, data, function(err, res) {
            if (err) reject(err);

            console.log('successfully updated job! ' + jobId);
            resolve();
          });

        });
      });
    }

    driver.quit();
  });


  test.it('does something', function() {

    driver.get('http://localhost:4040/test.html');
    driver.wait(until.titleIs('analytics.js autotrack test'), WAIT_TIMEOUT);

  });

});
