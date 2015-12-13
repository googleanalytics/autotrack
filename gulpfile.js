var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var connect = require('connect');
var gulp = require('gulp');
var gulpIf = require('gulp-if');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');
var shell = require('shelljs');
var serveStatic = require('serve-static');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');


var server;


function isProd() {
  return process.env.NODE_ENV == 'production';
}


gulp.task('javascript', function(done) {
  browserify('./', {
    debug: true,
    detectGlobals: false,
    standalone: 'ga.autotrack'
  })
  .bundle()

  // TODO(philipwalton): Add real error handling.
  // This temporary hack fixes an issue with tasks not restarting in
  // watch mode after a syntax error is fixed.
  .on('error', function(err) { gutil.beep(); done(err); })
  .on('end', done)

  .pipe(source('./autotrack.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(gulpIf(isProd(), uglify()))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./dist'));
});


gulp.task('test', ['serve', 'javascript'], function() {
  var stream = gulp.src('test/**/*.js', {read: false})
      .pipe(mocha({timeout: process.env.TEST_TIMEOUT || 10 * 1000}));

  stream.on('end', server.close.bind(server));
});


gulp.task('serve', ['javascript'], function(done) {
  server = connect().use(serveStatic('./')).listen(8080, done);
});


gulp.task('watch', ['serve'], function() {
  gulp.watch('./lib/**/*.js', ['javascript']);
});
