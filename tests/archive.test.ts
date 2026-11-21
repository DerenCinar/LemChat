import { describe, expect, it } from 'vitest';
import { toggleId } from '../src/lib/archive';

describe('toggleId', () => {
  it('adds a missing id and removes a present one without mutating', () => {
    const base = ['a'];
    expect(toggleId(base, 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
    expect(base).toEqual(['a']);
  });
});
