// World-space major-road polylines of the city (from the base chunks) that cars drive along.
// Filled by CityStreamer as base chunks load.
import type { PathBuffers } from '../lib/chunkGeometry';

/** A polyline as x, z pairs in world coordinates. */
export type Path = Float32Array;

export class CityPaths {
  roads: Path[] = [];
  /** Grows on every change, so traffic can tell when to pick up new roads. */
  version = 0;

  add(roads: Path[]) {
    if (!roads.length) return;
    this.roads = [...this.roads, ...roads];
    this.version++;
  }
}

/** Chunk-local path buffers → world paths (the chunk's SW corner is at originX, originZ). */
export function toWorldPaths(buf: PathBuffers | null, originX: number, originZ: number): Path[] {
  if (!buf) return [];
  const paths: Path[] = [];
  for (let i = 0; i + 1 < buf.starts.length; i++) {
    const from = buf.starts[i] * 2;
    const to = buf.starts[i + 1] * 2;
    const path = new Float32Array(to - from);
    for (let j = from; j < to; j += 2) {
      path[j - from] = buf.points[j] + originX;
      path[j - from + 1] = buf.points[j + 1] + originZ;
    }
    paths.push(path);
  }
  return paths;
}

const lengths = new WeakMap<Path, Float32Array>();

/** Cumulative length at every point of the path (last value = total length). */
export function pathLengths(path: Path): Float32Array {
  let cum = lengths.get(path);
  if (!cum) {
    cum = new Float32Array(path.length / 2);
    for (let i = 1; i < cum.length; i++) {
      cum[i] = cum[i - 1] + Math.hypot(path[i * 2] - path[i * 2 - 2], path[i * 2 + 1] - path[i * 2 - 1]);
    }
    lengths.set(path, cum);
  }
  return cum;
}

/** Point at distance `d` along the path and the direction of travel (unit x, z). */
export function sampleAlong(path: Path, d: number, out: { x: number; z: number; dx: number; dz: number }) {
  const cum = pathLengths(path);
  const total = cum[cum.length - 1];
  const dist = Math.min(Math.max(d, 0), total);
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < dist) i++;
  const segment = cum[i + 1] - cum[i] || 1;
  const t = (dist - cum[i]) / segment;
  const ax = path[i * 2], az = path[i * 2 + 1], bx = path[i * 2 + 2], bz = path[i * 2 + 3];
  out.x = ax + (bx - ax) * t;
  out.z = az + (bz - az) * t;
  const len = Math.hypot(bx - ax, bz - az) || 1;
  out.dx = (bx - ax) / len;
  out.dz = (bz - az) / len;
  return out;
}
