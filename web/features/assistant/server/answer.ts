// Last touches on the model's answer before it goes to the chat.

/** A line where the model leaked a tool call's arguments into its text, e.g. `Ім'я,Профіль]}`. */
const LEAKED_CALL = /[\]}]\s*[\]}]|\{\s*"|^\s*[[{]/;

/** Drops leaked tool-call fragments and the blank lines they leave behind. */
export function cleanAnswer(text: string): string {
  return text
    .split('\n')
    .filter((line) => !LEAKED_CALL.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
