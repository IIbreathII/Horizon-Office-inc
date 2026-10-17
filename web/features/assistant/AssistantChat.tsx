'use client';

import { useEffect, useRef, useState } from 'react';
import { FAINT, PANEL } from '@/shared/ui/surface';
import { ActionIcon } from './chat/ActionIcon';
import { MessageItem } from './chat/MessageItem';
import { LOADING_STATUSES, useSuggestions } from './chat/suggestions';
import { Welcome } from './chat/Welcome';
import { Mascot } from './Mascot';
import { useMascot } from './MascotProvider';
import { ASSISTANT_NAME } from './persona';
import { useAssistantChat } from './useAssistantChat';

/**
 * The chat window. Phones: a bottom sheet with the owl peeking over its top edge.
 * sm+: a compact card next to the mascot (bottom-left) with a tail pointing at it, like a speech bubble.
 * Stays mounted while closed (just hidden), so an answer that arrives after closing is not lost.
 */
export function AssistantChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mood, flyToMap, flyToNav, say } = useMascot();
  const { messages, loading, error, send, clear } = useAssistantChat();
  const suggestions = useSuggestions();
  const [draft, setDraft] = useState('');
  const listEnd = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = LOADING_STATUSES;

  // cycle the statuses while an answer is on its way; start over from the first next time
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % LOADING_STATUSES.length);
    }, 1500);
    return () => {
      clearInterval(interval);
      setStatusIdx(0);
    };
  }, [loading]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, loading]);

  // the dock passes a new onClose on every render: keep the latest without re-running the effects below
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // focus the input and listen for Esc only while open (not again on every re-render)
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // an answer arrived while the chat was closed: the owl says so
  const wasLoading = useRef(loading);
  useEffect(() => {
    if (wasLoading.current && !loading && !open && !error) say('Я відповіла! Натисни на мене, щоб прочитати 🦉', 'wave', 8000);
    wasLoading.current = loading;
  }, [loading, open, error, say]);

  function submit() {
    if (loading || !draft.trim()) return; // keep what is typed until it can be sent
    const text = draft;
    setDraft('');
    void send(text);
  }

  return (
    <div
      className={`fixed inset-x-2 bottom-2 z-50 h-[min(78dvh,620px)] sm:inset-x-auto sm:bottom-6 sm:left-24 sm:h-[min(560px,calc(100dvh-5rem))] sm:w-[360px] motion-safe:transition motion-safe:duration-200 motion-safe:starting:translate-y-4 motion-safe:starting:opacity-0 ${open ? '' : 'hidden'}`}
    >
      {/* phones: the owl peeks over the sheet; sm+: a tail points at the mascot in the corner */}
      <span aria-hidden className="absolute -top-12 right-5 sm:hidden">
        <Mascot mood={mood} className="size-16" />
      </span>
      <span aria-hidden className="absolute bottom-11 -left-1.5 hidden size-4 rotate-45 border-b border-l border-amber-300/60 bg-[#0c0c0e] sm:block" />

      <section
        role="dialog"
        aria-label={`Чат із помічницею ${ASSISTANT_NAME}`}
        className={`flex h-full flex-col overflow-hidden rounded-3xl! border-amber-300/50! ${PANEL} bg-[#0c0c0e]/95! shadow-[0_0_32px_-8px_rgba(252,211,77,0.55)]!`}
      >
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Mascot mood={mood} className="size-9" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{ASSISTANT_NAME}</p>
            <p className={`text-xs ${FAINT}`}>{loading ? 'друкує…' : 'твоя помічниця у волонтерстві'}</p>
          </div>
          {messages.length > 0 && (
            <button type="button" onClick={clear} title="Почати заново" className="cursor-pointer rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-white/10 hover:text-white">
              Очистити
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Закрити чат" className="cursor-pointer rounded-lg p-2 text-neutral-300 hover:bg-white/10 hover:text-white">
            <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clipRule="evenodd" /></svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.length === 0 ? (
            <Welcome suggestions={suggestions} onPick={(s) => void send(s.text)} />
          ) : (
            <ul className="flex flex-col gap-4">
              {messages.map((m, idx) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  isLatest={idx === messages.length - 1}
                  onNavigate={onClose}
                  flyToMap={flyToMap}
                  flyToNav={flyToNav}
                />
              ))}
              {loading && (
                <li className="flex items-center gap-2.5 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-3 text-sm text-neutral-200 backdrop-blur-md animate-message-in">
                  <Mascot mood="think" className="size-8 shrink-0 animate-float" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                      <ActionIcon name={statuses[statusIdx].icon} className="size-3.5 text-amber-300" />
                      <span>{statuses[statusIdx].text}</span>
                    </div>
                    <div className="flex gap-1 pt-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-1.5 rounded-full bg-amber-300 motion-safe:animate-bounce shadow-[0_0_6px_rgba(252,211,77,0.8)]"
                          style={{ animationDelay: `${i * 140}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </li>
              )}
            </ul>
          )}
          {error && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/40">{error}</p>}
          <div ref={listEnd} />
        </div>

        <footer className="border-t border-white/10 p-3">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <textarea
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Напиши, що шукаєш…"
              aria-label="Повідомлення"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-300/80 focus:ring-2 focus:ring-amber-300/25"
            />
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              aria-label="Надіслати"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-amber-300 text-black transition-all hover:bg-yellow-200 hover:shadow-[0_0_15px_rgba(252,211,77,0.5)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-neutral-500 active:scale-95"
            >
              <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-5"><path d="M3.105 3.105a1.5 1.5 0 0 1 1.89-.14l11 7a1.5 1.5 0 0 1 0 2.07l-11 7a1.5 1.5 0 0 1-2.24-1.302V4.268a1.5 1.5 0 0 1 .35-1.163z" /></svg>
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
}
