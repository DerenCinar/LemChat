import { describe, expect, it } from 'vitest';
import { DICTIONARIES } from '../src/lib/i18n';

describe('i18n dictionaries', () => {
  const baseKeys = Object.keys(DICTIONARIES.en).sort();
  for (const [lang, dict] of Object.entries(DICTIONARIES)) {
    it(`${lang} has exactly the English keys and no empty values`, () => {
      expect(Object.keys(dict).sort()).toEqual(baseKeys);
      for (const v of Object.values(dict)) expect(v.trim().length).toBeGreaterThan(0);
    });
  }
});
