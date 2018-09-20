/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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


import {rIC} from 'idlize/idle-callback-polyfills.mjs';


export const when = async (fn, intervalMillis = 100, retries = 20) => {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMillis));
  }
  throw new Error(`${fn} didn't return true after ${retries} retries.`);
};

export const getIdleDeadlinePrototype = async () => {
  return await new Promise((resolve) => {
    rIC((deadline) => resolve(deadline.constructor.prototype));
  });
};
