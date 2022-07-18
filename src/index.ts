export const version = '0.0.3';

import type { WorkerObject } from './types';

// TYPES
export type {
  WorkerObject,
  WorkerOptions,
  WorkerMessage,
  WorkerMessageType,
  WorkerMessageData,
  WorkerMessagePayload,
} from './types';

// GENERAL UTILS
export { assert } from './utils/env-utils/assert';
export { isWorker } from './utils/env-utils/globals';

// WORKER UTILS - TYPES
export { default as WorkerJob } from './worker-farm/worker-job';
export { default as WorkerThread } from './worker-farm/worker-thread';

// WORKER FARMS
export { default as WorkerFarm } from './worker-farm/worker-farm';
export { default as WorkerPool } from './worker-farm/worker-pool';
export { default as WorkerBody } from './worker-farm/worker-body';

export { processOnWorker, canProcessOnWorker } from './worker-api/process-on-worker';
export { createWorker } from './worker-api/create-worker';

// WORKER UTILS - EXPORTS
export { getWorkerURL } from './worker-api/get-worker-url';
export { getTransferList } from './utils/worker-utils/get-transfer-list';

// LIBRARY UTILS
export { getLibraryUrl, loadLibrary } from './utils/library-utils/library-utils';

// PARSER UTILS
export { default as AsyncQueue } from './async-queue/async-queue';

// WORKER OBJECTS

/** A null worker to test that worker processing is functional */
export const NullWorker: WorkerObject = {
  id: 'null',
  name: 'null',
  module: 'web-worker-helper',
  options: {},
};
