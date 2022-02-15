# web-worker-helper

> Forked from [@loaders.gl/worker-utils](https://github.com/visgl/loaders.gl/blob/master/modules/worker-utils/README.md) refactoring

## Time consuming task

```ts
// fibonacci.js
export function fibonacci(n: number) {
  let n1 = 1,
    n2 = 1,
    sum = 1;
  for (let i = 3; i <= n; i += 1) {
    sum = n1 + n2;
    n1 = n2;
    n2 = sum;
  }
  return sum;
}
```

## Creating workers for time-consuming task

```ts
// fibonacci.worker.js
import { createWorker } from 'web-worker-helper';
import { fibonacci } from './fibonacci';

createWorker(async (data: number, options?: Record<string, any>) => {
  const result = fibonacci(data);
  return result;
});
```

## Bundle worker

## Main thread call worker

1. parse worker

```ts
import { getWorkerURL, WorkerFarm } from "17-worker";

export async function parseWorker(workerName: string, data: any, options?: Record<string, any> ) {
  const url = getWorkerURL (workerName, options);
  const workerFarm = WorkerFarm.getWorkerFarm({ maxConcurrency: 3, reuseWorkers: true });
  const workerPool = workerFarm.getWorkerPool({ name: workerName, url })
  // const workerPool = workerController.getWorkerPool({ name: workerName, url });
  const job = await workerPool.startJob(workerName, (job, type, data) => job.done(data));

  job.postMessage('process', { input: data })

  const result = await job.result;
  return result.result;
```

2. Call time-consuming task

```ts
import { parseWorker } from '17-worker';
import { fibonacci } from './fibonacci';

export async function starFibonacci(iskorker, data) {
  if (iskorker) {
    const result = await parseWorker('fibonacci-worker', data, {});
    return result;
  }

  const result = await fibonacci(data);
  return result;
}
```
