// import babelify from 'babelify';

import babelify from 'babelify';
import browserify from 'browserify';
import buffer from 'vinyl-buffer';
import connect from 'connect';
import gulp from 'gulp';
import gulpIf from 'gulp-if';
import gutil from 'gulp-util';
import mocha from 'gulp-mocha';
import rename from 'gulp-rename';
import shell from 'shelljs';
import serveStatic from 'serve-static';
import source from 'vinyl-source-stream';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';


let server;


function isProd() {
  return process.env.NODE_ENV == 'production';
}


function streamError(err) {
  gutil.beep();
  gutil.log(err instanceof gutil.PluginError ? err.toString() : err.stack);
}


gulp.task('javascript', function() {
  let entry = './index.js';
  let opts = {debug: true, detectGlobals: false, standalone: 'ga.autotrack'};
  return browserify(entry, opts)
      .transform(babelify)
      .bundle()
      .on('error', streamError)
      .pipe(source(entry))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(gulpIf(isProd(), uglify()))
      .pipe(rename((path) => path.basename = 'autotrack'))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./dist'));
});


gulp.task('test', ['serve', 'javascript'], function() {
  var stream = gulp.src('test/**/*.js', {read: false})
      .pipe(mocha({timeout: process.env.TEST_TIMEOUT || 10 * 1000}));

  stream.on('end', function() {
    server.close();
  });
});


gulp.task('serve', function(done) {
  server = connect().use(serveStatic('./test')).listen(4040, done);
});
