// Turns an assistant answer into plain and emphasized pieces for the chat bubble.

export type Segment = { text: string; strong: boolean };

const BOLD = /\*\*([\s\S]+?)\*\*/g;
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function push(segments: Segment[], text: string, strong: boolean) {
  if (!text) return;
  const last = segments.at(-1);
  if (last && last.strong === strong) last.text += text;
  else segments.push({ text, strong });
}

/**
 * The model sometimes writes Markdown `**bold**`: those parts become strong and the asterisks go away
 * (an unclosed `**`, e.g. mid-typing, is dropped too). `highlights` are emphasized as whole words,
 * so «монет» marks all of «монети» (Ukrainian endings) but not the middle of another word.
 */
export function formatSegments(text: string, highlights: string[] = []): Segment[] {
  const terms = highlights.map((t) => t.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  // split with one capture group: the odd parts are the matches
  const termRe = terms.length
    ? new RegExp(`((?<![\\p{L}\\p{N}])(?:${terms.map(escapeRegExp).join('|')})\\p{L}*)`, 'giu')
    : null;

  const segments: Segment[] = [];
  text.split(BOLD).forEach((part, i) => {
    if (i % 2 === 1) return push(segments, part, true);
    const plain = part.replaceAll('**', '');
    if (!termRe) return push(segments, plain, false);
    plain.split(termRe).forEach((piece, j) => push(segments, piece, j % 2 === 1));
  });
  return segments;
}
