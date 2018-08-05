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

const {spawn} = require('child_process');
const fs = require('fs-extra');
const eslint = require('gulp-eslint');
const glob = require('glob');
const gulp = require('gulp');
const gutil = require('gulp-util');
const webdriver = require('gulp-webdriver');
const gzipSize = require('gzip-size');
const path = require('path');
const {rollup} = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const babel = require('rollup-plugin-babel');
const runSequence = require('run-sequence');
const sauceConnectLauncher = require('sauce-connect-launcher');
const seleniumServerJar = require('selenium-server-standalone-jar');
const webpack = require('webpack');
const build = require('./bin/build');
const logBuildErrors = require('./bin/errors');
const server = require('./test/e2e/server');


let seleniumServer;
let sshTunnel;


/**
 * @return {boolean} True if NODE_ENV is set to production or the build is
 *     running on CI.
 */
const isProd = () => {
  return process.env.NODE_ENV == 'production' || process.env.CI;
};


gulp.task('js:lib', () => {
  if (isProd()) {
    return build('autotrack.js').then(({code, map}) => {
      fs.outputFileSync('autotrack.js', code, 'utf-8');
      fs.outputFileSync('autotrack.js.map', map, 'utf-8');
      const size = (gzipSize.sync(code) / 1000).toFixed(1);
      gutil.log(
          `Built autotrack.js ${gutil.colors.gray(`(${size} Kb gzipped)`)}`);
    }).catch((err) => {
      logBuildErrors(err);
      throw new Error('failed to build autotrack.js');
    });
  } else {
    return rollup({
      input: './lib/index.js',
      plugins: [
        nodeResolve(),
        babel({
          babelrc: false,
          plugins: ['external-helpers'],
          presets: [['env', {
            modules: false,
            // Note: uncomment when developing for easier debugging.
            // targets: {
            //   browsers: ['last 2 Chrome versions'],
            // },
          }]],
        }),
      ],
    }).then((bundle) => {
      return bundle.write({
        file: 'autotrack.js',
        format: 'iife',
        sourcemap: true,
      });
    });
  }
});


gulp.task('js:test', ((compiler) => {
  const createCompiler = () => {
    return webpack({
      mode: 'development',
      entry: glob.sync('./test/unit/**/*-test.js'),
      output: {
        path: path.resolve(__dirname, 'test/unit'),
        filename: 'index.js',
      },
      devtool: '#source-map',
      cache: {},
      performance: {hints: false},
      module: {
        // Note: comment this rule out when testing for easier debugging.
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules\/(?!(dom-utils)\/).*/,
            use: {
              loader: 'babel-loader',
              options: {
                babelrc: false,
                cacheDirectory: true,
                presets: [['env', {modules: false}]],
              },
            },
          },
        ],
      },
    });
  };
  return (done) => {
    (compiler || (compiler = createCompiler())).run((err, stats) => {
      if (err) return done(err);
      gutil.log('[webpack]', stats.toString('minimal'));
      done();
    });
  };
})());


gulp.task('js', gulp.parallel('js:lib', 'js:test'));


gulp.task('lint', () => {
  return gulp.src([
    'gulpfile.js',
    'bin/autotrack',
    'bin/*.js',
    'lib/*.js',
    'lib/plugins/*.js',
    'test/e2e/*.js',
    'test/unit/**/*.js',
    '!test/unit/index.js',
  ])
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});


gulp.task('selenium', (done) => {
  // Don't start the selenium server on CI.
  if (process.env.CI) return done();

  seleniumServer = spawn('java', ['-jar', seleniumServerJar.path]);
  seleniumServer.stderr.on('data', (data) => {
    if (data.indexOf('Selenium Server is up and running') > -1) {
      done();
    }
  });
  process.on('exit', seleniumServer.kill.bind(seleniumServer));
});


gulp.task('serve', gulp.series('js', (done) => {
  server.start(done);
  process.on('exit', server.stop.bind(server));
}));


gulp.task('tunnel', gulp.series('serve', (done) => {
  const opts = {
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY,
    verbose: true,
    verboseDebugging: true,
  };
  sauceConnectLauncher(opts, (err, sauceConnectProcess) => {
    if (err) {
      done(err);
    } else {
      process.env.BASE_URL = 'http://localhost:8080';
      sshTunnel = sauceConnectProcess;
      // TODO(philipwalton): re-add this logic to close the tunnel once this is
      // fixed: https://github.com/bermi/sauce-connect-launcher/issues/116
      // process.on('exit', sshTunnel.close.bind(sshTunnel));
      done();
    }
  });
}));


gulp.task('test:e2e', gulp.series('js', 'lint', 'tunnel', 'selenium', () => {
  const stopServers = () => {
    // TODO(philipwalton): re-add this logic to close the tunnel once this is
    // fixed: https://github.com/bermi/sauce-connect-launcher/issues/116
    // process.on('exit', sshTunnel.close.bind(sshTunnel));
    sshTunnel.close();
    server.stop();
    if (!process.env.CI) {
      seleniumServer.kill();
    }
  };
  return gulp.src('./test/e2e/wdio.conf.js')
      .pipe(webdriver())
      .on('end', stopServers);
}));


gulp.task('test:unit', gulp.series('js', (done) => {
  spawn(
      './node_modules/.bin/easy-sauce',
      ['-c', 'test/unit/easy-sauce-config.json'],
      {stdio: [0, 1, 2]}).on('end', done);
}));


gulp.task('test', (done) => {
  runSequence('test:e2e', 'test:unit', done);
});


gulp.task('watch', gulp.series('serve', () => {
  gulp.watch('./lib/**/*.js', gulp.series('js:lib'));
  gulp.watch(['./lib/**/*.js', './test/unit/**/*-test.js'],
      gulp.series('js:test'));
}));
