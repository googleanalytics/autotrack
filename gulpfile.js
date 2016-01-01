var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var connect = require('connect');
var gulp = require('gulp');
var gutil = require('gulp-util');
var seleniumServerJar = require('selenium-server-standalone-jar');
var shell = require('shelljs');
var serveStatic = require('serve-static');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var spawn = require('child_process').spawn;
var uglify = require('gulp-uglify');
var webdriver = require('gulp-webdriver');


var server;


gulp.task('javascript', function(done) {
  browserify('./', {debug: true})
  .bundle()

  // TODO(philipwalton): Add real error handling.
  // This temporary hack fixes an issue with tasks not restarting in
  // watch mode after a syntax error is fixed.
  .on('error', function(err) { gutil.beep(); done(err); })
  .on('end', done)

  .pipe(source('./autotrack.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(uglify())
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./'));
});


gulp.task('test', ['javascript', 'serve', 'selenium'], function() {
  function stopServers() {
    server.close();
    if (!process.env.CI) seleniumServer.kill();
  }
  return gulp.src('./wdio.conf.js')
      .pipe(webdriver())
      .on('end', stopServers);
});


gulp.task('serve', ['javascript'], function(done) {
  server = connect().use(serveStatic('./')).listen(8080, done);
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
});


gulp.task('watch', ['serve'], function() {
  gulp.watch('./lib/**/*.js', ['javascript']);
});
