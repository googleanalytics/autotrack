// When running on CI, this will be true
var isSauceLabs = process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY;


// https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
var capabilities = [{browserName: 'firefox'}];
if (isSauceLabs) {
  capabilities = capabilities.concat([
    {
      browserName: 'chrome'
    },
    {
      browserName: 'MicrosoftEdge',
      platform: 'Windows 10'
    },
    {
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11'
    },
    {
      browserName: 'internet explorer',
      platform: 'Windows 8',
      version: '10'
    },
    {
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11'
    },
    {
      browserName: 'safari',
      platform: 'OS X 10.11'
    },
    {
      browserName: 'safari',
      platform: 'OS X 10.8',
      version: '6'
    }
  ]);
}


exports.config = {

  user: process.env.SAUCE_USERNAME,
  key:  process.env.SAUCE_ACCESS_KEY,

  updateJob: true,

  specs: [
    './test.js'
  ],
  // exclude: [
  //     'test/spec/multibrowser/**',
  //     'test/spec/mobile/**'
  // ],

  capabilities: capabilities,

  logLevel: 'verbose',
  coloredLogs: true,
  baseUrl: 'http://webdriver.io',
  waitforTimeout: 60000,

  framework: 'mocha',
  reporter: 'spec',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  }
};
