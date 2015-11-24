exports.config = {

    user: process.env.SAUCE_USERNAME,
    key:  process.env.SAUCE_ACCESS_KEY,
    updateJob: true,

    /**
     * specify test files
     */
    specs: [
        './test.js'
    ],
    // exclude: [
    //     'test/spec/multibrowser/**',
    //     'test/spec/mobile/**'
    // ],

    /**
     * capabilities
     * https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
     */
    capabilities: [
        {
            browserName: 'chrome'
        },
        {
            browserName: 'firefox'
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
    ],

    /**
     * test configurations
     */
    logLevel: 'silent',
    coloredLogs: true,
    screenshotPath: 'shots',
    baseUrl: 'http://webdriver.io',
    waitforTimeout: 60000,
    framework: 'mocha',

    reporter: 'spec',
    reporterOptions: {
        outputDir: './'
    },

    mochaOpts: {
        ui: 'bdd'
    },

    /**
     * hooks
     */
    onPrepare: function() {
        console.log('let\'s go');
    },
    onComplete: function() {
        console.log('that\'s it');
    }

};
