/** Local caches for messages the sender can't re-decrypt, and deletion tombstones. */
import type { Attachment, CodeBlock, InteractiveMetadata } from '../types/chat';

function warnStorage(action: string, err: unknown): void {
  console.warn(`[SkellyTalk] Local storage ${action} failed:`, err);
}

export interface DecryptedMessagePayload {
  content: string;
  codeBlock?: CodeBlock;
  attachments?: Attachment[];
  interactive?: InteractiveMetadata;
  editedAt?: string;
  isEdited?: boolean;
}

export const DELETED_MESSAGE_MARKER = '[skellytalk:deleted]';
export const EDITED_MESSAGE_MARKER = '[skellytalk:edited]';

export function getSentCacheKey(userId: string): string {
  return `skellytalk_sent_cache_${userId}`;
}

export function readSentCache(userId: string): Record<string, DecryptedMessagePayload> {
  try {
    const raw = localStorage.getItem(getSentCacheKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, DecryptedMessagePayload>) : {};
  } catch {
    return {};
  }
}

export function saveSentCacheEntry(
  userId: string,
  messageId: string,
  payload: DecryptedMessagePayload
): void {
  try {
    const cache = readSentCache(userId);
    cache[messageId] = payload;
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      for (const k of keys.slice(0, keys.length - 500)) {
        delete cache[k];
      }
    }
    localStorage.setItem(getSentCacheKey(userId), JSON.stringify(cache));
  } catch (err) {
    warnStorage('write', err);
  }
}

export function getDeletedCacheKey(userId: string): string {
  return `skellytalk_deleted_cache_${userId}`;
}

export function readDeletedCache(
  userId: string
): Record<string, { conversationId: string; deletedAt: string; createdAt: string }> {
  try {
    const raw = localStorage.getItem(getDeletedCacheKey(userId));
    return raw
      ? (JSON.parse(raw) as Record<string, { conversationId: string; deletedAt: string; createdAt: string }>)
      : {};
  } catch {
    return {};
  }
}

export function saveDeletedCacheEntry(
  userId: string,
  messageId: string,
  conversationId: string,
  deletedAt: string,
  createdAt: string
): void {
  try {
    const cache = readDeletedCache(userId);
    cache[messageId] = { conversationId, deletedAt, createdAt };
    localStorage.setItem(getDeletedCacheKey(userId), JSON.stringify(cache));
  } catch (err) {
    warnStorage('write', err);
  }
}

export function removeSentCacheEntry(userId: string, messageId: string): void {
  try {
    const cache = readSentCache(userId);
    delete cache[messageId];
    localStorage.setItem(getSentCacheKey(userId), JSON.stringify(cache));
  } catch (err) {
    warnStorage('write', err);
  }
}

