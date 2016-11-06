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


var LOG_PATH = './test/logs';


var server;


/**
 * Gets the file path to the log file for the passed test ID.
 * @param {string} testId The test ID of the log to get.
 * @return {string} The log's file path.
 */
function getLogFile(testId) {
  return path.join(LOG_PATH, testId + '.log');
}


module.exports = {
  /**
   * Starts the express log server.
   * @param {Function} done A callback to invoke once the server is up.
   */
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

  /**
   * Stops the log server and deletes the logs.
   */
  stop: function() {
    fs.removeSync('./test/logs');
    server.close();
  },

  /**
   * Gets the log data for the passed test ID.
   * @param {string} testId The test ID of the log to get.
   * @return {Array} An array of hit objects sorted by index corresponding
   *     to the order in which they were sent.
   */
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
      }).sort(function(a, b) {
        return Number(a.index) - Number(b.index);
      });
    } else {
      return [];
    }
  },

  /**
   * Removes the log file for the passed test ID.
   * @param {string} testId The test ID of the log to remove.
   */
  removeHitLogs: function(testId) {
    fs.removeSync(getLogFile(testId));
  }
};
