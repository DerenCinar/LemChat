import { describe, expect, it } from 'vitest';
import { hashWith, newSalt, pbkdf2Hash, safeEqual } from '../src/lib/lockHash';

describe('lockHash', () => {
  it('is deterministic per secret+salt and differs across salts', async () => {
    const salt = newSalt();
    const a = await pbkdf2Hash('1234', salt, 1000);
    expect(await pbkdf2Hash('1234', salt, 1000)).toBe(a);
    expect(await pbkdf2Hash('1234', newSalt(), 1000)).not.toBe(a);
    expect(await pbkdf2Hash('4321', salt, 1000)).not.toBe(a);
  });

  it('legacy and pbkdf2 produce different digests', async () => {
    const salt = newSalt();
    expect(await hashWith('legacy-sha256', 'pin1', salt)).not.toBe(
      await pbkdf2Hash('pin1', salt, 1000)
    );
  });

  it('safeEqual compares correctly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'ab')).toBe(false);
  });
});
