import type { RefObject } from 'react';
import type { Direction, Point } from './flightPath';
import { Mascot } from './Mascot';
import type { MascotMood } from './persona';

export type Pose = { flying: boolean; direction: Direction; mood: MascotMood };

/** The flying owl: `birdRef` is moved along paths, `bodyRef` squashes and lunges (see createPuppet). */
export function OwlActor({
  birdRef,
  bodyRef,
  pose,
}: {
  birdRef: RefObject<HTMLDivElement | null>;
  bodyRef: RefObject<HTMLDivElement | null>;
  pose: Pose;
}) {
  return (
    <div ref={birdRef} className="pointer-events-none fixed top-0 left-0 will-change-transform">
      <div ref={bodyRef} className="size-full">
        <Mascot
          mood={pose.mood}
          isFlying={pose.flying}
          direction={pose.direction}
          className="size-full drop-shadow-[0_0_14px_rgba(252,211,77,0.75)]"
        />
      </div>
    </div>
  );
}

/** Golden rings where the owl taps. */
export function TapRipple({ at }: { at: Point }) {
  return (
    <span className="pointer-events-none absolute size-16 -translate-x-1/2 -translate-y-1/2" style={{ left: at.x, top: at.y }}>
      <span className="absolute inset-0 rounded-full border-2 border-amber-300 bg-amber-300/20 animate-tap-ripple" />
      <span className="absolute inset-0 rounded-full border-2 border-amber-200 animate-tap-ripple [animation-delay:180ms]" />
    </span>
  );
}
