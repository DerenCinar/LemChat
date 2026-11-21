import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  buildReactionsList,
  bytesToBase64,
  computeTotalUnread,
  filterProfanity,
  formatCallDuration,
} from '../src/store/helpers';
import type { Conversation } from '../src/types/chat';

describe('filterProfanity', () => {
  it('leaves text alone when off', () => {
    expect(filterProfanity('damn it', 'off')).toBe('damn it');
  });
  it('masks whole words only', () => {
    expect(filterProfanity('damn it', 'strict')).toBe('**** it');
    expect(filterProfanity('Scunthorpe classic', 'strict')).toBe('Scunthorpe classic');
  });
  it('catches plurals, compounds and leetspeak', () => {
    expect(filterProfanity('dicks and cocks', 'strict')).toBe('**** and ****');
    expect(filterProfanity('dickhead', 'strict')).toBe('****');
    expect(filterProfanity('penis', 'strict')).toBe('****');
    expect(filterProfanity('sh1t d!ck', 'strict')).toBe('**** ****');
    expect(filterProfanity('a pen is here, cockpit', 'strict')).toBe('a pen is here, cockpit');
  });
  it('mild keeps the first letter', () => {
    expect(filterProfanity('shit', 'mild')).toBe('s***');
  });
});

describe('formatCallDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatCallDuration(5)).toBe('5s');
    expect(formatCallDuration(65)).toBe('1m 5s');
    expect(formatCallDuration(3725)).toBe('1h 2m');
  });
});

describe('base64 helpers', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });
});

describe('buildReactionsList', () => {
  it('groups by emoji and flags my reactions', () => {
    const list = buildReactionsList(
      [
        { emoji: '👍', user_id: 'a' },
        { emoji: '👍', user_id: 'me' },
        { emoji: '❤️', user_id: 'a' },
      ],
      'me'
    );
    expect(list).toEqual([
      { emoji: '👍', count: 2, reactedByMe: true },
      { emoji: '❤️', count: 1, reactedByMe: false },
    ]);
  });
});

describe('computeTotalUnread', () => {
  it('sums unread counts', () => {
    const convs = [{ unreadCount: 2 }, { unreadCount: 3 }] as unknown as Conversation[];
    expect(computeTotalUnread(convs)).toBe(5);
  });
});
