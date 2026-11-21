const KEY = 'skellytalk_drafts_v1';

type DraftMap = Record<string, string>;

function read(): DraftMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DraftMap) : {};
  } catch {
    return {};
  }
}

export function getDraft(conversationId: string): string {
  return read()[conversationId] ?? '';
}

export function setDraft(conversationId: string, text: string): void {
  try {
    const all = read();
    if (text.trim()) all[conversationId] = text;
    else delete all[conversationId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — drafts are a convenience only
  }
}
