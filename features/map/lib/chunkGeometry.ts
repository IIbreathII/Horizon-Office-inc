// Turns a decoded chunk into geometry buffers. Runs in the Web Worker (chunkWorker.ts):
// the output is typed arrays only, so it moves to the main thread without copying.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChunkData, Pt } from './chunkFormat';

// Stylized city palette, tuned by eye.
export const CITY_PALETTE = {
  background: '#e9e4f5',
  ground: '#f3f0f8',
  water: '#9cc8ec',
  park: '#bfe3c0',
  pedestrian: '#e2dcee',
  roadMajor: '#ffffff',
  roadMinor: '#faf8fd',
  roadFoot: '#d7cfe6',
  /** Base color by building=*; the shader adds a dark-bottom → light-top gradient. */
  buildings: {
    default: '#8f86e8',
    residential: '#7fa7f0',
    apartments: '#7fa7f0',
    house: '#86c0ea',
    commercial: '#f08fb4',
    retail: '#f3a17f',
    office: '#c48ef0',
    church: '#f5c95c',
    cathedral: '#f5c95c',
    religious: '#f5c95c',
    government: '#6fd0c0',
    public: '#6fd0c0',
    civic: '#6fd0c0',
    university: '#9fdc7c',
    school: '#9fdc7c',
    hotel: '#e88fe0',
  } as Record<string, string>,
  /** Brightness spread between buildings (0…1). */
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

export interface BuiltChunk {
  boxes: InstancedBuffers | null;
  prisms: InstancedBuffers | null;
  polygons: MeshBuffers | null;
  ground: MeshBuffers | null;
}

// ---------- colors ----------

let kinds: string[] = [];
const kindColors = new Map<number, THREE.Color>();

export function setKinds(k: string[]) {
  kinds = k;
  kindColors.clear();
}

const tmpColor = new THREE.Color();
const hsl = { h: 0, s: 0, l: 0 };

function buildingColor(kind: number, tone: number): THREE.Color {
  let base = kindColors.get(kind);
  if (!base) {
    const pal = CITY_PALETTE.buildings;
    base = new THREE.Color(pal[kinds[kind]] ?? pal.default);
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

export function buildChunk(c: ChunkData): BuiltChunk {
  return { boxes: boxes(c), prisms: prisms(c), polygons: polygons(c), ground: ground(c) };
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
  return [...new Set(out)];
}
