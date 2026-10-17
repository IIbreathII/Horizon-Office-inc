'use client';

import { useEffect, useRef, useState } from 'react';
import { useMe, useQuests, useRewardSlot } from '@/shared/api/queries';
import { useMascot } from './MascotProvider';
import type { AssistantRequest, AssistantResponse, ChatMessage } from './types';

const STORAGE_KEY = 'horizon:assistant-chat';
const HISTORY_LIMIT = 12; // messages sent to the server
const MAX_JOINED_IDS = 100; // the server accepts this many joined quest ids

const newId = () => Math.random().toString(36).slice(2);

function loadHistory(): ChatMessage[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as ChatMessage[];
  } catch {
    return [];
  }
}

/** Chat with the assistant: history (per tab), sending, mascot mood. No geolocation: we don't track users. */
export function useAssistantChat() {
  const { setMood } = useMascot();
  const { data: me } = useMe();
  const { data: slot } = useRewardSlot(); // completed quests and the gift progress, for honest numbers
  const { data: cityQuests } = useQuests(); // same cache as the map: carries the user's participation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  // sessionStorage exists only in the browser: load after mount, then keep it in sync
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      setMessages(loadHistory());
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage full or blocked: the chat still works for this session
    }
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { id: newId(), role: 'user', text: trimmed };
    const history = [...messages, userMessage];
    setMessages(history);
    setLoading(true);
    setError(null);
    setMood('think');

    const body: AssistantRequest = {
      messages: history.slice(-HISTORY_LIMIT).map((m) => ({ role: m.role, text: m.text })),
      profile: me
        ? {
            name: me.username,
            level: me.level,
            xp: me.xp,
            xpToNextLevel: Math.max(0, me.levelProgress.required - me.levelProgress.current),
            balance: me.balance,
            ...(slot && {
              completedQuests: slot.completedQuests,
              questsPerGift: slot.questsPerSpin,
              questsToNextGift: slot.questsPerSpin - slot.progress,
              giftsAvailable: slot.spinsAvailable,
            }),
          }
        : null,
      joinedQuestIds: cityQuests
        ?.filter((q) => q.myParticipation && q.myParticipation.status !== 'rejected')
        .map((q) => q.id)
        .slice(0, MAX_JOINED_IDS),
    };

    try {
      // the session cookie goes along (same origin): the route only answers signed-in users
      const res = await fetch('/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => null)) as (AssistantResponse & { error?: string }) | null;
      if (!res.ok || !data || data.error) throw new Error(data?.error ?? 'Помічник не відповідає');
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', text: data.text, quests: data.quests, navSuggestion: data.navSuggestion, highlights: data.highlights }]);
      setMood(data.mood);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помічник не відповідає');
      setMood('sad');
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setMessages([]);
    setError(null);
    setMood('wave');
  }

  return { messages, loading, error, send, clear };
}
