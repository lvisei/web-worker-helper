import type { WorkerObject, WorkerOptions, WorkerContext, WorkerMessageType, WorkerMessagePayload } from '../types';
import type WorkerJob from '../worker-farm/worker-job';
import WorkerFarm from '../worker-farm/worker-farm';
import { removeNontransferableOptions } from '../utils/worker-utils/remove-nontransferable-options';
import { getWorkerURL, getWorkerName } from './get-worker-url';

type ProcessOnWorkerOptions = WorkerOptions & {
  jobName?: string;
  [key: string]: any;
};

/**
 * Determines if we can parse with worker
 * @param loader
 * @param data
 * @param options
 */
export function canProcessOnWorker(worker: WorkerObject, options?: WorkerOptions) {
  if (!WorkerFarm.isSupported()) {
    return false;
  }

  return worker.worker && options?.worker;
}

/**
 * This function expects that the worker thread sends certain messages,
 * Creating such a worker can be automated if the worker is wrapper by a call to createWorker
 */
export async function processOnWorker(
  worker: WorkerObject,
  data: any,
  options: ProcessOnWorkerOptions = {},
  context: WorkerContext = {}
): Promise<any> {
  const name = getWorkerName(worker);
  const url = getWorkerURL(worker, options);

  const workerFarm = WorkerFarm.getWorkerFarm(options);
  const workerPool = workerFarm.getWorkerPool({ name, url });

  const jobName = options.jobName || worker.name;
  const job = await workerPool.startJob(jobName, onMessage.bind(null, context));

  // Kick off the processing in the worker
  const transferableOptions = removeNontransferableOptions(options);
  job.postMessage('process', { input: data, options: transferableOptions });

  const result = await job.result;
  return result.result;
}

/**
 * Job completes when we receive the result
 * @param job
 * @param message
 */
async function onMessage(
  context: WorkerContext,
  job: WorkerJob,
  type: WorkerMessageType,
  payload: WorkerMessagePayload
) {
  switch (type) {
    case 'done':
      // Worker is done
      job.done(payload);
      break;

    case 'error':
      // Worker encountered an error
      job.error(new Error(payload.error));
      break;

    case 'process':
      // Worker is asking for us (main thread) to process something
      // eslint-disable-next-line no-case-declarations
      const { id, input, options } = payload;
      try {
        if (!context.process) {
          job.postMessage('error', { id, error: 'Worker not set up to process on main thread' });
          return;
        }
        const result = await context.process(input, options);
        job.postMessage('done', { id, result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        job.postMessage('error', { id, error: message });
      }
      break;

    default:
      console.warn(`process-on-worker: unknown message ${type}`);
  }
}
