// Binary city chunk format CHK1 (little-endian), read side only. The chunks in public/city are
// built offline by the city pipeline (map project: scripts/build-chunks.ts), which owns the writer.
// Coordinates are relative to the chunk's SW corner, x east, y north, int16 × q meters.
//
// header   : magic u32 'CHK1', version u8, level u8, reserved u16, q f32
// boxes    : n u32, n × [x i16, y i16, w u16, d u16, rot u16, h u16, kind u8, tone u8, cell u8]
// triangles: n u32, n × [3 × (x i16, y i16), h u16, kind u8, tone u8]
// polygons : n u32, n × [nv u16, h u16, kind u8, tone u8, nv × (x i16, y i16)]
// roads    : n u32, n × [cls u8, cell u8, width u8 (× 0.1 m), nv u16, nv × (x i16, y i16)]
// areas    : n u32, n × [kind u8, cell u8, rings u16, rings × (nv u32, nv × (x i16, y i16))]
//
// h is in decimeters, rot is a fraction of a full turn × 65536,
// cell is the L0 cell index inside an L1 chunk (always 0 in L0 chunks).

/** Map point: x east, y north, meters. In three.js: X = x, Z = -y. */
export type Pt = [x: number, y: number];

const MAGIC = 0x314b4843; // 'CHK1'
const VERSION = 1;

export interface BoxRec { x: number; y: number; w: number; d: number; rot: number; h: number; kind: number; tone: number; cell: number }
export interface TriRec { pts: Pt[]; h: number; kind: number; tone: number }
export interface PolyRec { pts: Pt[]; h: number; kind: number; tone: number }
/** cls: 0 major, 1 minor, 2 foot. */
export interface RoadRec { cls: number; cell: number; width: number; pts: Pt[] }
/** kind: 0 park, 1 water, 2 pedestrian. */
export interface AreaRec { kind: number; cell: number; rings: Pt[][] }

export interface ChunkData {
  level: number;
  q: number;
  boxes: BoxRec[];
  triangles: TriRec[];
  polygons: PolyRec[];
  roads: RoadRec[];
  areas: AreaRec[];
}

export function decodeChunk(buffer: ArrayBuffer): ChunkData {
  const v = new DataView(buffer);
  let o = 0;
  const u8 = () => v.getUint8(o++);
  const u16 = () => { const x = v.getUint16(o, true); o += 2; return x; };
  const i16 = () => { const x = v.getInt16(o, true); o += 2; return x; };
  const u32 = () => { const x = v.getUint32(o, true); o += 4; return x; };

  if (u32() !== MAGIC) throw new Error('Not a CHK1 chunk');
  const version = u8();
  if (version !== VERSION) throw new Error(`Chunk version ${version}, expected ${VERSION}`);
  const level = u8();
  u16();
  const q = v.getFloat32(o, true);
  o += 4;

  const coord = () => i16() * q;
  const pt = (): Pt => [coord(), coord()];
  const pts = (n: number) => Array.from({ length: n }, pt);
  const height = () => u16() / 10;

  const boxes: BoxRec[] = Array.from({ length: u32() }, () => {
    const x = coord(), y = coord(), w = u16() * q, d = u16() * q;
    const rot = (u16() / 65536) * 2 * Math.PI;
    return { x, y, w, d, rot, h: height(), kind: u8(), tone: u8(), cell: u8() };
  });
  const triangles: TriRec[] = Array.from({ length: u32() }, () => ({ pts: pts(3), h: height(), kind: u8(), tone: u8() }));
  const polygons: PolyRec[] = Array.from({ length: u32() }, () => {
    const nv = u16(), h = height(), kind = u8(), tone = u8();
    return { pts: pts(nv), h, kind, tone };
  });
  const roads: RoadRec[] = Array.from({ length: u32() }, () => {
    const cls = u8(), cell = u8(), width = u8() / 10, nv = u16();
    return { cls, cell, width, pts: pts(nv) };
  });
  const areas: AreaRec[] = Array.from({ length: u32() }, () => {
    const kind = u8(), cell = u8(), n = u16();
    return { kind, cell, rings: Array.from({ length: n }, () => pts(u32())) };
  });
  return { level, q, boxes, triangles, polygons, roads, areas };
}

/** public/city/manifest.json */
export interface Manifest {
  version: number;
  name: string;
  attribution: string;
  /** Projection center (lng, lat); must match ORIGIN in projection.ts. */
  center: [lng: number, lat: number];
  /** Chunk grid: SW origin (ox, oy) in map meters, L0 chunk size, L0 chunks per L1 side. */
  grid: { ox: number; oy: number; size: number; cols: number; rows: number; l1Factor: number };
  /** building=* values by `kind` index. */
  kinds: string[];
  /** key "cx_cy" → [buildings, bytes, max height]. */
  l0: Record<string, [number, number, number]>;
  l1: Record<string, [number, number, number]>;
}
