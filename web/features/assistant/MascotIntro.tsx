'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { perchNear, type Direction, type Point } from './flightPath';
import { TOUR, speechPlacement, type IntroKind } from './intro';
import { findNavLink } from './MascotFlight';
import { OwlActor, type Pose } from './OwlActor';
import { cornerAt, createPuppet, measureHome } from './owlPuppet';
import { ASSISTANT_NAME } from './persona';

const STAGE_SCALE_MAX = 2.4; // the owl on center stage, relative to its corner size
const STOP_SCALE = 1.5; // the owl beside a nav button during the tour
const STOP_GAP = 64; // px from a nav button to the owl's center
const GREET_MS = 2600; // how long the quick hello stays

type Choice = 'next' | 'skip';
type Speech = {
  at: Point; // owl center
  radius: number;
  title: string;
  text: string;
  buttons?: { next: string; skip?: string };
  step?: { index: number; total: number };
};

/**
 * The hello after sign-in. `greet`: the owl pops out to the middle of the screen, grows, waves
 * and flies back. `tour`: from the middle it visits each nav button and tells what is there;
 * «Пропустити» (or Esc) sends it home at any step.
 */
export function MascotIntro({
  kind,
  name,
  homeRef,
  onComplete,
}: {
  kind: IntroKind;
  name: string;
  homeRef: RefObject<HTMLElement | null>;
  onComplete: () => void;
}) {
  const birdRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<Pose>({ flying: false, direction: 1, mood: 'idle' });
  const [speech, setSpeech] = useState<Speech | null>(null);
  const [spotlight, setSpotlight] = useState<Point | null>(null);
  // resolves the step the owl is waiting on
  const choose = useRef<((choice: Choice) => void) | null>(null);
  const pick = (choice: Choice) => {
    const resolve = choose.current;
    choose.current = null;
    resolve?.(choice);
  };

  const done = useRef(onComplete);
  useLayoutEffect(() => {
    done.current = onComplete;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !choose.current) return;
      const resolve = choose.current;
      choose.current = null;
      resolve('skip');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useLayoutEffect(() => {
    if (!birdRef.current || !bodyRef.current) return;
    const owl = createPuppet(birdRef.current, bodyRef.current);
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const { home, size } = measureHome(homeRef.current);
    owl.place(home, size);

    const ask = () =>
      new Promise<Choice>((resolve) => {
        choose.current = resolve;
      });
    const say = (line: Omit<Speech, 'at' | 'radius'>, at: Point, scale: number) =>
      setSpeech({ ...line, at, radius: (size * scale) / 2 });

    const stage = { x: viewport.width / 2, y: viewport.height * 0.38 };
    const stageScale = Math.min(STAGE_SCALE_MAX, (Math.min(viewport.width, viewport.height) * 0.3) / size);

    const act = async () => {
      // out of the corner to center stage, growing on the way
      setPose({ flying: false, direction: 1, mood: 'idle' });
      await owl.takeOff();
      setPose({ flying: true, direction: 1, mood: 'idle' });
      await owl.fly(home, cornerAt(stage, size), [1, stageScale + 0.2, stageScale]);
      setPose({ flying: false, direction: 1, mood: 'wave' });

      let at = stage;
      let scale = stageScale;
      if (kind === 'greet') {
        say({ title: `Привіт, ${name}!`, text: 'Рада знову тебе бачити. Якщо що — я тут, у кутку 🦉' }, at, scale);
        await owl.wait(GREET_MS);
      } else {
        say(
          {
            title: `Привіт! Я ${ASSISTANT_NAME}`,
            text: 'Твоя помічниця у волонтерстві. Покажу, що тут до чого, — це пів хвилини.',
            buttons: { next: 'Покажи', skip: 'Пропустити' },
          },
          at,
          scale,
        );
        let choice = await ask();

        const stops = TOUR.flatMap((stop) => {
          const target = findNavLink(stop.href);
          return target ? [{ stop, target }] : [];
        });
        for (const [i, { stop, target }] of stops.entries()) {
          if (choice === 'skip') break;
          const perch = perchNear(target, viewport, STOP_GAP);
          setSpeech(null);
          setPose({ flying: true, direction: perch.direction, mood: 'idle' });
          await owl.fly(cornerAt(at, size), cornerAt(perch.center, size), [scale, Math.max(scale, STOP_SCALE) + 0.15, STOP_SCALE], 40);
          at = perch.center;
          scale = STOP_SCALE;
          setPose({ flying: false, direction: perch.direction, mood: 'point' });
          setSpotlight(target);
          say(
            { title: stop.title, text: stop.text, buttons: { next: 'Далі', skip: 'Пропустити' }, step: { index: i + 1, total: stops.length } },
            at,
            scale,
          );
          choice = await ask();
          setSpotlight(null);
        }

        if (choice === 'next') {
          setPose({ flying: false, direction: 1, mood: 'cheer' });
          say(
            { title: 'От і все!', text: 'Я житиму в кутку. Натисни на мене — знайду квест або підкажу, куди йти.', buttons: { next: 'Зрозуміло!' } },
            at,
            scale,
          );
          await ask();
        }
      }

      // back to the corner
      setSpeech(null);
      setSpotlight(null);
      const homeward: Direction = home.x + size / 2 >= at.x ? 1 : -1;
      setPose({ flying: true, direction: homeward, mood: 'cheer' });
      await owl.fly(cornerAt(at, size), home, [scale, scale + 0.1, 1], 50);
      setPose({ flying: false, direction: homeward, mood: 'cheer' });
      await owl.land();
    };

    let stopped = false;
    act().then(
      () => !stopped && done.current(),
      () => !stopped && done.current(),
    );
    return () => {
      stopped = true;
      choose.current = null;
      owl.stop();
    };
  }, [kind, name, homeRef]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {kind === 'tour' && (
        <div className="absolute inset-0 bg-black/30 transition-opacity duration-500 starting:opacity-0" />
      )}
      {spotlight && (
        <span
          aria-hidden
          className="absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.8)] motion-safe:animate-pulse"
          style={{ left: spotlight.x, top: spotlight.y }}
        />
      )}
      <OwlActor birdRef={birdRef} bodyRef={bodyRef} pose={pose} />
      {speech && <SpeechBubble key={speech.title} speech={speech} onPick={pick} />}
    </div>
  );
}

function SpeechBubble({ speech, onPick }: { speech: Speech; onPick: (choice: Choice) => void }) {
  const placement = speechPlacement(speech.at, speech.radius, { width: window.innerWidth, height: window.innerHeight });
  const { buttons, step } = speech;

  return (
    <div
      role={buttons ? 'dialog' : 'status'}
      aria-label={buttons ? `Знайомство з ${ASSISTANT_NAME}` : undefined}
      className="pointer-events-auto fixed rounded-2xl border border-amber-300/50 bg-[#111113]/95 p-4 shadow-[0_0_28px_-6px_rgba(252,211,77,0.6)] backdrop-blur animate-message-in"
      style={placement}
    >
      {step && (
        <p className="text-[11px] font-semibold tracking-wider text-amber-300/80 uppercase">
          {step.index} з {step.total}
        </p>
      )}
      <p className="font-bold text-white">{speech.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-neutral-300">{speech.text}</p>
      {buttons && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {buttons.skip && (
            <button
              type="button"
              onClick={() => onPick('skip')}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/10 hover:text-white"
            >
              {buttons.skip}
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => onPick('next')}
            className="cursor-pointer rounded-xl bg-amber-300 px-3.5 py-1.5 text-sm font-bold text-black transition hover:bg-yellow-200 active:scale-95"
          >
            {buttons.next}
          </button>
        </div>
      )}
    </div>
  );
}
