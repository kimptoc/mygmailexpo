export type LinkSegment = { type: 'text' | 'url'; value: string };

export const URL_PATTERN_SOURCE = "https?:\\/\\/[^\\s<>\"')\\]]+";

const TRAILING_PUNCT = /[.,;:!?]+$/;

export function splitTextOnUrls(text: string): LinkSegment[] {
  if (text.length === 0) return [];

  const re = new RegExp(URL_PATTERN_SOURCE, 'g');
  const segments: LinkSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const matched = match[0];
    const trail = matched.match(TRAILING_PUNCT);
    const url = trail ? matched.slice(0, -trail[0].length) : matched;

    if (match.index > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, match.index) });
    }
    segments.push({ type: 'url', value: url });
    cursor = match.index + url.length;
  }

  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) });
  }

  return segments;
}
