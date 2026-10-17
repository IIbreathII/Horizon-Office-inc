'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BOATS, cameraGround, lifeSize, RIVER_ROUTES } from '../lib/cityLife';
import { project } from '../lib/projection';
import { disposeModelParts, loadModelParts, movingInstances, type ModelPart } from './models';

// Boats sailing back and forth along fixed routes on the Dnipro.

type Boat = { route: number; u: number; dir: 1 | -1; speed: number; phase: number };

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const tangent = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const ground = { x: 0, z: 0, distance: 0 };

const random = (min: number, max: number) => min + Math.random() * (max - min);

class BoatsSim {
  private routes = RIVER_ROUTES.map(
    (route) => new THREE.CatmullRomCurve3(route.map(([lat, lng]) => new THREE.Vector3(project(lat, lng)[0], 0, project(lat, lng)[1]))),
  );
  private lengths = this.routes.map((curve) => curve.getLength());
  private models: ModelPart[][] = [];
  private meshes: THREE.InstancedMesh[][] = [];
  private boats: Boat[] = [];
  private time = 0;
  private disposed = false;

  constructor(root: THREE.Group) {
    Promise.all(BOATS.urls.map((url) => loadModelParts(url, 'length')))
      .then((models) => {
        if (this.disposed) return disposeModelParts(models);
        this.models = models;
        const perVariant = Math.ceil(BOATS.count / models.length);
        this.meshes = models.map((parts) => movingInstances(parts, perVariant));
        for (const meshes of this.meshes) for (const mesh of meshes) root.add(mesh);
        // routes get boats in proportion to their length
        const total = this.lengths.reduce((a, b) => a + b, 0);
        this.boats = Array.from({ length: perVariant * models.length }, (_, i) => {
          let pick = ((i + 0.5) / (perVariant * models.length)) * total;
          let route = 0;
          while (route < this.lengths.length - 1 && pick > this.lengths[route]) pick -= this.lengths[route++];
          return { route, u: Math.random(), dir: Math.random() < 0.5 ? 1 : -1, speed: random(...BOATS.speedMps), phase: Math.random() * 10 };
        });
      })
      .catch((err: unknown) => console.warn('Boat models failed to load', err));
  }

  /** Moves the boats; returns whether there are any (then the map keeps rendering frames). */
  update(camera: THREE.Camera, dt: number): boolean {
    if (!this.boats.length) return false;
    const size = lifeSize(BOATS, cameraGround(camera, ground).distance);

    this.time += dt;
    const variants = this.meshes.length;
    this.boats.forEach((boat, i) => {
      const curve = this.routes[boat.route];
      boat.u += (boat.dir * boat.speed * dt) / this.lengths[boat.route];
      // sail back and forth
      if (boat.u > 1 || boat.u < 0) {
        boat.u = THREE.MathUtils.clamp(boat.u, 0, 1);
        boat.dir = boat.dir === 1 ? -1 : 1;
      }
      curve.getPointAt(boat.u, position);
      curve.getTangentAt(boat.u, tangent).multiplyScalar(boat.dir);
      position.y = Math.sin(this.time * 1.5 + boat.phase) * 0.4; // gentle bobbing
      rotation.setFromAxisAngle(UP, Math.atan2(tangent.x, tangent.z));
      matrix.compose(position, rotation, scale.setScalar(size));
      for (const mesh of this.meshes[i % variants]) mesh.setMatrixAt(Math.floor(i / variants), matrix);
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

export function Boats() {
  const [root] = useState(() => new THREE.Group());
  const sim = useRef<BoatsSim | null>(null);

  useEffect(() => {
    const s = new BoatsSim(root);
    sim.current = s;
    return () => {
      s.dispose();
      sim.current = null;
    };
  }, [root]);

  // frameloop="demand": keep requesting frames while boats are sailing
  useFrame(({ camera, invalidate }, delta) => {
    if (sim.current?.update(camera, Math.min(delta, 0.1))) invalidate();
  });

  return <primitive object={root} />;
}
