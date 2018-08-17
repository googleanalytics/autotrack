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

import IdleQueue from './idle-queue';


const instances = {};

/**
 * Gets an existing instance for the passed arguments or creates a new
 * instance if one doesn't exist.
 * @param {!Tracker} tracker An analytics.js tracker object.
 * @return {!IdleQueue}
 */
export const getOrCreateTrackerQueue = (tracker) => {
  // Don't create multiple instances for the same property.
  const trackingId = tracker.get('trackingId');
  if (!instances[trackingId]) {
    instances[trackingId] = new IdleQueue();
  }
  return instances[trackingId];
};

