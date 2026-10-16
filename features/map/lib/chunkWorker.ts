// Web Worker: downloads a binary chunk, decodes it and builds geometry buffers off the main thread.
import { decodeChunk } from './chunkFormat';
import { buildChunk, setKinds, transferables, type BuiltChunk } from './chunkGeometry';

export type WorkerRequest = { type: 'init'; kinds: string[] } | { type: 'load'; id: number; url: string };
export type WorkerResponse =
  | { type: 'done'; id: number; chunk: BuiltChunk }
  | { type: 'error'; id: number; message: string };

// Typed as a Worker: the project's TS lib is DOM, not WebWorker
const worker = self as unknown as Worker;

worker.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    setKinds(msg.kinds);
    return;
  }
  try {
    const res = await fetch(msg.url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${msg.url}`);
    const chunk = buildChunk(decodeChunk(await res.arrayBuffer()));
    worker.postMessage({ type: 'done', id: msg.id, chunk } satisfies WorkerResponse, transferables(chunk));
  } catch (err) {
    worker.postMessage({ type: 'error', id: msg.id, message: String(err) } satisfies WorkerResponse);
  }
});
