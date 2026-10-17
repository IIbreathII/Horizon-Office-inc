'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { IntroKind } from './intro';
import type { MascotMood } from './persona';

/** Without attention for this long the owl goes for a stroll; after the next such spell it naps. */
const IDLE_MS = 20_000;

type Bubble = { text: string } | null;

/** An act of the flying owl: to a quest on the map, to a nav button, or the sign-in hello/tour. */
export type FlightAction = {
  type: 'map' | 'nav' | IntroKind;
  questId?: string;
  href?: string;
  label?: string;
  /** Who the hello is for. */
  name?: string;
} | null;

type MascotState = {
  mood: MascotMood;
  setMood: (mood: MascotMood) => void;
  /** Speech bubble next to the mascot (not the chat). */
  bubble: Bubble;
  /** Show a short line in the bubble; it hides after `ms` (0 = until closed). */
  say: (text: string, mood?: MascotMood, ms?: number) => void;
  hideBubble: () => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  flight: FlightAction;
  flyToMap: (questId: string) => void;
  flyToNav: (href: string, label: string) => void;
  /** The sign-in hello; returns false (not started) while the chat is open or another act is on. */
  startIntro: (kind: IntroKind, name: string) => boolean;
  finishFlight: () => void;
  isSleeping: boolean;
  isStrolling: boolean;
  /** The stroll walked back to its corner. */
  endStroll: () => void;
  wakeUp: () => void;
};

const MascotContext = createContext<MascotState | null>(null);

/** The mascot is one character across the app: any screen can make it react via useMascot(). */
export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMood] = useState<MascotMood>('idle');
  const [bubble, setBubble] = useState<Bubble>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [flight, setFlight] = useState<FlightAction>(null);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isStrolling, setIsStrolling] = useState(false);
  // bumped on every interaction: restarts the idle countdown
  const [activity, setActivity] = useState(0);

  const strolled = useRef(false); // the first idle spell is a stroll, the next one a nap
  const bubbleTimer = useRef<number | null>(null);
  const moodTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    if (moodTimer.current) window.clearTimeout(moodTimer.current);
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  /** A mood for a moment, then back to idle (one timer, so overlapping reactions don't race). */
  const flashMood = useCallback((next: MascotMood, ms: number) => {
    if (moodTimer.current) window.clearTimeout(moodTimer.current);
    setMood(next);
    moodTimer.current = window.setTimeout(() => setMood('idle'), ms);
  }, []);

  /** Someone paid attention: stop napping or strolling and start the idle countdown over. */
  const rouse = useCallback(() => {
    setIsSleeping(false);
    setIsStrolling(false);
    strolled.current = false;
    setActivity((n) => n + 1);
  }, []);

  // idle countdown: runs only while nothing else is going on
  useEffect(() => {
    if (chatOpen || flight || bubble || isSleeping || isStrolling) return;
    const id = window.setTimeout(() => {
      if (strolled.current) setIsSleeping(true);
      else {
        strolled.current = true;
        setIsStrolling(true);
      }
    }, IDLE_MS);
    return () => window.clearTimeout(id);
  }, [chatOpen, flight, bubble, isSleeping, isStrolling, activity]);

  const wakeUp = useCallback(() => {
    rouse();
    flashMood('wave', 2000);
  }, [rouse, flashMood]);

  const endStroll = useCallback(() => setIsStrolling(false), []);

  const hideBubble = useCallback(() => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);

  const say = useCallback(
    (text: string, nextMood: MascotMood = 'idle', ms = 6000) => {
      rouse();
      clearTimers();
      setBubble({ text });
      setMood(nextMood);
      if (ms > 0) {
        bubbleTimer.current = window.setTimeout(() => {
          setBubble(null);
          setMood('idle');
        }, ms);
      }
    },
    [rouse, clearTimers],
  );

  const flyToMap = useCallback(
    (questId: string) => {
      rouse();
      setChatOpen(false);
      setFlight({ type: 'map', questId, href: `/map?quest=${questId}` });
    },
    [rouse],
  );

  const flyToNav = useCallback(
    (href: string, label: string) => {
      rouse();
      setChatOpen(false);
      setFlight({ type: 'nav', href, label });
    },
    [rouse],
  );

  const startIntro = useCallback(
    (kind: IntroKind, name: string) => {
      if (chatOpen || flight) return false;
      rouse();
      setFlight({ type: kind, name });
      return true;
    },
    [chatOpen, flight, rouse],
  );

  /** A mood set from outside (the chat) cancels a pending flashMood reset, so it is not overwritten. */
  const setMoodNow = useCallback((next: MascotMood) => {
    if (moodTimer.current) window.clearTimeout(moodTimer.current);
    setMood(next);
  }, []);

  const finishFlight = useCallback(() => {
    setFlight(null);
    flashMood('cheer', 1600);
    setActivity((n) => n + 1);
  }, [flashMood]);

  const value = useMemo(
    () => ({
      mood,
      setMood: setMoodNow,
      bubble,
      say,
      hideBubble,
      chatOpen,
      setChatOpen,
      flight,
      flyToMap,
      flyToNav,
      startIntro,
      finishFlight,
      isSleeping,
      isStrolling,
      endStroll,
      wakeUp,
    }),
    [mood, setMoodNow, bubble, say, hideBubble, chatOpen, flight, flyToMap, flyToNav, startIntro, finishFlight, isSleeping, isStrolling, endStroll, wakeUp],
  );

  return <MascotContext value={value}>{children}</MascotContext>;
}

export function useMascot(): MascotState {
  const value = useContext(MascotContext);
  if (!value) throw new Error('useMascot must be used inside <MascotProvider>');
  return value;
}
