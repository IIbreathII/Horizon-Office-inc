'use client';

import { CameraControls, Html } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import CameraControlsImpl from 'camera-controls';
import { useEffect, useRef, useState } from 'react';
import { Box3, Vector3 } from 'three';
import { CATEGORIES } from '@/shared/categories';
import type { Quest } from '@/shared/types';
import { CAMERA, CITY_BOUNDS, FOCUS, project } from './lib/projection';
import { CityChunks } from './scene/CityChunks';
import { QuestPin } from './scene/QuestPin';

const { ACTION } = CameraControlsImpl;

const MARKER_HEIGHT = 10; // meters above the ground
const CLICK_THRESHOLD_PX = 5; // pointer travel beyond this is a drag, not a click

type CityMapProps = {
  quests: Quest[];
  selectedId: string | null;
  onSelect: (quest: Quest) => void;
  onClose: () => void;
};

export function CityMap({ quests, selectedId, onSelect, onClose }: CityMapProps) {
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  // R3F mounts the scene synchronously inside React DOM's commit; drei <Html> roots created
  // there break ("synchronously unmount a root" errors, lost markers). Add markers after that.
  const [created, setCreated] = useState(false);

  const selected = quests.find((q) => q.id === selectedId);
  const focus = selected ? project(selected.lat, selected.lng) : null;

  return (
    <>
      <Canvas
        flat
        frameloop="demand"
        dpr={[1, 2]}
        camera={{
          fov: CAMERA.FOV,
          near: 10,
          far: CAMERA.MAX_DISTANCE * 3,
          position: [0, CAMERA.MAX_DISTANCE, 0.001],
        }}
        onCreated={() => setCreated(true)}
        onPointerDown={(e) => {
          pointerDown.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMissed={(e) => {
          // `click` fires at the pointerup position: close only if the pointer barely moved
          const down = pointerDown.current;
          if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) <= CLICK_THRESHOLD_PX) {
            onClose();
          }
        }}
      >
        <MapCamera focusX={focus?.[0] ?? null} focusZ={focus?.[1] ?? null} />
        <CityChunks />
        {selected && focus && (
          <QuestPin x={focus[0]} z={focus[1]} color={CATEGORIES[selected.category].color} />
        )}

        {created && quests.map((quest) => {
          // the selected quest is marked by the 3D pin instead of its dot
          if (quest.id === selectedId) return null;
          const [x, z] = project(quest.lat, quest.lng);
          return (
            <Html key={quest.id} position={[x, MARKER_HEIGHT, z]} center zIndexRange={[10, 0]}>
              <button
                type="button"
                title={quest.title}
                aria-label={quest.title}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(quest);
                }}
                className={`flex size-10 cursor-pointer items-center justify-center rounded-full bg-white text-xl shadow-md ring-4 transition-transform hover:scale-110 ${markerRingClass(quest)}`}
              >
                {CATEGORIES[quest.category].emoji}
              </button>
            </Html>
          );
        })}
      </Canvas>
      {/* ODbL requires visible attribution */}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-1 left-1 z-10 rounded bg-white/70 px-1.5 text-[11px] text-slate-600"
      >
        © OpenStreetMap contributors
      </a>
    </>
  );
}

function markerRingClass(quest: Quest): string {
  if (quest.myParticipation?.status === 'joined') return 'ring-yellow-400';
  if (quest.slotsTaken >= quest.slotsTotal) return 'ring-gray-400';
  return 'ring-blue-500';
}

type CameraView = { POLAR: number; MIN_DISTANCE: number; MAX_DISTANCE: number };

function applyLimits(c: CameraControls, view: CameraView) {
  c.minPolarAngle = c.maxPolarAngle = view.POLAR;
  c.minDistance = view.MIN_DISTANCE;
  c.maxDistance = view.MAX_DISTANCE;
}

/**
 * Camera south of the ground point (x, z), tilted by `polar` from vertical: north stays up.
 * setLookAt does not clamp to the polar limits, so the tilt is applied here.
 * The tiny z offset avoids the degenerate "up" (jitter) when polar is 0.
 */
function lookAtFrom(c: CameraControls, x: number, z: number, distance: number, polar: number, animate: boolean) {
  return c.setLookAt(x, distance * Math.cos(polar), z + distance * Math.sin(polar) + 0.001, x, 0, z, animate);
}

const cameraTarget = new Vector3();

function MapCamera({ focusX, focusZ }: { focusX: number | null; focusZ: number | null }) {
  const ref = useRef<CameraControls>(null);
  // overview distance to return to when the quest focus ends
  const overviewDistance = useRef<number | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;

    // Fixed tilt, no rotation
    c.azimuthRotateSpeed = 0;
    c.polarRotateSpeed = 0;
    applyLimits(c, CAMERA);

    // Gestures: drag = pan along the ground (works with tilt), wheel/pinch = limited zoom
    c.mouseButtons.left = ACTION.SCREEN_PAN;
    c.mouseButtons.right = ACTION.SCREEN_PAN;
    c.mouseButtons.wheel = ACTION.DOLLY;
    c.touches.one = ACTION.TOUCH_SCREEN_PAN;
    c.touches.two = ACTION.TOUCH_DOLLY;
    c.touches.three = ACTION.NONE;

    c.setBoundary(
      new Box3(
        new Vector3(CITY_BOUNDS.minX, 0, CITY_BOUNDS.minZ),
        new Vector3(CITY_BOUNDS.maxX, 0, CITY_BOUNDS.maxZ),
      ),
    );
    // Must stay 0: with friction, camera-controls divides by a dot product that becomes 0 on a purely
    // horizontal drag once the target's y drifts off the flat boundary → NaN camera, blank map.
    c.boundaryFriction = 0;

    void lookAtFrom(c, 0, 0, CAMERA.MAX_DISTANCE, CAMERA.POLAR, false);
  }, []);

  // Quest selected: fly down to street level. Deselected: fly back up at the same spot.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (focusX !== null && focusZ !== null) {
      overviewDistance.current ??= c.distance;
      applyLimits(c, FOCUS);
      void lookAtFrom(c, focusX, focusZ, FOCUS.DISTANCE, FOCUS.POLAR, true);
    } else if (overviewDistance.current !== null) {
      c.getTarget(cameraTarget);
      applyLimits(c, CAMERA);
      void lookAtFrom(c, cameraTarget.x, cameraTarget.z, overviewDistance.current, CAMERA.POLAR, true);
      overviewDistance.current = null;
    }
  }, [focusX, focusZ]);

  return <CameraControls ref={ref} makeDefault smoothTime={0.35} />;
}
