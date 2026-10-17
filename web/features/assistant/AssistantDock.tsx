'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AssistantChat } from './AssistantChat';
import { Mascot } from './Mascot';
import { MascotFlight } from './MascotFlight';
import { MascotIntro } from './MascotIntro';
import { useMascot } from './MascotProvider';
import { ASSISTANT_NAME } from './persona';
import { useIntro } from './useIntro';
import { useStroll } from './useStroll';

/**
 * The mascot in the corner of every volunteer page: tap it to open the chat.
 * Phones: bottom-right next to the nav bar; larger screens: bottom-left (clear of the map panels
 * and above the map attribution).
 */
export function AssistantDock() {
  const {
    mood,
    bubble,
    hideBubble,
    chatOpen,
    setChatOpen,
    flight,
    finishFlight,
    isSleeping,
    isStrolling,
    endStroll,
    wakeUp,
  } = useMascot();

  const pathname = usePathname();
  const initialMount = useRef(true);
  const homeRef = useRef<HTMLSpanElement>(null); // the owl's resting spot, where flights start and end
  const walkerRef = useRef<HTMLSpanElement>(null); // the owl itself, moved by strolls

  const stroll = useStroll(walkerRef, isStrolling && !chatOpen, endStroll);

  // mount the chat on first open and keep it: closing it mid-answer must not drop the answer
  const [chatMounted, setChatMounted] = useState(false);
  if (chatOpen && !chatMounted) setChatMounted(true);

  // Reaction to page navigation
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    wakeUp();
  }, [pathname, wakeUp]);

  // Woken up: a startled little jump
  const wasSleeping = useRef(false);
  useEffect(() => {
    if (wasSleeping.current && !isSleeping && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      walkerRef.current?.animate(
        [
          { transform: 'none' },
          { transform: 'translateY(-8px) scale(0.9, 1.12)', offset: 0.35 },
          { transform: 'translateY(1px) scale(1.08, 0.92)', offset: 0.7 },
          { transform: 'none' },
        ],
        { duration: 420, easing: 'ease-out' },
      );
    }
    wasSleeping.current = isSleeping;
  }, [isSleeping]);

  // after sign-in: the tour for a new account, a quick hello otherwise
  useIntro();

  const dockMood = chatOpen ? 'wave' : isSleeping ? 'sleep' : stroll?.step === 'look' ? 'think' : mood;

  return (
    <>
      {flight &&
        (flight.type === 'greet' || flight.type === 'tour' ? (
          <MascotIntro kind={flight.type} name={flight.name ?? ''} homeRef={homeRef} onComplete={finishFlight} />
        ) : (
          <MascotFlight flight={flight} homeRef={homeRef} onComplete={finishFlight} />
        ))}

      <div className="fixed right-3 bottom-3 z-40 flex flex-col items-end gap-2 sm:right-auto sm:bottom-10 sm:left-4 sm:items-start">
        {bubble && !chatOpen && !flight && (
          <div
            role="status"
            className="relative max-w-64 rounded-2xl border border-amber-300/50 bg-[#111113]/95 px-3.5 py-2.5 pr-8 text-sm text-neutral-100 shadow-[0_0_20px_-6px_rgba(252,211,77,0.6)] backdrop-blur motion-safe:transition motion-safe:duration-200 motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0"
          >
            {bubble.text}
            <button
              type="button"
              onClick={hideBubble}
              aria-label="Сховати підказку"
              className="absolute top-1.5 right-1.5 cursor-pointer rounded-md p-1 text-neutral-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (isSleeping || isStrolling) {
              wakeUp();
              return;
            }
            hideBubble();
            setChatOpen(!chatOpen);
          }}
          aria-expanded={chatOpen}
          aria-label={chatOpen ? `Закрити чат з ${ASSISTANT_NAME}` : `Відкрити чат з ${ASSISTANT_NAME}`}
          className="group flex size-14 cursor-pointer items-center justify-center rounded-full bg-[#111113]/90 shadow-[0_0_24px_-4px_rgba(252,211,77,0.7)] ring-1 ring-amber-300/60 backdrop-blur transition-transform duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-95 sm:size-16 pulse-glow-border"
        >
          {/* hidden while its double is out flying, so there is only ever one owl */}
          <span ref={homeRef} className="relative size-11 sm:size-12" style={{ visibility: flight ? 'hidden' : undefined }}>
            <span ref={walkerRef} className="absolute inset-0">
              {stroll?.step === 'look' && (
                <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-2xl border border-amber-300/40 bg-[#111113]/95 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-amber-200 shadow-lg animate-message-in">
                  Оглядаю Дніпро… 👀
                </span>
              )}
              <span className={`block size-full ${stroll?.step === 'walk' ? 'motion-safe:animate-owl-waddle' : ''}`}>
                <Mascot
                  mood={dockMood}
                  isWalking={stroll?.step === 'walk'}
                  direction={stroll?.direction ?? 1}
                  className="size-full"
                />
              </span>
            </span>
          </span>
        </button>
      </div>

      {chatMounted && <AssistantChat open={chatOpen} onClose={() => setChatOpen(false)} />}
    </>
  );
}
