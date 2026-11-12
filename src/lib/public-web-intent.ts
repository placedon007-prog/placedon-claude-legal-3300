/** A local composer hint, not an answer classifier or permission to send data. */
export function suggestsCurrentPublicResearch(question: string): boolean {
  const text = question.trim();
  if (text.length < 12) return false;
  if (/\bcase law\b/i.test(text)) return false;
  const time = /\b(?:current|latest|recent|today|ongoing|this week|right now)\b/i;
  const event = /\b(?:case|court|litigation|lawsuit|dispute|conflict|hearing|filing|proceedings?|judg(?:e)?ments?|news|reporting)\b/i;
  return time.test(text) && event.test(text);
}
