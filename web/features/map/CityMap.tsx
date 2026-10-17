'use client';

import { CameraControls, Html } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import CameraControlsImpl from 'camera-controls';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Box3, Vector3 } from 'three';
import { CATEGORIES } from '@/shared/categories';
import type { Category, MapQuest, Quest } from '@/shared/types';
import { GLASS } from '@/shared/ui/glass';
import { Icon } from '@/shared/ui/Icon';
import { CAMERA, CITY_BOUNDS, FOCUS, project, unproject } from './lib/projection';
import { CityChunks } from './scene/CityChunks';
import { QuestPin } from './scene/QuestPin';

const { ACTION } = CameraControlsImpl;

const MARKER_HEIGHT = 10; // meters above the ground
const CLICK_THRESHOLD_PX = 5; // pointer travel beyond this is a drag, not a click
const ZOOM_STEP = 0.6; // one +/− click scales the camera distance by this factor
const IDLE_MS = 100; // no frame for this long = the map was idle
const SAME_POINT_SPREAD_M = 60; // radius of the circle quests at the same point are fanned out on
const AVAILABLE_COLOR = '#3b82f6';
const PICK_COLOR = AVAILABLE_COLOR; // the picked point looks like an available quest on the volunteer map
const PICK_MIN_DISTANCE = 150; // pick mode zooms closer than the volunteer map, for a precise point

type LatLng = { lat: number; lng: number };

type CityMapProps = {
  quests: MapQuest[];
  selectedId: string | null;
  /** The quest side panel is shown: zoom buttons move left of it. */
  panelOpen: boolean;
  onSelect: (quest: Quest) => void;
  onClose: () => void;
  /** Location picking (organization quest form): a click on the ground reports its lat/lng. */
  pick?: { point: LatLng | null; category: Category | null; onPick: (point: LatLng) => void };
};

