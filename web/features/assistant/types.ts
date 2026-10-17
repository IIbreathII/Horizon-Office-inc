import type { Quest } from '@/shared/types';
import type { MascotMood } from './persona';

/** A quest card the assistant shows under its answer. */
export type AssistantQuestCard = { quest: Quest };

/** POST /ai/chat request body. */
export type AssistantRequest = {
  /** Conversation so far, oldest first; the last item is the new user message. */
  messages: { role: 'user' | 'assistant'; text: string }[];
  /** Small profile snapshot for personal answers. */
  profile?: AssistantProfile | null;
  /** Quests the user has joined: the server has no session to know it from. */
  joinedQuestIds?: string[];
};

/** What the assistant knows about the user: only real numbers, so it never has to guess them. */
export type AssistantProfile = {
  name?: string;
  level?: number;
  xp?: number;
  /** XP still needed for the next level (0 = max level). */
  xpToNextLevel?: number;
  balance?: number;
  completedQuests?: number;
  /** Gift for good deeds: one per this many completed quests. */
  questsPerGift?: number;
  questsToNextGift?: number;
  giftsAvailable?: number;
};

/** A navigation suggestion the mascot can show as a speech-bubble button. */
export type NavSuggestion = { label: string; href: string };

/** POST /ai/chat response body. */
export type AssistantResponse = {
  text: string;
  mood: MascotMood;
  quests: AssistantQuestCard[];
  /** Optional: suggest the user to navigate to a tab. */
  navSuggestion?: NavSuggestion;
  /** Keywords/phrases to bold-highlight in the response text. */
  highlights?: string[];
};

/** A message in the chat UI. */
export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  quests?: AssistantQuestCard[];
  navSuggestion?: NavSuggestion;
  highlights?: string[];
};
