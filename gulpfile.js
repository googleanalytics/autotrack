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


/* eslint-env node */
/* eslint require-jsdoc: "off" */


const babelify = require('babelify');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const eslint = require('gulp-eslint');
const fs = require('fs');
const globby = require('globby');
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const gutil = require('gulp-util');
const sauceConnectLauncher = require('sauce-connect-launcher');
const seleniumServerJar = require('selenium-server-standalone-jar');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const {spawn} = require('child_process');
const through = require('through2');
const uglify = require('gulp-uglify');
const webdriver = require('gulp-webdriver');
const pkg = require('./package.json');
const server = require('./test/server');


let seleniumServer;
let sshTunnel;


/**
 * @return {boolean} True if NODE_ENV is production.
 */
function isProd() {
  return process.env.NODE_ENV == 'production';
}


gulp.task('javascript', function() {
  // Gets the license string from this file (the first 15 lines),
  // and adds an @license tag.
  const license = fs.readFileSync(__filename, 'utf-8')
      .split('\n').slice(0, 15)
      .join('\n').replace(/^\/\*\*/, '/**\n * @license');

  const version = '/*! autotrack.js v' + pkg.version + ' */';

  return browserify('./', {
    debug: true,
    detectGlobals: false,
  })
  .transform(babelify, {presets: ['es2015']})
  .bundle()
  .pipe(source('./autotrack.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .on('error', gutil.log)
  .pipe(gulpIf(isProd(), uglify({
    output: {preamble: license + '\n\n' + version}
  })))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./'));
});


gulp.task('javascript:unit', function () {
  // From the browserify with glob recipe:
  // https://goo.gl/UprlbI
  const bundledStream = through();

  bundledStream
      .pipe(source('index.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .on('error', gutil.log)
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./test/unit/'));

  globby(['./test/unit/**/*-test.js']).then(function(entries) {
    browserify({entries: entries, debug: true})
        .transform(babelify, {presets: ['es2015']})
        .bundle()
        .pipe(bundledStream);
  }).catch(function(err) {
    bundledStream.emit('error', err);
  });

  return bundledStream;
});


gulp.task('lint', function () {
  return gulp.src([
        'gulpfile.js',
        'lib/*.js',
        'lib/plugins/*.js',
        'test/**/*.js',
        '!test/unit/index.js',
      ])
      .pipe(eslint({fix: true}))
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
});


gulp.task('test', ['javascript', 'lint', 'tunnel', 'selenium'], function() {
  function stopServers() {
    sshTunnel.close();
    server.stop();
    if (!process.env.CI) {
      seleniumServer.kill();
    }
  }
  return gulp.src('./wdio.conf.js')
      .pipe(webdriver())
      .on('end', stopServers);
});


gulp.task('test:unit', ['javascript', 'javascript:unit'], function(done) {
  spawn('./node_modules/.bin/easy-sauce', {stdio: [0, 1, 2]}).on('end', done);
});


gulp.task('tunnel', ['serve'], function(done) {
  const opts = {
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY,
    verbose: true,
  };
  sauceConnectLauncher(opts, function(err, sauceConnectProcess) {
    if (err) {
      done(err);
    } else {
      process.env.BASE_URL = 'http://localhost:8080';
      sshTunnel = sauceConnectProcess;
      process.on('exit', sshTunnel.close.bind(sshTunnel));
      done();
    }
  });
});


gulp.task('serve', ['javascript', 'javascript:unit'], function(done) {
  server.start(done);
  process.on('exit', server.stop.bind(server));
});


gulp.task('selenium', function(done) {
  // Don't start the selenium server on CI.
  if (process.env.CI) return done();

  seleniumServer = spawn('java',  ['-jar', seleniumServerJar.path]);
  seleniumServer.stderr.on('data', function(data) {
    if (data.indexOf('Selenium Server is up and running') > -1) {
      done();
    }
  });
  process.on('exit', seleniumServer.kill.bind(seleniumServer));
});


gulp.task('watch', ['serve'], function() {
  gulp.watch('./lib/**/*.js', ['javascript']);
  gulp.watch([
    './lib/**/*.js',
    './test/unit/**/*-test.js'
  ], ['javascript:unit']);
});


gulp.task('build', ['test']);
