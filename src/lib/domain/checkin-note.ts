export type ParsedCheckinNote = { text: string; isBlocker: boolean };

export function parseCheckinNote(value: string | null | undefined): ParsedCheckinNote {
  const text = value?.trim() ?? "";
  const blockerPrefix = /^blocker:\s*/i;
  if (blockerPrefix.test(text)) return { text: text.replace(blockerPrefix, "").trim(), isBlocker: true };
  return { text, isBlocker: /^blocked\b/i.test(text) };
}

export function serializeCheckinNote(value: string, isBlocker: boolean): string {
  const text = value.trim();
  if (!text) return "";
  return isBlocker ? `Blocker: ${text}` : text;
}
