// The assistant is also the mascot. Name and moods live here so the server prompt and the UI agree.

/** Mascot name shown in the UI and used in the system prompt. */
export const ASSISTANT_NAME = 'Совка';

/** Mascot poses. The UI picks a picture per mood; the model chooses one per answer. */
export const MASCOT_MOODS = ['idle', 'wave', 'think', 'point', 'cheer', 'sad', 'sleep'] as const;

export type MascotMood = (typeof MASCOT_MOODS)[number];

export const isMascotMood = (value: unknown): value is MascotMood =>
  typeof value === 'string' && (MASCOT_MOODS as readonly string[]).includes(value);
