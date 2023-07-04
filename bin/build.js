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


/* eslint-env node */
/* eslint require-jsdoc: "off" */
/* eslint no-throw-literal: "off" */

const fs = require('fs-extra');
const glob = require('glob');
const {compile}= require('google-closure-compiler-js');
const {rollup} = require('rollup');
const virtual = require('rollup-plugin-virtual');
const nodeResolve = require('rollup-plugin-node-resolve');
const path = require('path');
const {SourceMapGenerator, SourceMapConsumer} = require('source-map');


const kebabCase = (str) => {
  return str.replace(/([A-Z])/g, (match, p1) => `-${p1.toLowerCase()}`);
};


module.exports = async (output, autotrackPlugins = []) => {
  const input = path.resolve(__dirname, '../lib/index.js');

  const plugins = [];
  if (autotrackPlugins.length) {
    const pluginPath = path.resolve(__dirname, '../lib/plugins');

    // Generate the input file based on the autotrack plugins to bundle.
    plugins.push(virtual({
      [input]: autotrackPlugins
          .map((plugin) => `import '${pluginPath}/${kebabCase(plugin)}';`)
          .join('\n'),
    }));
  }
  plugins.push(nodeResolve());

  const bundle = await rollup({input, plugins});
  const rollupResult = await bundle.generate({
    format: 'es',
    dest: output,
    sourcemap: true, // Note: lowercase "m" in sourcemap.
  });

  const externsDir = path.resolve(__dirname, '../lib/externs');
  const externs = glob.sync(path.join(externsDir, '*.js'))
      .reduce((acc, cur) => acc + fs.readFileSync(cur, 'utf-8'), '');

  const closureFlags = {
    jsCode: [{
      src: rollupResult.code,
      path: path.basename(output),
    }],
    compilationLevel: 'ADVANCED',
    useTypesForOptimization: true,
    outputWrapper:
        '(function(){%output%})();\n' +
        `//# sourceMappingURL=${path.basename(output)}.map`,
    assumeFunctionWrapper: true,
    rewritePolyfills: false,
    warningLevel: 'VERBOSE',
    createSourceMap: true,
    externs: [{src: externs}],
  };

  const closureResult = compile(closureFlags);

  if (closureResult.errors.length || closureResult.warnings.length) {
    const rollupMap = await new SourceMapConsumer(rollupResult.map);

    // Remap errors from the closure compiler output to the original
    // files before rollup bundled them.
    const remap = (type) => (item) => {
      let {line, column, source} = rollupMap.originalPositionFor({
        line: item.lineNo,
        column: item.charNo,
      });
      source = path.relative('.', path.resolve(__dirname, '..', source));
      return {type, line, column, source, desc: item.description};
    };

    throw {
      errors: [
        ...closureResult.errors.map(remap('error')),
        ...closureResult.warnings.map(remap('warning')),
      ],
    };
  } else {
    // Currently, closure compiler doesn't support applying its generated
    // source map to an existing source map, so we do it manually.
    const fromMap = JSON.parse(closureResult.sourceMap);
    const toMap = rollupResult.map;

    const generator = SourceMapGenerator.fromSourceMap(
        await new SourceMapConsumer(fromMap));

    generator.applySourceMap(
        await new SourceMapConsumer(toMap), path.basename(output));

    const sourceMap = generator.toString();

    return {
      code: closureResult.compiledCode,
      map: sourceMap,
    };
  }
};
