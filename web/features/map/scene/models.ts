import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Static glTF models (trees, vehicles, boats) prepared for instancing.

/** One mesh of a model with its transform baked in, normalized (see `loadModelParts`). */
export type ModelPart = { geometry: THREE.BufferGeometry; material: THREE.Material };

const loader = new GLTFLoader();

/**
 * Loads a .glb and bakes every mesh into a part, normalized so that the model's height (`'height'`)
 * or its length along Z (`'length'`) is 1, with the base at y = 0 and centered on x / z.
 */
export async function loadModelParts(url: string, normalize: 'height' | 'length'): Promise<ModelPart[]> {
  const { scene } = await loader.loadAsync(url);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const k = 1 / (normalize === 'height' ? size.y : size.z);
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  const parts: ModelPart[] = [];
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geometry = (o.geometry as THREE.BufferGeometry)
      .clone()
      .applyMatrix4(o.matrixWorld)
      .translate(-cx, -box.min.y, -cz)
      .scale(k, k, k);
    parts.push({ geometry, material: o.material as THREE.Material });
  });
  return parts;
}

export function disposeModelParts(models: ModelPart[][]) {
  for (const parts of models) {
    for (const { geometry, material } of parts) {
      geometry.dispose();
      material.dispose();
    }
  }
}

/**
 * One InstancedMesh per part of a model, all driven by the same instance matrices (moving objects:
 * frustum culling off, since the instances move away from the initial bounding sphere).
 */
export function movingInstances(parts: ModelPart[], count: number): THREE.InstancedMesh[] {
  return parts.map(({ geometry, material }) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
  });
}
