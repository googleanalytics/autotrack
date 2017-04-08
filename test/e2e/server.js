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


import assert from 'assert';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import qs from 'querystring';
import serveStatic from 'serve-static';
import url from 'url';
import * as ga from './ga';


const LOG_PATH = './test/logs';


let server;


/**
 * Starts the express log server.
 * @param {Function} done A callback to invoke once the server is up.
 */
export function start(done) {
  const app = express();
  app.use(serveStatic('./'));

  app.get('/collect/:testId', (request, response) => {
    const payload = url.parse(request.url).query;
    logPayload(payload);
    const logFile = getLogFile(request.params.testId);
    fs.ensureDirSync('./test/logs');
    fs.appendFileSync(logFile, payload + '\n');
    response.end();
  });

  app.post('/collect/:testId', (request, response) => {
    const chunks = [];
    request.on('data', (chunk) => {
      chunks.push(chunk);
    }).on('end', () => {
      const payload = Buffer.concat(chunks).toString();
      logPayload(payload);
      const logFile = getLogFile(request.params.testId);
      fs.ensureDirSync('./test/logs');
      fs.appendFileSync(logFile, payload + '\n');
    });
    response.end();
  });

  server = app.listen(8080, done);
}


/**
 * Stops the log server and deletes the logs.
 */
export function stop() {
  fs.removeSync('./test/logs');
  server.close();
}


/**
 * Gets the log data for the passed test ID.
 * @param {string} testId The test ID of the log to get.
 * @return {Array} An array of hit objects sorted by hit time.
 */
export function getHitLogs(testId) {
  const logFile = getLogFile(testId);
  if (fs.existsSync(logFile)) {
    let contents;
    try {
      contents = fs.readFileSync(logFile, 'utf-8');
    } catch(e) {
      process.stderr.write(e + '\n');
    }
    return contents.trim().split('\n')
        .map((hit) => qs.parse(hit))
        .sort((a, b) => Number(a.time) - Number(b.time));
  } else {
    return [];
  }
}


/**
 * Removes the log file for the passed test ID.
 * @param {string} testId The test ID of the log to remove.
 */
export function removeHitLogs(testId) {
  fs.removeSync(getLogFile(testId));
}


/**
 * Binds accessor methods to test logs for the passed test ID.
 * @param {string} testId
 * @return {!Object} An object of log accessor methods.
 */
export function bindLogAccessors(testId) {
  const getHits = getHitLogs.bind(server, testId);
  const removeHits = removeHitLogs.bind(server, testId);

  const hitCountEquals = (count) => {
    return () => getHitLogs(testId).length === count;
  };

  const hitCountIsAtLeast = (count) => {
    return () => getHitLogs(testId).length >= count;
  };

  const assertNoHitsReceived = () => {
    assert.strictEqual(getHits().length, 0);

    browser.execute(ga.sendEmptyHit, browser.options.baseUrl, testId);
    browser.waitUntil(hitCountEquals(1));
    assert.strictEqual(getHits()[0].empty, '1');
    removeHits();
  };

  return {getHits, removeHits, hitCountEquals,
      hitCountIsAtLeast, assertNoHitsReceived};
}


/**
 * Gets the file path to the log file for the passed test ID.
 * @param {string} testId The test ID of the log to get.
 * @return {string} The log's file path.
 */
function getLogFile(testId) {
  return path.join(LOG_PATH, testId + '.log');
}


/**
 * Accepts a hit payload and logs the relevant params to the console if
 * the `AUTOTRACK_ENV` environment variable is set to 'debug'.
 * @param {string} payload The hit payload.
 */
function logPayload(payload) {
  if (process.env.AUTOTRACK_ENV == 'debug') {
    const paramsToIgnore = [
      'v',
      'did',
      'tid',
      'a',
      'z',
      'ul',
      'de',
      'sd',
      'sr',
      'vp',
      'je',
      'fl',
      'jid',
    ];
    const hit = qs.parse(payload);
    process.stdout.write('-------------------------------------\n');
    Object.keys(hit).forEach((key) => {
      if (!(key.charAt(0) === '_' || paramsToIgnore.includes(key))) {
        process.stdout.write('  ' + key + ': ' + hit[key] + '\n');
      }
    });
  }
}
