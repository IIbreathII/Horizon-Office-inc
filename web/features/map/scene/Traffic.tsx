'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cameraGround, CARS, lifeSize } from '../lib/cityLife';
import { pathLengths, sampleAlong, type CityPaths, type Path } from './cityPaths';
import { disposeModelParts, loadModelParts, movingInstances, type ModelPart } from './models';

// Cars driving along the major roads around the point the camera looks at; the area grows with the
// camera distance, so traffic is visible at any zoom. At the end of a road a car turns onto a
// connected one (or makes a U-turn at a dead end); cars leaving the area respawn inside it.

type Car = { road: Road | null; dist: number; dir: 1 | -1; speed: number };
/** A road with its bounding circle, for picking the roads in the traffic area. */
type Road = { path: Path; x: number; z: number; r: number; length: number };
/** A road touching a junction, at its start or its end. */
type RoadEnd = { road: Road; atStart: boolean };

const sample = { x: 0, z: 0, dx: 0, dz: 0 };
const ground = { x: 0, z: 0, distance: 0 };
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const SPAWN_TRIES = 4;
const JUNCTION_M = 3; // road ends closer than this are connected

const junctionKey = (x: number, z: number) => `${Math.round(x / JUNCTION_M)}_${Math.round(z / JUNCTION_M)}`;

const random = (min: number, max: number) => min + Math.random() * (max - min);

function toRoad(path: Path): Road {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < path.length; i += 2) {
    minX = Math.min(minX, path[i]);
    maxX = Math.max(maxX, path[i]);
    minZ = Math.min(minZ, path[i + 1]);
    maxZ = Math.max(maxZ, path[i + 1]);
  }
  const length = pathLengths(path).at(-1) ?? 0;
  return { path, x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, r: Math.hypot(maxX - minX, maxZ - minZ) / 2, length };
}

class TrafficSim {
  private root: THREE.Group;
  private paths: CityPaths;
  private models: ModelPart[][] = [];
  private meshes: THREE.InstancedMesh[][] = []; // per variant, one mesh per model part
  private cars: Car[] = [];
  private roads: Road[] = [];
  private roadsVersion = -1;
  private junctions = new Map<string, RoadEnd[]>();
  // the traffic area and the roads in it, weighted by length so cars spread evenly per km
  private area = { x: 0, z: 0, r: 0 };
  private areaRoads: Road[] = [];
  private areaWeights: number[] = [];
  private disposed = false;

  constructor(root: THREE.Group, paths: CityPaths) {
    this.root = root;
    this.paths = paths;
    Promise.all(CARS.urls.map((url) => loadModelParts(url, 'length')))
      .then((models) => {
        if (this.disposed) return disposeModelParts(models);
        this.models = models;
        const perVariant = Math.ceil(CARS.count / models.length);
        this.meshes = models.map((parts) => movingInstances(parts, perVariant));
        for (const meshes of this.meshes) for (const mesh of meshes) root.add(mesh);
        this.cars = Array.from({ length: perVariant * models.length }, () => ({ road: null, dist: 0, dir: 1, speed: 0 }));
      })
      .catch((err: unknown) => console.warn('Car models failed to load', err));
  }

  /** Re-picks the roads in the area when the view moved or zoomed noticeably (or new roads loaded). */
  private updateArea(x: number, z: number, r: number) {
    const a = this.area;
    const moved = Math.hypot(x - a.x, z - a.z) > a.r * 0.2 || Math.abs(r - a.r) > a.r * 0.2;
    if (!moved && this.roadsVersion === this.paths.version) return;
    if (this.roadsVersion !== this.paths.version) {
      this.roadsVersion = this.paths.version;
      this.roads = this.paths.roads.map(toRoad);
      this.junctions.clear();
      for (const road of this.roads) {
        const p = road.path, n = p.length;
        for (const [x, z, atStart] of [[p[0], p[1], true], [p[n - 2], p[n - 1], false]] as const) {
          const key = junctionKey(x, z);
          const list = this.junctions.get(key) ?? [];
          list.push({ road, atStart });
          this.junctions.set(key, list);
        }
      }
    }
    this.area = { x, z, r };
    this.areaRoads = this.roads.filter((road) => Math.hypot(road.x - x, road.z - z) < r + road.r);
    let sum = 0;
    this.areaWeights = this.areaRoads.map((road) => (sum += road.length));
  }

  private inArea(px: number, pz: number) {
    const { x, z, r } = this.area;
    return (px - x) ** 2 + (pz - z) ** 2 < r * r;
  }

