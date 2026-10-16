// Turns a decoded chunk into geometry buffers. Runs in the Web Worker (chunkWorker.ts):
// the output is typed arrays only, so it moves to the main thread without copying.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChunkData, Pt } from './chunkFormat';

// Stylized city palette, sampled from the design mockup (steel-blue city, cream ground, white roads).
const STEEL_BLUE = '#98add0';
const DARK_BLUE = '#6a84ae';
const ORANGE = '#f1aa67';

export const CITY_PALETTE = {
  background: '#e3eef7',
  ground: '#f0f0e8',
  water: '#69baf1',
  park: '#b1db9f',
  pedestrian: '#e8e6dc',
  roadMajor: '#ffffff',
  roadMinor: '#f8f8f8',
  roadFoot: '#e4e2da',
  /** Ordinary buildings: each takes a shade along this dark → light blue ramp (per-building random). */
  blueRamp: ['#58719c', DARK_BLUE, '#8096c2', STEEL_BLUE, '#b3c4e2'],
  /** Accent buildings by building=*; the shader adds a dark-bottom → light-top gradient to all. */
  buildings: {
    retail: ORANGE,
    church: ORANGE,
    cathedral: ORANGE,
    religious: ORANGE,
    commercial: ORANGE,
    hotel: ORANGE,
    government: ORANGE,
    public: ORANGE,
    civic: ORANGE,
  } as Record<string, string>,
  /** Brightness spread between accent buildings (0…1). */
  jitter: 0.12,
};

export interface InstancedBuffers {
  count: number;
  matrices: Float32Array; // 16 × count
  colors: Float32Array; // 3 × count, linear RGB
  cells: Float32Array; // count
}

export interface MeshBuffers {
  position: Float32Array;
  color: Float32Array;
  gradT?: Float32Array;
  cell?: Float32Array;
}

/** Tree instances: matrices place a model normalized to 1 m height with its base at y = 0. */
export interface TreeBuffers {
  count: number;
  matrices: Float32Array; // 16 × count
}

/**
 * Polylines for moving city life: x, z pairs in chunk coords (z = -north); path i is
 * points[starts[i] * 2 … starts[i + 1] * 2).
 */
export interface PathBuffers {
  points: Float32Array;
  starts: Uint32Array;
}

export interface BuiltChunk {
  boxes: InstancedBuffers | null;
  prisms: InstancedBuffers | null;
  polygons: MeshBuffers | null;
  ground: MeshBuffers | null;
  trees: TreeBuffers | null;
  /** Major roads for cars (base chunks only). */
  roadPaths: PathBuffers | null;
}

// Degenerate road pieces are skipped for traffic; short ones stay, they link the roads at junctions.
const MIN_ROAD_PATH_M = 1;

// Trees scattered over parks, tuned by eye: dense in detail chunks (L0, close view),
// sparser and a bit bigger in base chunks (L1, far view) so the whole city stays cheap to draw.
const TREES = [
  { areaPerTree: 250, maxPerChunk: 600, minHeight: 13, maxHeight: 21 }, // L0, 1 × 1 km
  { areaPerTree: 1200, maxPerChunk: 800, minHeight: 20, maxHeight: 30 }, // L1, 4 × 4 km
];

// ---------- colors ----------

let kinds: string[] = [];
const kindColors = new Map<number, THREE.Color>();

export function setKinds(k: string[]) {
  kinds = k;
  kindColors.clear();
}

const blueRamp = CITY_PALETTE.blueRamp.map((hex) => new THREE.Color(hex));
const tmpColor = new THREE.Color();
const hsl = { h: 0, s: 0, l: 0 };

/** `tone` is a random byte per building: its place on the blue ramp, or the accent's brightness jitter. */
function buildingColor(kind: number, tone: number): THREE.Color {
  const accent = CITY_PALETTE.buildings[kinds[kind]];
  if (!accent) {
    const t = (tone / 255) * (blueRamp.length - 1);
    const i = Math.min(Math.floor(t), blueRamp.length - 2);
    return tmpColor.lerpColors(blueRamp[i], blueRamp[i + 1], t - i);
  }
  let base = kindColors.get(kind);
  if (!base) {
    base = new THREE.Color(accent);
    kindColors.set(kind, base);
  }
  base.getHSL(hsl);
  const j = (tone / 255 - 0.5) * 2 * CITY_PALETTE.jitter;
  return tmpColor.setHSL(hsl.h + j * 0.08, hsl.s, THREE.MathUtils.clamp(hsl.l + j * 0.5, 0, 1));
}

// ---------- buildings ----------

