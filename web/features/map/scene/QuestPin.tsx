'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, DoubleSide, type Group } from 'three';

// GTA-style marker for the selected quest: a light beam on the spot and a spinning, bobbing arrow above it.
// Drawn without depth test so it stays visible through buildings.

const BEAM_HEIGHT = 70; // meters
const BEAM_RADIUS = 6;
export const ARROW_HEIGHT = 34; // arrow center above the ground

export function QuestPin({ x, z, color }: { x: number; z: number; color: string }) {
  const arrow = useRef<Group>(null);

  useFrame(({ clock, invalidate }) => {
    const a = arrow.current;
    if (!a) return;
    const t = clock.elapsedTime;
    a.rotation.y = t * 2;
    a.position.y = ARROW_HEIGHT + Math.sin(t * 3) * 3;
    invalidate(); // frameloop="demand": keep animating while the pin is shown
  });

  return (
    <>
      {/* lit by the scene lights in CityChunks */}
      <group position={[x, 0, z]}>
        <mesh position-y={BEAM_HEIGHT / 2} renderOrder={20}>
          <cylinderGeometry args={[BEAM_RADIUS, BEAM_RADIUS, BEAM_HEIGHT, 32, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.25}
            blending={AdditiveBlending}
            side={DoubleSide}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
        <group ref={arrow} position-y={ARROW_HEIGHT}>
          {/* 4-sided cone pointing down = GTA arrow */}
          <mesh rotation-x={Math.PI} renderOrder={21}>
            <coneGeometry args={[7, 16, 4]} />
            <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.25} flatShading depthTest={false} />
          </mesh>
        </group>
      </group>
    </>
  );
}