export function CityMap({ quests, selectedId, panelOpen, onSelect, onClose, pick }: CityMapProps) {
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const controls = useRef<CameraControls>(null);
  // R3F mounts the scene synchronously inside React DOM's commit; drei <Html> roots created
  // there break ("synchronously unmount a root" errors, lost markers). Add markers after that.
  const [created, setCreated] = useState(false);

  const positions = markerPositions(quests);
  const selected = quests.find((q) => q.id === selectedId);
  const focus = selected ? positions.get(selected.id) ?? null : null;

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
        <MapCamera
          controlsRef={controls}
          focusX={focus?.[0] ?? null}
          focusZ={focus?.[1] ?? null}
          minDistance={pick ? PICK_MIN_DISTANCE : undefined}
        />
        <CityChunks />
        {pick && <PickGround point={pick.point} category={pick.category} showPin={created} onPick={pick.onPick} />}
        {selected && focus && (
          <QuestPin x={focus[0]} z={focus[1]} color={CATEGORIES[selected.category].color} />
        )}

        {created && quests.map((quest) => {
          // the selected quest is marked by the 3D pin instead of its dot
          if (quest.id === selectedId) return null;
          const [x, z] = positions.get(quest.id) ?? project(quest.lat, quest.lng);
          return (
            <Html key={quest.id} position={[x, MARKER_HEIGHT, z]} zIndexRange={[10, 0]}>
              <MapPin color={markerColor(quest)} title={quest.title} onClick={() => onSelect(quest)}>
                <Icon src={CATEGORIES[quest.category].icon} className="size-6" />
              </MapPin>
            </Html>
          );
        })}
      </Canvas>
      {/* ODbL requires visible attribution: kept, but faint so it does not compete with the map */}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-1 left-1.5 z-10 text-[10px] text-black/35 transition-colors hover:text-black/70"
      >
        © OpenStreetMap contributors
      </a>
      {/* zoom buttons, moved left of the quest panel while it is open;
          phones pinch to zoom and need the bottom edge for the nav bar */}
      <div
        className={`absolute bottom-6 z-10 hidden flex-col overflow-hidden rounded-2xl transition-[right] duration-300 sm:flex ${GLASS} ${panelOpen ? 'right-80' : 'right-4'}`}
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

/** Teardrop map pin: the tip of the tail (bottom center) sits on the location. */
function MapPin({
  color,
  title,
  onClick,
  children,
}: {
  color: string;
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="flex -translate-x-1/2 -translate-y-full cursor-pointer flex-col items-center drop-shadow-md transition-transform origin-bottom hover:scale-110"
    >
      <span className="flex size-10 items-center justify-center rounded-full border-4 bg-white text-xl" style={{ borderColor: color }}>
        {children}
      </span>
      <span className="-mt-0.5 h-0 w-0 border-x-8 border-t-10 border-x-transparent" style={{ borderTopColor: color }} />
    </button>
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

const GROUND_SIZE = Math.max(CITY_BOUNDS.maxX - CITY_BOUNDS.minX, CITY_BOUNDS.maxZ - CITY_BOUNDS.minZ);

/**
 * Invisible ground plane that turns a click (not a drag) into lat/lng, plus the same pin as on the
 * volunteer map at the picked point: the category icon, or «?» until a category is chosen.
 */
function PickGround({
  point,
  category,
  showPin,
  onPick,
}: {
  point: LatLng | null;
  category: Category | null;
  /** drei <Html> may only mount after the Canvas is created (see `created` in CityMap). */
  showPin: boolean;
  onPick: (point: LatLng) => void;
}) {
  const picked = point ? project(point.lat, point.lng) : null;
  return (
    <>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[(CITY_BOUNDS.minX + CITY_BOUNDS.maxX) / 2, 0, (CITY_BOUNDS.minZ + CITY_BOUNDS.maxZ) / 2]}
        onClick={(e) => {
          if (e.delta > CLICK_THRESHOLD_PX) return; // the map was dragged
          e.stopPropagation();
          onPick(unproject(e.point.x, e.point.z));
        }}
      >
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {showPin && picked && (
        <Html position={[picked[0], MARKER_HEIGHT, picked[1]]} zIndexRange={[10, 0]}>
          <MapPin color={PICK_COLOR} title="Обрана точка">
            {category ? (
              <Icon src={CATEGORIES[category].icon} className="size-6" />
            ) : (
              <span className="font-bold text-gray-600">?</span>
            )}
          </MapPin>
        </Html>
      )}
    </>
  );
}

/**
 * Scene positions of the markers. Quests at exactly the same point are fanned out on a small circle,
 * so every pin stays visible and clickable when zoomed in (full grouping with a count badge: §6.4, later).
 */
function markerPositions(quests: MapQuest[]): Map<string, [x: number, z: number]> {
  const groups = new Map<string, MapQuest[]>();
  for (const quest of quests) {
    const key = `${quest.lat.toFixed(5)},${quest.lng.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), quest]);
  }
  const positions = new Map<string, [x: number, z: number]>();
  for (const group of groups.values()) {
    const [x, z] = project(group[0].lat, group[0].lng);
    group.forEach((quest, i) => {
      const angle = (i / group.length) * Math.PI * 2;
      const r = group.length > 1 ? SAME_POINT_SPREAD_M : 0;
      positions.set(quest.id, [x + Math.cos(angle) * r, z + Math.sin(angle) * r]);
    });
  }
  return positions;
}

/** Pin border/tail color by status: yellow = joined, grey = full, blue = available. */
function markerColor(quest: Quest): string {
  if (quest.myParticipation?.status === 'joined') return '#facc15';
  if (quest.slotsTaken >= quest.slotsTotal) return '#9ca3af';
  return AVAILABLE_COLOR;
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
  minDistance = CAMERA.MIN_DISTANCE,
}: {
  controlsRef: RefObject<CameraControls | null>;
  focusX: number | null;
  focusZ: number | null;
  /** Closest zoom of the overview camera (pick mode allows closer than the volunteer map). */
  minDistance?: number;
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
    applyLimits(c, { ...CAMERA, MIN_DISTANCE: minDistance });

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
  }, [ref, minDistance]);

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
      applyLimits(c, { ...CAMERA, MIN_DISTANCE: minDistance });
      void lookAtFrom(c, cameraTarget.x, cameraTarget.z, overviewDistance.current, CAMERA.POLAR, true);
      overviewDistance.current = null;
    }
  }, [ref, focusX, focusZ, minDistance]);

  return <CameraControls ref={ref} makeDefault smoothTime={0.35} />;
}
