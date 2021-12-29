import type { WorkerMessageType, WorkerMessagePayload } from '../types';
import { isMobile } from '../utils/env-utils/globals';
import WorkerThread from './worker-thread';
import WorkerJob from './worker-job';

/** WorkerPool onDebug Callback Parameters */
type OnDebugParameters = {
  message: string;
  name: string;
  backlog: number;
  workerThread: WorkerThread;
};

/** WorkerPool Properties */
export type WorkerPoolProps = {
  name?: string;
  source?: string;
  url?: string;
  maxConcurrency?: number;
  maxMobileConcurrency?: number;
  onDebug?: (options: OnDebugParameters) => any;
  reuseWorkers?: boolean;
};

/** Private helper types */
type OnMessage = (job: WorkerJob, type: WorkerMessageType, payload: WorkerMessagePayload) => void;
type OnError = (job: WorkerJob, error: Error) => void;

type QueuedJob = {
  name: string;
  onMessage: OnMessage;
  onError: OnError;
  onStart: (value: any) => void; // Resolve job start promise
};

/**
 * Process multiple data messages with small pool of identical workers
 */
export default class WorkerPool {
  public name = 'unnamed';
  public source?: string;
  public url?: string;
  public maxConcurrency = 1;
  public maxMobileConcurrency = 1;
  public onDebug: (options: OnDebugParameters) => any = () => {};
  public reuseWorkers = true;

  private props: WorkerPoolProps = {};
  private jobQueue: QueuedJob[] = [];
  private idleQueue: WorkerThread[] = [];
  private count = 0;
  private isDestroyed = false;

  constructor(props: WorkerPoolProps) {
    this.source = props.source;
    this.url = props.url;
    this.setProps(props);
  }

  /**
   * Terminates all workers in the pool
   * @note Can free up significant memory
   */
  public destroy() {
    // Destroy idle workers, active Workers will be destroyed on completion
    this.idleQueue.forEach((worker) => worker.destroy());
    this.isDestroyed = true;
  }

  public setProps(props: WorkerPoolProps) {
    this.props = { ...this.props, ...props };

    if (props.name !== undefined) {
      this.name = props.name;
    }
    if (props.maxConcurrency !== undefined) {
      this.maxConcurrency = props.maxConcurrency;
    }
    if (props.maxMobileConcurrency !== undefined) {
      this.maxMobileConcurrency = props.maxMobileConcurrency;
    }
    if (props.reuseWorkers !== undefined) {
      this.reuseWorkers = props.reuseWorkers;
    }
    if (props.onDebug !== undefined) {
      this.onDebug = props.onDebug;
    }
  }

  public async startJob(
    name: string,
    onMessage: OnMessage = (job, type, data) => job.done(data),
    onError: OnError = (job, error) => job.error(error)
  ): Promise<WorkerJob> {
    // Promise resolves when thread starts working on this job
    const startPromise = new Promise<WorkerJob>((onStart) => {
      // Promise resolves when thread completes or fails working on this job
      this.jobQueue.push({ name, onMessage, onError, onStart });
      return this;
    });
    this.startQueuedJob();
    return await startPromise;
  }

  /**
   * Starts first queued job if worker is available or can be created
   * Called when job is started and whenever a worker returns to the idleQueue
   */
  private async startQueuedJob(): Promise<void> {
    if (!this.jobQueue.length) {
      return;
    }

    const workerThread = this.getAvailableWorker();
    if (!workerThread) {
      return;
    }

    // We have a worker, dequeue and start the job
    const queuedJob = this.jobQueue.shift();
    if (queuedJob) {
      this.onDebug({
        message: 'Starting job',
        name: queuedJob.name,
        backlog: this.jobQueue.length,
        workerThread,
      });

      // Create a worker job to let the app access thread and manage job completion
      const job = new WorkerJob(queuedJob.name, workerThread);

      // Set the worker thread's message handlers
      workerThread.onMessage = (data) => queuedJob.onMessage(job, data.type, data.payload);
      workerThread.onError = (error) => queuedJob.onError(job, error);

      // Resolve the start promise so that the app can start sending messages to worker
      queuedJob.onStart(job);

      // Wait for the app to signal that the job is complete, then return worker to queue
      try {
        await job.result;
      } finally {
        this.returnWorkerToQueue(workerThread);
      }
    }
  }

  /**
   * Returns a worker to the idle queue
   * Destroys the worker if
   *  - pool is destroyed
   *  - if this pool doesn't reuse workers
   *  - if maxConcurrency has been lowered
   */
  private returnWorkerToQueue(worker: WorkerThread) {
    const shouldDestroyWorker = this.isDestroyed || !this.reuseWorkers || this.count > this.getMaxConcurrency();

    if (shouldDestroyWorker) {
      worker.destroy();
      this.count--;
    } else {
      this.idleQueue.push(worker);
    }

    if (!this.isDestroyed) {
      this.startQueuedJob();
    }
  }

  /**
   * Returns idle worker or creates new worker if maxConcurrency has not been reached
   */
  private getAvailableWorker(): WorkerThread | null {
    // If a worker has completed and returned to the queue, it can be used
    if (this.idleQueue.length > 0) {
      return this.idleQueue.shift() || null;
    }

    // Create fresh worker if we haven't yet created the max amount of worker threads for this worker source
    if (this.count < this.getMaxConcurrency()) {
      this.count++;
      const name = `${this.name.toLowerCase()} (#${this.count} of ${this.maxConcurrency})`;
      return new WorkerThread({ name, source: this.source, url: this.url });
    }

    // No worker available, have to wait
    return null;
  }

  private getMaxConcurrency() {
    return isMobile ? this.maxMobileConcurrency : this.maxConcurrency;
  }
}