function boxes(c: ChunkData): InstancedBuffers | null {
  const n = c.boxes.length;
  if (!n) return null;
  const matrices = new Float32Array(n * 16);
  const colors = new Float32Array(n * 3);
  const cells = new Float32Array(n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3(), scale = new THREE.Vector3();
  c.boxes.forEach((b, i) => {
    q.setFromAxisAngle(up, b.rot);
    m.compose(pos.set(b.x, 0, -b.y), q, scale.set(Math.max(b.w, 0.5), Math.max(b.h, 0.5), Math.max(b.d, 0.5)));
    m.toArray(matrices, i * 16);
    buildingColor(b.kind, b.tone).toArray(colors, i * 3);
    cells[i] = b.cell;
  });
  return { count: n, matrices, colors, cells };
}

/** Affine map of the unit triangle (0,0)-(1,0)-(0,1) in the XZ plane onto the real one. */
function prisms(c: ChunkData): InstancedBuffers | null {
  const n = c.triangles.length;
  if (!n) return null;
  const matrices = new Float32Array(n * 16);
  const colors = new Float32Array(n * 3);
  const m = new THREE.Matrix4();
  c.triangles.forEach((t, i) => {
    const [a, p1, p2] = t.pts;
    let ex = [p1[0] - a[0], -(p1[1] - a[1])];
    let ez = [p2[0] - a[0], -(p2[1] - a[1])];
    if (ex[0] * ez[1] - ex[1] * ez[0] < 0) [ex, ez] = [ez, ex];
    m.set(ex[0], 0, ez[0], a[0], 0, t.h, 0, 0, ex[1], 0, ez[1], -a[1], 0, 0, 0, 1);
    m.toArray(matrices, i * 16);
    buildingColor(t.kind, t.tone).toArray(colors, i * 3);
  });
  return { count: n, matrices, colors, cells: new Float32Array(n) };
}

function polygons(c: ChunkData): MeshBuffers | null {
  const parts: THREE.BufferGeometry[] = [];
  for (const p of c.polygons) {
    if (p.pts.length < 3) continue;
    const shape = new THREE.Shape(p.pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(p.h, 0.5), bevelEnabled: false, curveSegments: 1 });
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g.rotateX(-Math.PI / 2); // (x, y, z) → (x, z, -y)
    const pos = g.getAttribute('position');
    const gradT = new Float32Array(pos.count);
    const color = new Float32Array(pos.count * 3);
    const col = buildingColor(p.kind, p.tone);
    for (let i = 0; i < pos.count; i++) {
      gradT[i] = pos.getY(i) / p.h;
      col.toArray(color, i * 3);
    }
    g.setAttribute('gradT', new THREE.BufferAttribute(gradT, 1));
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    parts.push(g);
  }
  if (!parts.length) return null;
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return {
    position: merged.getAttribute('position').array as Float32Array,
    color: merged.getAttribute('color').array as Float32Array,
    gradT: merged.getAttribute('gradT').array as Float32Array,
  };
}

// ---------- ground ----------

/** Ribbon along a polyline with miter joins; triangles in the XZ plane. */
function ribbon(pts: Pt[], width: number, out: number[]) {
  const P = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-3);
  if (P.length < 2) return;
  const half = width / 2;
  const dir = (a: Pt, b: Pt) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const L: number[][] = [], R: number[][] = [];
  for (let i = 0; i < P.length; i++) {
    const d0 = dir(P[Math.max(0, i - 1)], P[Math.max(1, i)]);
    const d1 = dir(P[Math.min(P.length - 2, i)], P[Math.min(P.length - 1, i + 1)]);
    let tx = d0[0] + d1[0], ty = d0[1] + d1[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty, ny = tx;
    const miter = Math.min(half / Math.max(nx * -d0[1] + ny * d0[0], 0.25), half * 3);
    const [x, y] = P[i];
    L.push([x + nx * miter, -(y + ny * miter)]);
    R.push([x - nx * miter, -(y - ny * miter)]);
  }
  for (let i = 0; i < P.length - 1; i++) {
    const a = L[i], b = R[i], c = L[i + 1], d = R[i + 1];
    out.push(a[0], 0, a[1], b[0], 0, b[1], c[0], 0, c[1], b[0], 0, b[1], d[0], 0, d[1], c[0], 0, c[1]);
  }
}

function area(rings: Pt[][], out: number[]) {
  const [outer, ...holes] = rings;
  if (!outer || outer.length < 3) return;
  const contour = outer.map(([x, y]) => new THREE.Vector2(x, y));
  const holeVecs = holes.filter((h) => h.length >= 3).map((h) => h.map(([x, y]) => new THREE.Vector2(x, y)));
  if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
  for (const h of holeVecs) if (!THREE.ShapeUtils.isClockWise(h)) h.reverse();
  const tris = THREE.ShapeUtils.triangulateShape(contour, holeVecs);
  const all = contour.concat(...holeVecs);
  for (const t of tris) for (const i of t) out.push(all[i].x, 0, -all[i].y);
}

