#!/usr/bin/env node


/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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


/* eslint no-console: "off" */


const chalk = require('chalk');
const fs = require('fs-extra');
const gzipSize = require('gzip-size');
const minimist = require('minimist');
const path = require('path');
const build = require('./build');
const logErrors = require('./errors');


const argv = minimist(process.argv.slice(2));
const noArgsPassed = Object.keys(argv).length === 1 && argv._.length === 0;
const output = argv.o || argv.output || 'autotrack.js';
const plugins = (argv.p || argv.plugins || '').split(/\s*,\s*/);


if (argv.h || argv.help || noArgsPassed) {
  fs.createReadStream(path.join(__dirname, '../bin/usage.txt'))
      .pipe(process.stderr);
} else {
  const {cyan, gray, green, red} = chalk;

  if (!(plugins.length)) {
    console.error(red('At least one plugin must be specified'));
    process.exit(1);
  }

  build(output, plugins)
      .then(({code, map}) => {
        fs.outputFileSync(output, code, 'utf-8');
        fs.outputFileSync(`${output}.map`, map, 'utf-8');

        const size = (gzipSize.sync(code) / 1000).toFixed(1);

        console.log(green(`\nGreat success!\n`));
        console.log(cyan('Built: ') +
            `${output} ${gray(`(${size} Kb gzipped)`)}`);
        console.log(cyan('Built: ') +
            `${output}.map\n`);
      })
      .catch(logErrors)
      .catch(console.error.bind(console));
}
