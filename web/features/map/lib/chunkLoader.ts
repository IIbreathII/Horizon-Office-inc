// Pool of chunk workers with a priority queue (lower = sooner) and cancellation.
import type { BuiltChunk } from './chunkGeometry';
import type { WorkerRequest, WorkerResponse } from './chunkWorker';

interface Job {
  id: number;
  url: string;
  priority: number;
  resolve: (c: BuiltChunk) => void;
  reject: (e: Error) => void;
}

export class ChunkLoader {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: Job[] = [];
  private running = new Map<number, Job>();
  private nextId = 1;

  constructor(kinds: string[], size = Math.min(4, Math.max(2, (navigator.hardwareConcurrency || 4) - 1))) {
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('./chunkWorker.ts', import.meta.url), { type: 'module' });
      w.postMessage({ type: 'init', kinds } satisfies WorkerRequest);
      w.onmessage = (e: MessageEvent<WorkerResponse>) => this.finish(w, e.data);
      this.workers.push(w);
      this.idle.push(w);
    }
  }

  load(url: string, priority: number): { promise: Promise<BuiltChunk>; cancel: () => void } {
    let job: Job | undefined;
    const promise = new Promise<BuiltChunk>((resolve, reject) => {
      job = { id: this.nextId++, url, priority, resolve, reject };
    });
    // the Promise executor runs synchronously, so the job exists here
    const queued = job as Job;
    this.queue.push(queued);
    this.pump();
    return {
      promise,
      cancel: () => {
        const i = this.queue.indexOf(queued);
        if (i >= 0) {
          this.queue.splice(i, 1);
          queued.reject(new Error('cancelled'));
        }
      },
    };
  }

  /** Update the priority of jobs that have not started yet. */
  reprioritize(priorities: (url: string) => number | undefined) {
    for (const j of this.queue) j.priority = priorities(j.url) ?? j.priority;
  }

  private pump() {
    while (this.idle.length && this.queue.length) {
      this.queue.sort((a, b) => a.priority - b.priority);
      const job = this.queue.shift() as Job;
      const w = this.idle.pop() as Worker;
      this.running.set(job.id, job);
      w.postMessage({ type: 'load', id: job.id, url: job.url } satisfies WorkerRequest);
    }
  }

  private finish(w: Worker, msg: WorkerResponse) {
    const job = this.running.get(msg.id);
    this.running.delete(msg.id);
    this.idle.push(w);
    if (job) {
      if (msg.type === 'done') job.resolve(msg.chunk);
      else job.reject(new Error(msg.message));
    }
    this.pump();
  }

  dispose() {
    this.workers.forEach((w) => w.terminate());
    for (const j of [...this.queue, ...this.running.values()]) j.reject(new Error('disposed'));
    this.queue = [];
    this.running.clear();
  }
}
