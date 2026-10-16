'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Manifest, Pt } from '../lib/chunkFormat';
import { CITY_PALETTE, type BuiltChunk, type InstancedBuffers, type MeshBuffers } from '../lib/chunkGeometry';
import { ChunkLoader } from '../lib/chunkLoader';
import { CITY_BOUNDS } from '../lib/projection';
import { createBuildingMaterial, createGroundMaterial, RENDER_ORDER, unitBox, unitPrism } from './cityMaterials';

// The city of Dnipro from prebuilt chunks in public/city (§4.4):
// - L1 (base, 4 × 4 km): the whole city, loaded once at start;
// - L0 (detail, 1 × 1 km): streamed around the point the camera looks at;
//   L1 buildings under a loaded L0 chunk are hidden in the shader.

const CITY_URL = '/city/';

// Detail streaming, tuned by eye
const DETAIL = {
  maxDistance: 3500, // camera farther than this from the ground point: base only
  radiusFactor: 1.3, // load radius = camera distance × radiusFactor, within [minRadius, maxRadius]
  minRadius: 900,
  maxRadius: 2200,
  keepExtra: 500, // hysteresis: loaded chunks stay until radius + keepExtra
  alwaysRadius: 400, // closer than this a chunk loads even when off-screen
};

type ChunkMaterials = { box: THREE.Material; prism: THREE.Material; polygon: THREE.Material; ground: THREE.Material };

const sharedBox = unitBox();
const sharedPrism = unitPrism();

const parseKey = (key: string) => key.split('_').map(Number) as [number, number];

function instancedMesh(base: THREE.BufferGeometry, buf: InstancedBuffers, material: THREE.Material, withCells: boolean) {
  const geometry = withCells ? base.clone() : base;
  if (withCells) geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(buf.cells, 1));
  const mesh = new THREE.InstancedMesh(geometry, material, buf.count);
  mesh.instanceMatrix = new THREE.InstancedBufferAttribute(buf.matrices, 16);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(buf.colors, 3);
  mesh.computeBoundingSphere();
  mesh.computeBoundingBox();
  mesh.renderOrder = RENDER_ORDER.buildings;
  return mesh;
}

function plainMesh(buf: MeshBuffers, material: THREE.Material, renderOrder: number, withCells: boolean) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(buf.position, 3));
  g.setAttribute('color', new THREE.BufferAttribute(buf.color, 3));
  if (buf.gradT) g.setAttribute('gradT', new THREE.BufferAttribute(buf.gradT, 1));
  if (withCells && buf.cell) g.setAttribute('aCell', new THREE.BufferAttribute(buf.cell, 1));
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, material);
  mesh.renderOrder = renderOrder;
  return mesh;
}

/** Meshes of one chunk; origin is the chunk's SW corner in map coordinates (x east, y north). */
function chunkGroup(chunk: BuiltChunk, origin: Pt, materials: ChunkMaterials, isBase: boolean) {
  const g = new THREE.Group();
  g.position.set(origin[0], 0, -origin[1]);
  if (chunk.ground) g.add(plainMesh(chunk.ground, materials.ground, isBase ? RENDER_ORDER.groundL1 : RENDER_ORDER.groundL0, isBase));
  if (chunk.boxes) g.add(instancedMesh(sharedBox, chunk.boxes, materials.box, isBase));
  if (chunk.prisms) g.add(instancedMesh(sharedPrism, chunk.prisms, materials.prism, false));
  if (chunk.polygons) g.add(plainMesh(chunk.polygons, materials.polygon, RENDER_ORDER.buildings, false));
  return g;
}

function disposeGroup(g: THREE.Group) {
  g.removeFromParent();
  g.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) o.dispose();
    if (o instanceof THREE.Mesh && o.geometry !== sharedBox && o.geometry !== sharedPrism) o.geometry.dispose();
  });
}

// Scratch objects for the per-frame visibility check
const camPos = new THREE.Vector3();
const camDir = new THREE.Vector3();
const projView = new THREE.Matrix4();
const frustum = new THREE.Frustum();
const box = new THREE.Box3();