  /** At the end of its road the car turns onto a connected road, or makes a U-turn at a dead end. */
  private continueAtJunction(car: Car) {
    const road = car.road!;
    const atStart = car.dist < 0;
    const overshoot = atStart ? -car.dist : car.dist - road.length;
    const p = road.path, n = p.length;
    const [x, z] = atStart ? [p[0], p[1]] : [p[n - 2], p[n - 1]];
    const next: RoadEnd[] = [];
    // the 3 × 3 neighboring cells, so ends just across a cell border connect too
    const kx = Math.round(x / JUNCTION_M), kz = Math.round(z / JUNCTION_M);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const end of this.junctions.get(`${kx + i}_${kz + j}`) ?? []) if (end.road !== road) next.push(end);
      }
    }
    if (!next.length) {
      car.dir = car.dir === 1 ? -1 : 1;
      car.dist = atStart ? Math.min(overshoot, road.length) : Math.max(road.length - overshoot, 0);
      return;
    }
    const end = next[Math.floor(Math.random() * next.length)];
    car.road = end.road;
    car.dir = end.atStart ? 1 : -1;
    car.dist = end.atStart ? Math.min(overshoot, end.road.length) : Math.max(end.road.length - overshoot, 0);
  }

  /** Puts the car on a random point of a road in the area (or hides it when none is found). */
  private spawn(car: Car) {
    car.road = null;
    const total = this.areaWeights.at(-1) ?? 0;
    for (let t = 0; t < SPAWN_TRIES && total > 0; t++) {
      const w = Math.random() * total;
      const road = this.areaRoads[Math.max(0, this.areaWeights.findIndex((cum) => cum >= w))];
      const dist = Math.random() * road.length;
      sampleAlong(road.path, dist, sample);
      if (!this.inArea(sample.x, sample.z)) continue;
      car.road = road;
      car.dist = dist;
      car.dir = Math.random() < 0.5 ? 1 : -1;
      car.speed = random(...CARS.speedMps);
      return;
    }
  }

  /** Moves the cars; returns whether traffic is visible (then the map keeps rendering frames). */
  update(camera: THREE.Camera, dt: number): boolean {
    if (!this.cars.length || !this.paths.roads.length) return false;
    cameraGround(camera, ground);
    this.updateArea(ground.x, ground.z, Math.max(ground.distance * CARS.areaPerDistance, CARS.minAreaM));
    const size = lifeSize(CARS, ground.distance);
    const lane = size * CARS.laneOffset;

    const variants = this.meshes.length;
    this.cars.forEach((car, i) => {
      const meshes = this.meshes[i % variants];
      const index = Math.floor(i / variants);
      if (car.road) {
        car.dist += car.dir * car.speed * dt;
        if (car.dist < 0 || car.dist > car.road.length) this.continueAtJunction(car);
        if (!this.inArea(sampleAlong(car.road.path, car.dist, sample).x, sample.z)) car.road = null;
      }
      if (!car.road) this.spawn(car);
      if (!car.road) {
        for (const mesh of meshes) mesh.setMatrixAt(index, HIDDEN);
        return;
      }
      sampleAlong(car.road.path, car.dist, sample);
      const tx = sample.dx * car.dir, tz = sample.dz * car.dir; // direction of travel
      // right-hand traffic: shift to the right of the direction of travel (right = (-tz, tx))
      position.set(sample.x - tz * lane, 0.2, sample.z + tx * lane);
      rotation.setFromAxisAngle(UP, Math.atan2(tx, tz));
      matrix.compose(position, rotation, scale.setScalar(size));
      for (const mesh of meshes) mesh.setMatrixAt(index, matrix);
    });
    for (const meshes of this.meshes) for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  dispose() {
    this.disposed = true;
    for (const meshes of this.meshes) for (const mesh of meshes) {
      mesh.removeFromParent();
      mesh.dispose();
    }
    disposeModelParts(this.models);
  }
}

export function Traffic({ paths }: { paths: CityPaths }) {
  const [root] = useState(() => new THREE.Group());
  const sim = useRef<TrafficSim | null>(null);

  useEffect(() => {
    const s = new TrafficSim(root, paths);
    sim.current = s;
    return () => {
      s.dispose();
      sim.current = null;
    };
  }, [root, paths]);

  // frameloop="demand": keep requesting frames while cars are driving
  useFrame(({ camera, invalidate }, delta) => {
    if (sim.current?.update(camera, Math.min(delta, 0.1))) invalidate();
  });

  return <primitive object={root} />;
}
