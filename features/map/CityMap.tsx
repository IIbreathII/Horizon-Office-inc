'use client';

import { CameraControls, Html } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import CameraControlsImpl from 'camera-controls';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Box3, Vector3 } from 'three';
import { CATEGORIES } from '@/shared/categories';
import type { Quest } from '@/shared/types';
import { GLASS } from '@/shared/ui/glass';
import { Icon } from '@/shared/ui/Icon';
import { CAMERA, CITY_BOUNDS, FOCUS, project } from './lib/projection';
import { CityChunks } from './scene/CityChunks';
import { QuestPin } from './scene/QuestPin';

const { ACTION } = CameraControlsImpl;

const MARKER_HEIGHT = 10; // meters above the ground
const CLICK_THRESHOLD_PX = 5; // pointer travel beyond this is a drag, not a click
const ZOOM_STEP = 0.6; // one +/− click scales the camera distance by this factor
const IDLE_MS = 100; // no frame for this long = the map was idle

type CityMapProps = {
  quests: Quest[];
  selectedId: string | null;
  /** The quest side panel is shown: zoom buttons move left of it. */
  panelOpen: boolean;
  onSelect: (quest: Quest) => void;
  onClose: () => void;
};

export function CityMap({ quests, selectedId, panelOpen, onSelect, onClose }: CityMapProps) {
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const controls = useRef<CameraControls>(null);
  // R3F mounts the scene synchronously inside React DOM's commit; drei <Html> roots created
  // there break ("synchronously unmount a root" errors, lost markers). Add markers after that.
  const [created, setCreated] = useState(false);

  const selected = quests.find((q) => q.id === selectedId);
  const focus = selected ? project(selected.lat, selected.lng) : null;

  // dollyTo clamps to the current min/max distance (overview or quest focus range)
  function zoom(factor: number) {
    const c = controls.current;
    if (c) void c.dollyTo(c.distance * factor, true);
  }

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
        <MapCamera controlsRef={controls} focusX={focus?.[0] ?? null} focusZ={focus?.[1] ?? null} />
        <CityChunks />
        {selected && focus && (
          <QuestPin x={focus[0]} z={focus[1]} color={CATEGORIES[selected.category].color} />
        )}

        {created && quests.map((quest) => {
          // the selected quest is marked by the 3D pin instead of its dot
          if (quest.id === selectedId) return null;
          const [x, z] = project(quest.lat, quest.lng);
          const color = markerColor(quest);
          return (
            <Html key={quest.id} position={[x, MARKER_HEIGHT, z]} zIndexRange={[10, 0]}>
              {/* map pin: the tip of the tail (bottom center) sits on the quest location */}
              <button
                type="button"
                title={quest.title}
                aria-label={quest.title}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(quest);
                }}
                className="flex -translate-x-1/2 -translate-y-full cursor-pointer flex-col items-center drop-shadow-md transition-transform origin-bottom hover:scale-110"
              >
                <span
                  className="flex size-10 items-center justify-center rounded-full border-4 bg-white text-xl"
                  style={{ borderColor: color }}
                >
                  <Icon src={CATEGORIES[quest.category].icon} className="size-6" />
                </span>
                <span
                  className="-mt-0.5 h-0 w-0 border-x-8 border-t-10 border-x-transparent"
                  style={{ borderTopColor: color }}
                />
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
      {/* zoom buttons, moved left of the quest panel while it is open */}
      <div
        className={`absolute bottom-6 z-10 flex flex-col overflow-hidden rounded-2xl transition-[right] duration-300 ${GLASS} ${panelOpen ? 'right-80' : 'right-4'}`}
      >
        <ZoomButton label="Наблизити" onClick={() => zoom(ZOOM_STEP)}>
          +
        </ZoomButton>
        <div className="h-px bg-white/10" />
        <ZoomButton label="Віддалити" onClick={() => zoom(1 / ZOOM_STEP)}>
          −
        </ZoomButton>
      </div>
    </>
  );
}

function ZoomButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 cursor-pointer items-center justify-center text-2xl leading-none hover:bg-white/10"
    >
      {children}
    </button>
  );
}

/** Pin border/tail color by status: yellow = joined, grey = full, blue = available. */
function markerColor(quest: Quest): string {
  if (quest.myParticipation?.status === 'joined') return '#facc15';
  if (quest.slotsTaken >= quest.slotsTotal) return '#9ca3af';
  return '#3b82f6';
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

function MapCamera({
  controlsRef: ref,
  focusX,
  focusZ,
}: {
  controlsRef: RefObject<CameraControls | null>;
  focusX: number | null;
  focusZ: number | null;
}) {
  // overview distance to return to when the quest focus ends
  const overviewDistance = useRef<number | null>(null);
  const clock = useThree((s) => s.clock);
  const invalidate = useThree((s) => s.invalidate);

  // frameloop="demand": after idle time (e.g. typing in search) the first frame's delta is seconds long,
  // and camera-controls would finish a transition in that one step (a jump). Drop the idle time instead.
  // transitionstart also fires on every wheel/drag step: then frames are fresh and their delta is kept.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const onTransitionStart = () => {
      if (performance.now() - clock.oldTime > IDLE_MS) clock.getDelta();
      invalidate();
    };
    c.addEventListener('transitionstart', onTransitionStart);
    return () => c.removeEventListener('transitionstart', onTransitionStart);
  }, [ref, clock, invalidate]);

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
  }, [ref]);

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
  }, [ref, focusX, focusZ]);

  return <CameraControls ref={ref} makeDefault smoothTime={0.35} />;
}
