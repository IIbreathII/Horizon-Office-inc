import type * as THREE from 'three';

// City life tunables (tuned by eye). Sizes are exaggerated so the models read from the map camera:
// they grow with the camera distance (from the base size up to the max) so cars and boats stay
// visible when zoomed out: size = clamp(distance × sizePerDistance, base, max).

export const CARS = {
  urls: ['/models/vehicles/sedan.glb', '/models/vehicles/taxi.glb', '/models/vehicles/van.glb', '/models/vehicles/suv.glb'],
  count: 300,
  lengthM: 12, // real cars ~4.5 m
  maxLengthM: 150,
  sizePerDistance: 0.006,
  speedMps: [10, 16] as const,
  laneOffset: 0.35, // right-hand traffic, × car length
  areaPerDistance: 2, // cars drive within camera distance × this around the point the camera looks at
  minAreaM: 1500,
};

export const BOATS = {
  urls: [
    '/models/boats/boat-sail-a.glb',
    '/models/boats/boat-speed-a.glb',
    '/models/boats/boat-tug-a.glb',
    '/models/boats/boat-fishing-small.glb',
  ],
  count: 12,
  lengthM: 120,
  maxLengthM: 500,
  sizePerDistance: 0.016,
  speedMps: [5, 9] as const,
};

/** The ground point the camera looks at (world x, z) and the camera's distance to it. */
export function cameraGround(camera: THREE.Camera, out: { x: number; z: number; distance: number }) {
  const p = camera.position;
  const e = camera.matrixWorld.elements; // the camera looks along -Z of its matrix
  const dx = -e[8], dy = -e[9], dz = -e[10];
  out.distance = dy < -1e-3 ? -p.y / dy : p.y;
  out.x = p.x + dx * (dy < -1e-3 ? out.distance : 0);
  out.z = p.z + dz * (dy < -1e-3 ? out.distance : 0);
  return out;
}

/** Model size for the current camera distance (see the note above). */
export const lifeSize = (cfg: { lengthM: number; maxLengthM: number; sizePerDistance: number }, distance: number) =>
  Math.min(Math.max(distance * cfg.sizePerDistance, cfg.lengthM), cfg.maxLengthM);

/**
 * Boat routes along the Dnipro (lat, lng), checked against the city's water polygons (waypoints and
 * the midpoints between them). Boats sail back and forth along a smooth curve through them.
 */
export const RIVER_ROUTES: [lat: number, lng: number][][] = [
  // main channel: from the western reservoir past the center, then south
  [
    [48.5092, 34.9332], [48.5056, 34.944], [48.502, 34.944], [48.4984, 34.9549], [48.4985, 34.96], [48.4966, 34.9684],
    [48.4948, 34.982],
    [48.4912, 35.0036], [48.4876, 35.0253], [48.484, 35.0416], [48.4804, 35.0524], [48.4769, 35.0632],
    [48.4733, 35.0687], [48.4697, 35.0795], [48.4661, 35.0903], [48.4625, 35.0957], [48.4589, 35.0957],
    [48.4553, 35.0957], [48.4517, 35.0957], [48.4481, 35.0903], [48.4445, 35.0957], [48.4409, 35.0903],
    [48.4373, 35.1012], [48.4337, 35.0903], [48.4301, 35.0903], [48.4265, 35.0957], [48.423, 35.0957],
    [48.4194, 35.0957], [48.4158, 35.1012], [48.4122, 35.0957], [48.4086, 35.0957], [48.405, 35.1012],
    [48.4014, 35.1012], [48.3978, 35.1066], [48.3942, 35.112],
  ],
  // eastern channel (its lower part is broken up by islands, so boats turn back before it)
  [
    [48.5056, 35.177], [48.502, 35.177], [48.4984, 35.177], [48.4948, 35.177], [48.4912, 35.1716],
    [48.4876, 35.1716], [48.484, 35.1662], [48.4822, 35.1608],
  ],
];
