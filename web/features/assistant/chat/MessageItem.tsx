'use client';

import { useEffect, useState } from 'react';
import type { ChatMessage } from '../types';
import { formatSegments } from './formatText';
import { NavBubble } from './NavBubble';
import { QuestCardMini } from './QuestCardMini';

/** Answer text with its **bold** parts and highlight terms emphasized (see formatSegments). */
function FormattedText({ text, highlights }: { text: string; highlights?: string[] }) {
  return (
    <>
      {formatSegments(text, highlights).map((segment, i) =>
        segment.strong ? (
          // inline, not inline-block: keeps the line height and wraps like text
          <strong
            key={i}
            className="rounded-md bg-amber-300/15 px-1 py-px font-bold text-amber-200 ring-1 ring-amber-300/35 box-decoration-clone"
          >
            {segment.text}
          </strong>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}

/** One chat message; the latest assistant answer types itself out, then its suggestions appear. */
export function MessageItem({
  message,
  isLatest,
  onNavigate,
  flyToMap,
  flyToNav,
}: {
  message: ChatMessage;
  isLatest: boolean;
  onNavigate: () => void;
  flyToMap: (questId: string) => void;
  flyToNav: (href: string, label: string) => void;
}) {
  const [revealedLength, setRevealedLength] = useState(isLatest && message.role === 'assistant' ? 0 : message.text.length);

  useEffect(() => {
    if (!isLatest || message.role !== 'assistant' || revealedLength >= message.text.length) return;
    const timer = setTimeout(() => {
      setRevealedLength((prev) => Math.min(message.text.length, prev + 4));
    }, 18);
    return () => clearTimeout(timer);
  }, [isLatest, message.role, revealedLength, message.text.length]);

  if (message.role === 'user') {
    return (
      <li className="ml-8 self-end animate-message-in">
        <div className="rounded-2xl rounded-br-xs bg-gradient-to-r from-amber-300 to-amber-400 px-4 py-2.5 text-sm font-medium whitespace-pre-wrap text-neutral-950 shadow-md shadow-amber-500/10">
          {message.text}
        </div>
      </li>
    );
  }

  const isTyping = isLatest && revealedLength < message.text.length;
  const displayedText = isTyping ? message.text.slice(0, revealedLength) : message.text;

  return (
    <li className="mr-4 flex flex-col gap-2.5 animate-message-in">
      <div className="relative rounded-2xl rounded-tl-xs border border-white/10 bg-white/[0.06] p-3.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-100 shadow-lg backdrop-blur-md">
        <FormattedText text={displayedText} highlights={message.highlights} />
        {isTyping && (
          <span className="ml-0.5 inline-block h-4 w-1.5 align-middle bg-amber-300 animate-pulse rounded-full" />
        )}
      </div>
      {!isTyping && message.navSuggestion && (
        <NavBubble nav={message.navSuggestion} onNavigate={onNavigate} flyToNav={flyToNav} />
      )}
      {!isTyping &&
        message.quests?.map((card) => (
          <QuestCardMini key={card.quest.id} card={card} onNavigate={onNavigate} flyToMap={flyToMap} />
        ))}
    </li>
  );
}
