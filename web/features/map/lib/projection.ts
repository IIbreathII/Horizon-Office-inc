// Single source of the projection for the client. It must match the projection the city chunks in
// public/city were built with (manifest.json → center), otherwise markers drift off the streets.
// Equirectangular around the center of the city frame; x east, z = -north. 1 scene unit = 1 meter.
export const ORIGIN = { lat: 48.46194305, lng: 34.99557055 }; // = manifest.json center
export const BBOX = { south: 48.347496, west: 34.7489459, north: 48.5763901, east: 35.2421952 }; // city frame

const M_PER_DEG_LAT = (6_378_137 * Math.PI) / 180;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180);

export function project(lat: number, lng: number): [x: number, z: number] {
  return [(lng - ORIGIN.lng) * M_PER_DEG_LNG, -(lat - ORIGIN.lat) * M_PER_DEG_LAT];
}

export function unproject(x: number, z: number): { lat: number; lng: number } {
  return { lat: ORIGIN.lat - z / M_PER_DEG_LAT, lng: ORIGIN.lng + x / M_PER_DEG_LNG };
}

const [minX, maxZ] = project(BBOX.south, BBOX.west);
const [maxX, minZ] = project(BBOX.north, BBOX.east);
export const CITY_BOUNDS = { minX, maxX, minZ, maxZ };

const FOV = 45;
const cityHeight = maxZ - minZ;
const fitDistance = cityHeight / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);

// Camera numbers are tuned by hand: revisit them while looking at the rendered city.
export const CAMERA = {
  FOV,
  POLAR: 0.5,                        // tilt from vertical, rad: 0 = straight down, ~0.5 = slight game-like tilt
  MAX_DISTANCE: fitDistance * 1.05,  // the whole city fits in view
  MIN_DISTANCE: 1500,                // close enough to see buildings; detail chunks stream in below ~3.5 km
};

// Street-level view while a quest is selected
export const FOCUS = {
  POLAR: 1.05,       // strong tilt, still looking down at the street
  DISTANCE: 260,     // camera → quest distance on fly-to
  MIN_DISTANCE: 120,
  MAX_DISTANCE: 800,
};
