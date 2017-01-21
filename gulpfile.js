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


const {spawn} = require('child_process');
const eslint = require('gulp-eslint');
const fs = require('fs');
const glob = require('glob');
const {compile} = require('google-closure-compiler-js');
const gulp = require('gulp');
const gutil = require('gulp-util');
const webdriver = require('gulp-webdriver');
const {rollup} = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const babel = require('rollup-plugin-babel');
const sauceConnectLauncher = require('sauce-connect-launcher');
const seleniumServerJar = require('selenium-server-standalone-jar');
const {SourceMapGenerator, SourceMapConsumer} = require('source-map');
const webpack = require('webpack');
const server = require('./test/server');


let seleniumServer;
let sshTunnel;


/**
 * @return {boolean} True if NODE_ENV is production.
 */
function isProd() {
  return process.env.NODE_ENV == 'production';
}


gulp.task('javascript', function(done) {
  const rollupPlugins = [nodeResolve()];

  // In production, closure compiler will take care of converting the code
  // to ES5. In dev, we let babel do it.
  if (!isProd()) {
    rollupPlugins.push(babel({
      babelrc: false,
      plugins: ['external-helpers'],
      presets: [['es2015', {modules: false}]],
    }));
  }

  rollup({entry: './lib/index.js', plugins: rollupPlugins}).then((bundle) => {
    // In production mode, use Closure Compiler to bundle autotrack.js
    // otherwise just output the rollup result as it's much faster.
    if (isProd()) {
      const rollupResult = bundle.generate({
        format: 'es',
        dest: 'autotrack.js',
        sourceMap: true,
      });

      const externs = glob.sync('./lib/externs/*.js').reduce((acc, cur) => {
        return acc + fs.readFileSync(cur, 'utf-8');
      }, '');

      const closureFlags = {
        jsCode: [{
          src: rollupResult.code,
          path: './autotrack.js',
          sourceMap: rollupResult.map,
        }],
        compilationLevel: 'ADVANCED',
        useTypesForOptimization: true,
        outputWrapper:
            '(function(){%output%})();\n//# sourceMappingURL=autotrack.js.map',
        assumeFunctionWrapper: true,
        rewritePolyfills: false,
        warningLevel: 'VERBOSE',
        applyInputSourceMaps: true,
        createSourceMap: true,
        externs: [{src: externs}],
      };
      const closureResult = compile(closureFlags);

      if (closureResult.errors.length || closureResult.warnings.length) {
        fs.writeFileSync('autotrack.js', rollupResult.code, 'utf-8');
        const results = {
          errors: closureResult.errors,
          warnings: closureResult.warnings,
        };
        done(new Error(JSON.stringify(results, null, 2)));
      } else {
        // Currently, closure compiler doesn't support applying its generated
        // source map to an existing source map, so we do it manually.
        const fromMap = JSON.parse(closureResult.sourceMap);
        const toMap = rollupResult.map;
        const generator = SourceMapGenerator.fromSourceMap(
            new SourceMapConsumer(fromMap));

        generator.applySourceMap(new SourceMapConsumer(toMap));

        fs.writeFileSync('autotrack.js', closureResult.compiledCode, 'utf-8');
        fs.writeFileSync('autotrack.js.map', generator.toString(), 'utf-8');
        done();
      }
    } else {
      bundle.write({
        dest: `autotrack.js`,
        format: 'iife',
        sourceMap: true,
      });
      done();
    }
  });
});


gulp.task('javascript:unit', ((compiler) => {
  const createCompiler = () => {
    return webpack({
      entry: glob.sync('./test/unit/*-test.js'),
      output: {
        path: 'test/unit',
        filename: 'index.js',
      },
      devtool: '#source-map',
      cache: {},
      performance: {hints: false},
      module: {
        loaders: [{
          test: /\.js$/,
          exclude: /node_modules\/(?!(dom-utils)\/).*/,
          loader: 'babel-loader',
          query: {
            babelrc: false,
            cacheDirectory: false,
            presets: [
              ['es2015', {'modules': false}],
            ],
          },
        }],
      },
    });
  };
  return (done) => {
    (compiler || (compiler = createCompiler())).run(function(err, stats) {
      if (err) throw new gutil.PluginError('webpack', err);
      gutil.log('[webpack]', stats.toString('minimal'));
      done();
    });
  };
})());


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
