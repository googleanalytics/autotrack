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


var express = require('express');
var fs = require('fs-extra');
var path = require('path');
var qs = require('querystring');
var serveStatic = require('serve-static');
var url = require('url');


var server;


var LOG_PATH = './test/logs';


function getLogFile(testId) {
  return path.join(LOG_PATH, testId + '.log');
}


module.exports = {
  start: function start(done) {
    var app = express();
    app.use(serveStatic('./'));

    app.get('/collect/:testId', function(request, response) {
      var payload = url.parse(request.url).query;
      var logFile = getLogFile(request.params.testId);
      fs.ensureDirSync('./test/logs');
      fs.appendFileSync(logFile, payload + '\n');
      response.end();
    });

    app.post('/collect/:testId', function(request, response) {
      var chunks = [];
      request.on('data', function(chunk) {
        chunks.push(chunk);
      }).on('end', function() {
        var payload = Buffer.concat(chunks).toString();
        var logFile = getLogFile(request.params.testId);
        fs.ensureDirSync('./test/logs');
        fs.appendFileSync(logFile, payload + '\n');
      });
      response.end();
    });

    server = app.listen(8080, done);
  },

  stop: function() {
    fs.removeSync('./test/logs');
    server.close();
  },

  getHitLogs: function(testId) {
    var logFile = getLogFile(testId);
    if (fs.existsSync(logFile)) {
      var contents;
      try {
        contents = fs.readFileSync(logFile, 'utf-8');
      } catch(e) {
        process.stderr.write(e + '\n');
      }
      return contents.trim().split('\n').map(function(hit) {
        return qs.parse(hit);
      });
    } else {
      return [];
    }
  },

  removeHitLogs: function(testId) {
    fs.removeSync(getLogFile(testId));
  }
};
