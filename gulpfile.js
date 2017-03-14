// Use babel to resolve ES2015 modules and include the Babel gulpfile
require('babel-register')({
    presets: ['es2015'],
});

require('./gulpfile.babel.js');