/** All flat layers of a chunk in one buffer, painted bottom to top in buffer order. */
function ground(c: ChunkData): MeshBuffers | null {
  const pal = CITY_PALETTE;
  // draw order (bottom → top): parks, water, pedestrian areas, footways, streets, major roads
  const layers = [pal.park, pal.water, pal.pedestrian, pal.roadFoot, pal.roadMinor, pal.roadMajor].map((h) => new THREE.Color(h));
  const pos: number[] = [], color: number[] = [], cell: number[] = [];
  const push = (layer: number, cellId: number, fill: (out: number[]) => void) => {
    const start = pos.length;
    fill(pos);
    const col = layers[layer];
    for (let i = start; i < pos.length; i += 3) {
      color.push(col.r, col.g, col.b);
      cell.push(cellId);
    }
  };
  const areaLayer = [0, 1, 2]; // park, water, pedestrian
  const roadLayer = [5, 4, 3]; // major, minor, foot
  for (const layer of [0, 1, 2]) for (const a of c.areas) if (areaLayer[a.kind] === layer) push(layer, a.cell, (o) => area(a.rings, o));
  for (const layer of [3, 4, 5]) for (const r of c.roads) if (roadLayer[r.cls] === layer) push(layer, r.cell, (o) => ribbon(r.pts, r.width, o));
  if (!pos.length) return null;
  return { position: new Float32Array(pos), color: new Float32Array(color), cell: new Float32Array(cell) };
}

// ---------- trees ----------

/** Small seeded PRNG (mulberry32): a chunk gets the same trees on every load. */
function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random points over the park triangles (area-weighted), with random rotation and height. */
function trees(c: ChunkData): TreeBuffers | null {
  const cfg = TREES[c.level];
  if (!cfg) return null;
  const parks = c.areas.filter((a) => a.kind === 0);
  if (!parks.length) return null;
  const tris: number[] = [];
  for (const a of parks) area(a.rings, tris);

  const [sx, sy] = parks[0].rings[0][0];
  const rand = seededRandom(Math.round(sx * 7919 + sy * 104729));
  const points: number[] = []; // x, z pairs
  for (let i = 0; i < tris.length; i += 9) {
    const ax = tris[i], az = tris[i + 2], bx = tris[i + 3], bz = tris[i + 5], cx = tris[i + 6], cz = tris[i + 8];
    const triArea = Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2;
    for (let n = Math.floor(triArea / cfg.areaPerTree + rand()); n > 0; n--) {
      let r1 = rand(), r2 = rand();
      if (r1 + r2 > 1) {
        r1 = 1 - r1;
        r2 = 1 - r2;
      }
      points.push(ax + r1 * (bx - ax) + r2 * (cx - ax), az + r1 * (bz - az) + r2 * (cz - az));
    }
  }
  const total = points.length / 2;
  if (!total) return null;

  const step = Math.ceil(total / cfg.maxPerChunk);
  const count = Math.ceil(total / step);
  const matrices = new Float32Array(count * 16);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3(), scale = new THREE.Vector3();
  for (let k = 0; k < count; k++) {
    const i = k * step;
    const h = cfg.minHeight + rand() * (cfg.maxHeight - cfg.minHeight);
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    m.compose(pos.set(points[i * 2], 0, points[i * 2 + 1]), q, scale.set(h, h, h));
    m.toArray(matrices, k * 16);
  }
  return { count, matrices };
}

// ---------- paths for city life ----------

/** Major-road polylines of a base chunk (the whole city at any zoom), for traffic. */
function roadPaths(c: ChunkData): PathBuffers | null {
  if (c.level !== 1) return null;
  const points: number[] = [];
  const starts = [0];
  for (const road of c.roads) {
    if (road.cls !== 0 || road.pts.length < 2) continue;
    let length = 0;
    for (let i = 1; i < road.pts.length; i++) {
      length += Math.hypot(road.pts[i][0] - road.pts[i - 1][0], road.pts[i][1] - road.pts[i - 1][1]);
    }
    if (length < MIN_ROAD_PATH_M) continue;
    for (const [x, y] of road.pts) points.push(x, -y);
    starts.push(points.length / 2);
  }
  return starts.length > 1 ? { points: new Float32Array(points), starts: new Uint32Array(starts) } : null;
}

export function buildChunk(c: ChunkData): BuiltChunk {
  return {
    boxes: boxes(c),
    prisms: prisms(c),
    polygons: polygons(c),
    ground: ground(c),
    trees: trees(c),
    roadPaths: roadPaths(c),
  };
}

export function transferables(b: BuiltChunk): ArrayBuffer[] {
  const out: ArrayBuffer[] = [];
  for (const inst of [b.boxes, b.prisms]) {
    if (inst) out.push(inst.matrices.buffer as ArrayBuffer, inst.colors.buffer as ArrayBuffer, inst.cells.buffer as ArrayBuffer);
  }
  for (const mesh of [b.polygons, b.ground]) {
    if (!mesh) continue;
    for (const a of [mesh.position, mesh.color, mesh.gradT, mesh.cell]) if (a) out.push(a.buffer as ArrayBuffer);
  }
  if (b.trees) out.push(b.trees.matrices.buffer as ArrayBuffer);
  if (b.roadPaths) out.push(b.roadPaths.points.buffer as ArrayBuffer, b.roadPaths.starts.buffer as ArrayBuffer);
  return [...new Set(out)];
}
