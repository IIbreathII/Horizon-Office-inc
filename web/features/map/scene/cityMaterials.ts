import * as THREE from 'three';

/** L0 cells per L1 chunk (4 × 4). */
export const CELLS_PER_L1 = 16;

// Draw order: flat layers without depth writes, bottom to top, then buildings.
export const RENDER_ORDER = { base: 0, groundL1: 1, groundL0: 2, buildings: 10 };

// L1 (base) meshes hide the cells already covered by a loaded L0 (detail) chunk.
const hideCellsVertex = /* glsl */ `
  #ifdef HIDE_CELLS
    attribute float aCell;
    uniform float uHidden[${CELLS_PER_L1}];
  #endif
`;
const hideCellsMain = /* glsl */ `
  #ifdef HIDE_CELLS
    if (uHidden[int(aCell + 0.5)] > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  #endif
`;

function hideUniforms(hideCells: boolean): Record<string, THREE.IUniform> {
  return hideCells ? { uHidden: { value: new Array<number>(CELLS_PER_L1).fill(0) } } : {};
}

/**
 * Stylized building material: bottom-to-top gradient by `gradT` (0 at the ground, 1 at the roof),
 * flat lighting from screen-space derivatives (works for sheared instance matrices too),
 * base color from instanceColor (instances) or vertex color (merged geometry).
 */
export function createBuildingMaterial({ vertexColors = false, hideCells = false } = {}) {
  return new THREE.ShaderMaterial({
    vertexColors,
    defines: hideCells ? { HIDE_CELLS: '' } : {},
    uniforms: {
      ...hideUniforms(hideCells),
      uLightDir: { value: new THREE.Vector3(-0.5, 0.85, 0.35).normalize() },
      uBottom: { value: 0.45 },
      uTop: { value: 1.08 },
      uRoof: { value: 1.18 },
    },
    vertexShader: /* glsl */ `
      attribute float gradT;
      varying float vT;
      varying vec3 vColor;
      varying vec3 vWorld;
      ${hideCellsVertex}
      void main() {
        ${hideCellsMain}
        vec4 p = vec4(position, 1.0);
        vColor = vec3(1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #endif
        #ifdef USE_COLOR
          vColor *= color;
        #endif
        vT = gradT;
        vec4 world = modelMatrix * p;
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLightDir;
      uniform float uBottom;
      uniform float uTop;
      uniform float uRoof;
      varying float vT;
      varying vec3 vColor;
      varying vec3 vWorld;
      void main() {
        vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        float roof = step(0.9, n.y);
        float t = smoothstep(0.0, 1.0, vT);
        vec3 c = vColor * mix(uBottom, uTop, t);
        c = mix(c, vColor * uRoof, roof);
        float diff = max(dot(n, uLightDir), 0.0);
        c *= 0.72 + 0.28 * diff;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Flat ground with vertex colors, drawn without depth writes so buildings always cover it. */
export function createGroundMaterial({ hideCells = false } = {}) {
  return new THREE.ShaderMaterial({
    vertexColors: true,
    depthWrite: false,
    defines: hideCells ? { HIDE_CELLS: '' } : {},
    uniforms: hideUniforms(hideCells),
    vertexShader: /* glsl */ `
      varying vec3 vColor;
      ${hideCellsVertex}
      void main() {
        ${hideCellsMain}
        vColor = color;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Unit cube standing on the ground: x, z ∈ [-0.5, 0.5], y ∈ [0, 1]. */
export function unitBox() {
  return withGradT(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
}

/** Unit triangular prism: base (0,0)-(1,0)-(0,1) in the XZ plane, height 1. */
export function unitPrism() {
  const base = [[0, 0], [1, 0], [0, 1]];
  const faces: number[][][] = [base.map(([x, z]) => [x, 1, z]), base.map(([x, z]) => [x, 0, z])];
  for (let i = 0; i < 3; i++) {
    const [x0, z0] = base[i], [x1, z1] = base[(i + 1) % 3];
    faces.push([[x0, 0, z0], [x1, 0, z1], [x1, 1, z1]], [[x0, 0, z0], [x1, 1, z1], [x0, 1, z0]]);
  }
  // turn faces outwards relative to the prism center
  const center = new THREE.Vector3(1 / 3, 0.5, 1 / 3);
  const pos: number[] = [];
  for (const f of faces) {
    const [a, b, c] = f.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    const mid = a.clone().add(b).add(c).divideScalar(3).sub(center);
    for (const v of n.dot(mid) < 0 ? [a, c, b] : [a, b, c]) pos.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return withGradT(g);
}

function withGradT(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = g.getAttribute('position');
  const t = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) t[i] = pos.getY(i);
  g.setAttribute('gradT', new THREE.BufferAttribute(t, 1));
  return g;
}