class CityStreamer {
  private root: THREE.Group;
  private invalidate: () => void;
  private disposed = false;
  private manifest: Manifest | null = null;
  private loader: ChunkLoader | null = null;
  private base = new Map<string, { group: THREE.Group; materials: THREE.ShaderMaterial[] }>();
  private detail = new Map<string, THREE.Group>();
  private inflight = new Map<string, () => void>();
  private detailMaterials = {
    box: createBuildingMaterial(),
    prism: createBuildingMaterial(),
    polygon: createBuildingMaterial({ vertexColors: true }),
    ground: createGroundMaterial(),
  };
  private lastView = '';

  constructor(root: THREE.Group, invalidate: () => void) {
    this.root = root;
    this.invalidate = invalidate;
    fetch(`${CITY_URL}manifest.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${CITY_URL}manifest.json`);
        return res.json() as Promise<Manifest>;
      })
      .then((manifest) => this.start(manifest))
      .catch((err: unknown) => {
        if (!this.disposed) console.error('City failed to load', err);
      });
  }

  private start(manifest: Manifest) {
    if (this.disposed) return;
    this.manifest = manifest;
    this.loader = new ChunkLoader(manifest.kinds);
    const { ox, oy, size, l1Factor: f } = manifest.grid;
    const span = size * f;
    for (const key of Object.keys(manifest.l1)) {
      const [lx, ly] = parseKey(key);
      const origin: Pt = [ox + lx * span, oy + ly * span];
      // base chunks: after any detail chunk, nearest to the city center first
      const priority = 1e9 + Math.hypot(origin[0] + span / 2, origin[1] + span / 2);
      this.loader.load(`${CITY_URL}L1/${key}.bin`, priority).promise.then(
        (chunk) => this.addBase(key, chunk, origin),
        () => {},
      );
    }
    this.lastView = '';
    this.invalidate();
  }

  private addBase(key: string, chunk: BuiltChunk, origin: Pt) {
    if (this.disposed) return;
    const box = createBuildingMaterial({ hideCells: true });
    const ground = createGroundMaterial({ hideCells: true });
    const group = chunkGroup(chunk, origin, { box, prism: box, polygon: box, ground }, true);
    this.base.set(key, { group, materials: [box, ground] });
    this.updateHiddenCells(key);
    this.root.add(group);
    this.invalidate();
  }

  private addDetail(key: string, chunk: BuiltChunk) {
    if (this.disposed || !this.manifest) return;
    const { ox, oy, size } = this.manifest.grid;
    const [cx, cy] = parseKey(key);
    const group = chunkGroup(chunk, [ox + cx * size, oy + cy * size], this.detailMaterials, false);
    this.detail.set(key, group);
    this.root.add(group);
    this.updateHiddenCells(this.baseKeyOf(key));
    this.invalidate();
  }

  private removeDetail(key: string) {
    const group = this.detail.get(key);
    if (!group) return;
    disposeGroup(group);
    this.detail.delete(key);
    this.updateHiddenCells(this.baseKeyOf(key));
  }

  private baseKeyOf(detailKey: string) {
    const f = this.manifest?.grid.l1Factor ?? 1;
    const [cx, cy] = parseKey(detailKey);
    return `${Math.floor(cx / f)}_${Math.floor(cy / f)}`;
  }

  /** Hide the base buildings and ground of cells covered by loaded detail chunks. */
  private updateHiddenCells(baseKey: string) {
    const entry = this.base.get(baseKey);
    if (!entry || !this.manifest) return;
    const f = this.manifest.grid.l1Factor;
    const [lx, ly] = parseKey(baseKey);
    for (const material of entry.materials) {
      const hidden = material.uniforms.uHidden.value as number[];
      for (let i = 0; i < f * f; i++) {
        hidden[i] = this.detail.has(`${lx * f + (i % f)}_${ly * f + Math.floor(i / f)}`) ? 1 : 0;
      }
    }
  }

  /** Called every rendered frame; does work only when the view has changed. */
  update(camera: THREE.Camera) {
    const manifest = this.manifest;
    const loader = this.loader;
    if (!manifest || !loader) return;

    camera.updateMatrixWorld();
    const view = `${camera.matrixWorld.elements.join()}|${camera.projectionMatrix.elements.join()}`;
    if (view === this.lastView) return;
    this.lastView = view;

    // the ground point in the middle of the screen and the camera's distance to it
    camera.getWorldPosition(camPos);
    camera.getWorldDirection(camDir);
    if (camDir.y > -1e-3) return;
    const distance = -camPos.y / camDir.y;
    const px = camPos.x + camDir.x * distance;
    const py = -(camPos.z + camDir.z * distance);
    const radius =
      distance <= DETAIL.maxDistance
        ? THREE.MathUtils.clamp(distance * DETAIL.radiusFactor, DETAIL.minRadius, DETAIL.maxRadius)
        : 0;

    projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projView);

    const { ox, oy, size } = manifest.grid;
    const wanted = new Map<string, number>(); // key → distance (load priority)
    const keep = new Set<string>();
    if (radius > 0) {
      for (const [key, [, , hMax]] of Object.entries(manifest.l0)) {
        const [cx, cy] = parseKey(key);
        const minX = ox + cx * size, minY = oy + cy * size;
        const dx = Math.max(minX - px, 0, px - (minX + size));
        const dy = Math.max(minY - py, 0, py - (minY + size));
        const dist = Math.hypot(dx, dy);
        if (dist <= radius + DETAIL.keepExtra) keep.add(key);
        if (dist > radius) continue;
        box.min.set(minX, 0, -(minY + size));
        box.max.set(minX + size, Math.max(hMax, 1), -minY);
        if (dist > DETAIL.alwaysRadius && !frustum.intersectsBox(box)) continue;
        wanted.set(key, dist);
      }
    }

    for (const key of [...this.detail.keys()]) if (!keep.has(key)) this.removeDetail(key);
    for (const [key, cancel] of this.inflight) {
      if (keep.has(key)) continue;
      cancel();
      this.inflight.delete(key);
    }

    const detailUrl = `${CITY_URL}L0/`;
    loader.reprioritize((url) => (url.startsWith(detailUrl) ? wanted.get(url.slice(detailUrl.length, -4)) : undefined));
    for (const [key, dist] of wanted) {
      if (this.detail.has(key) || this.inflight.has(key)) continue;
      const job = loader.load(`${detailUrl}${key}.bin`, dist);
      this.inflight.set(key, job.cancel);
      job.promise.then(
        (chunk) => {
          if (this.inflight.get(key) !== job.cancel) return; // no longer needed
          this.inflight.delete(key);
          this.addDetail(key, chunk);
        },
        () => {
          if (this.inflight.get(key) === job.cancel) this.inflight.delete(key);
        },
      );
    }
  }

  dispose() {
    this.disposed = true;
    this.loader?.dispose();
    this.inflight.clear();
    for (const group of this.detail.values()) disposeGroup(group);
    for (const { group, materials } of this.base.values()) {
      disposeGroup(group);
      materials.forEach((m) => m.dispose());
    }
    Object.values(this.detailMaterials).forEach((m) => m.dispose());
    this.detail.clear();
    this.base.clear();
  }
}

const GROUND_SIZE = Math.max(CITY_BOUNDS.maxX - CITY_BOUNDS.minX, CITY_BOUNDS.maxZ - CITY_BOUNDS.minZ) * 3;

export function CityChunks() {
  const invalidate = useThree((s) => s.invalidate);
  const [root] = useState(() => new THREE.Group());
  const streamer = useRef<CityStreamer | null>(null);

  useEffect(() => {
    const s = new CityStreamer(root, invalidate);
    streamer.current = s;
    return () => {
      s.dispose();
      streamer.current = null;
    };
  }, [root, invalidate]);

  useFrame(({ camera }) => streamer.current?.update(camera));

  return (
    <>
      <color attach="background" args={[CITY_PALETTE.background]} />
      {/* land under and around the city; flat layers draw without depth, in RENDER_ORDER */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[(CITY_BOUNDS.minX + CITY_BOUNDS.maxX) / 2, 0, (CITY_BOUNDS.minZ + CITY_BOUNDS.maxZ) / 2]}
        renderOrder={RENDER_ORDER.base}
      >
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshBasicMaterial color={CITY_PALETTE.ground} depthWrite={false} />
      </mesh>
      <primitive object={root} />
    </>
  );
}
