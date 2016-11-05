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


exports.config = {
  specs: [
    './test/index.js',
    './test/*-tracker.js',
  ],
  maxInstances: 5,
  capabilities: getCapabilities(),
  sync: true,
  logLevel: 'error', // silent | verbose | command | data | result | error
  coloredLogs: true,
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  waitforTimeout: 1e4,
  connectionRetryTimeout: 3e4,
  connectionRetryCount: 3,
  services: ['sauce'],
  user: process.env.SAUCE_USERNAME,
  key: process.env.SAUCE_ACCESS_KEY,
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    // Ensure this is longer than the `waitForTime` setting, so timeouts point
    // to individual lines rather than just tests.
    timeout: 6e4,
  },
}

function getCapabilities() {
  // When running on CI, this will be true
  var isSauceLabs = process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY;

  // https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
  var capabilities = [
    {browserName: 'chrome'},
    {browserName: 'firefox'},
    // {browserName: 'safari'},
  ];

  if (isSauceLabs) {
    capabilities = [
      {
        browserName: 'chrome',
        platform: 'Windows 10',
        version: 'latest',
      },
      {
        browserName: 'firefox',
        platform: 'OS X 10.11',
        version: 'latest',
      },
      {
        browserName: 'safari',
        platform: 'OS X 10.11',
        version: '10.0',
      },
      {
        browserName: 'safari',
        platform: 'OS X 10.11',
        version: '9',
      },
      {
        browserName: 'internet explorer',
        platform: 'Windows 8.1',
        version: '11',
      },
      // TODO(philipwalton) Edge webdriver does not fully support enough of the
      // webdriver features to rely on. Wait for full support and then re-add:
      // https://dev.windows.com/en-us/microsoft-edge/platform/status/webdriver/details/
      // {
      //   browserName: 'MicrosoftEdge',
      //   platform: 'Windows 10'
      // },
    ];

    capabilities.forEach(function(cap) {
      cap['name'] = 'analytics.js autotrack tests - ' + cap.browserName +
                    ' - ' + (cap.version || 'latest');

      cap['build'] = process.env.TRAVIS_BUILD_NUMBER;
    });
  };

  return capabilities;
}
