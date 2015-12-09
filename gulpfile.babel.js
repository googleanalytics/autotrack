import babelify from 'babelify';
import browserify from 'browserify';
import buffer from 'vinyl-buffer';
import connect from 'connect';
import gulp from 'gulp';
import gulpIf from 'gulp-if';
import gutil from 'gulp-util';
import mocha from 'gulp-mocha';
import shell from 'shelljs';
import serveStatic from 'serve-static';
import source from 'vinyl-source-stream';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';


let server;


function isProd() {
  return process.env.NODE_ENV == 'production';
}


gulp.task('javascript', function(done) {
  browserify('./', {
    debug: true,
    detectGlobals: false,
    standalone: 'ga.autotrack'
  })
  .transform(babelify)
  .bundle()

  // TODO(philipwalton): Add real error handling.
  // This temporary hack fixes an issue with tasks not restarting in
  // watch mode after a syntax error is fixed.
  .on('error', (err) => { gutil.beep(); done(err); })
  .on('end', done)

  .pipe(source('./autotrack.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(gulpIf(isProd(), uglify()))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./dist'));
});


gulp.task('test', ['serve', 'javascript'], function() {
  let stream = gulp.src('test/**/*.js', {read: false})
      .pipe(mocha({timeout: process.env.TEST_TIMEOUT || 10 * 1000}));

  stream.on('end', () => server.close())
});


gulp.task('serve', ['javascript'], function(done) {
  server = connect().use(serveStatic('./')).listen(8080, done);
});


gulp.task('watch', ['serve'], function() {
  gulp.watch('./lib/**/*.js', ['javascript']);
});
