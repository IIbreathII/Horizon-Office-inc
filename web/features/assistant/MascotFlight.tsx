'use client';

import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { perchNear, type Direction, type Point } from './flightPath';
import type { FlightAction } from './MascotProvider';
import { OwlActor, TapRipple, type Pose } from './OwlActor';
import { cornerAt, createPuppet, measureHome } from './owlPuppet';

const PERCH_GAP = 60; // px from the target to the owl's center while it hovers there
const PERCH_SCALE = 1.3; // the owl is drawn bigger in the air than in its corner
const TAP_REACH = 0.55; // share of the gap the owl lunges toward the target to tap it

type Tap = { target: Point; perch: Point; size: number };

const center = (el: Element): Point => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Center of the main nav's button for `href` (query ignored), if it is on the page. */
export function findNavLink(href: string): Point | null {
  const path = href.split('?')[0];
  const link = document.querySelector(`nav[aria-label="Головне меню"] a[href="${CSS.escape(path)}"]`);
  return link ? center(link) : null;
}

/**
 * What the owl points at: the nav button for `nav`. For `map` the selected quest's pin, which the camera
 * is about to center: at takeoff that is only an estimate (screen middle, the arrow a little above it);
 * `findMapPin` gives the real spot once the camera got there.
 */
function findTarget(flight: NonNullable<FlightAction>): Point {
  const link = flight.type === 'nav' && flight.href ? findNavLink(flight.href) : null;
  return link ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 - 40 };
}

/** The selected pin's arrow on screen (an anchor CityMap renders for us), if it is in view. */
function findMapPin(): Point | null {
  const anchor = document.querySelector('[data-mascot-target]');
  if (!anchor) return null;
  const p = center(anchor);
  return p.x >= 0 && p.y >= 0 && p.x <= window.innerWidth && p.y <= window.innerHeight ? p : null;
}

/**
 * The owl leaves its corner (`homeRef`, hidden meanwhile by the dock), arcs over to the target,
 * taps it (navigating for `nav`), and flies back to land exactly where it took off.
 */
export function MascotFlight({
  flight,
  homeRef,
  onComplete,
}: {
  flight: NonNullable<FlightAction>;
  homeRef: RefObject<HTMLElement | null>;
  onComplete: () => void;
}) {
  const router = useRouter();
  const birdRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<Pose>({ flying: false, direction: 1, mood: 'idle' });
  const [tap, setTap] = useState<Tap | null>(null);

  // the act reads the latest router/callback without restarting
  const latest = useRef({ router, onComplete });
  useLayoutEffect(() => {
    latest.current = { router, onComplete };
  });

  useLayoutEffect(() => {
    if (!birdRef.current || !bodyRef.current) return;
    const owl = createPuppet(birdRef.current, bodyRef.current);
    const navigate = () => {
      if (flight.href) latest.current.router.push(flight.href);
    };

    // start on top of the corner owl, same size: the handover is invisible
    const { home, size } = measureHome(homeRef.current);
    owl.place(home, size);
    // the map camera glides to the quest while the owl is on its way
    if (flight.type === 'map') navigate();

    const target = findTarget(flight);
    const perch = perchNear(target, { width: window.innerWidth, height: window.innerHeight }, PERCH_GAP);
    const perchCorner = cornerAt(perch.center, size);
    const homeward: Direction = home.x >= perch.center.x ? 1 : -1;

    const act = async () => {
      setPose({ flying: false, direction: perch.direction, mood: 'idle' });
      await owl.takeOff();
      setPose({ flying: true, direction: perch.direction, mood: 'idle' });
      await owl.fly(home, perchCorner, [1, 1.45, PERCH_SCALE]);

      // hover beside the target, look at it, lunge and tap
      setPose({ flying: true, direction: perch.direction, mood: 'point' });
      await owl.wait(280);
      // by now the map camera has settled: aim at where the pin really is
      const aim = (flight.type === 'map' && findMapPin()) || target;
      owl.later(190, () => {
        setTap({ target: aim, perch: perch.center, size: size * PERCH_SCALE });
        if (flight.type === 'nav') navigate();
      });
      await owl.lunge(
        ((aim.x - perch.center.x) * TAP_REACH) / PERCH_SCALE,
        ((aim.y - perch.center.y) * TAP_REACH) / PERCH_SCALE,
      );
      await owl.wait(700);

      // turn around, happy, and head home on a flatter arc
      setPose({ flying: true, direction: homeward, mood: 'cheer' });
      await owl.wait(260);
      setTap(null);
      await owl.fly(perchCorner, home, [PERCH_SCALE, 1.4, 1], 50);
      setPose({ flying: false, direction: homeward, mood: 'cheer' });
      await owl.land();
    };

    let stopped = false;
    // a stopped act rejects; `stopped` keeps onComplete from running after unmount
    act().then(
      () => !stopped && latest.current.onComplete(),
      () => !stopped && latest.current.onComplete(),
    );
    return () => {
      stopped = true;
      owl.stop();
    };
  }, [flight, homeRef]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {tap && (
        <>
          <TapRipple at={tap.target} />
          <span
            className="absolute -translate-x-1/2 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black whitespace-nowrap text-black shadow-lg animate-message-in"
            style={{ left: tap.perch.x, top: tap.perch.y - tap.size / 2 - 26 }}
          >
            Ось тут! 📍
          </span>
        </>
      )}
      <OwlActor birdRef={birdRef} bodyRef={bodyRef} pose={pose} />
    </div>
  );
}
