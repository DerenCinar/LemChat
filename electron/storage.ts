import { app } from 'electron';
import fs from 'fs';
import path from 'path';

function getStatePath(profileId: string): string {
  const safeId = profileId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(app.getPath('userData'), `lemchat-state-${safeId}.json`);
}

export function loadPersistedState(profileId: string): unknown | null {
  try {
    const filePath = getStatePath(profileId);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[LemChat Storage] Failed to load state:', err);
    return null;
  }
}

export function savePersistedState(profileId: string, state: unknown): boolean {
  try {
    const filePath = getStatePath(profileId);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[LemChat Storage] Failed to save state:', err);
    return false;
  }
}

export function clearPersistedState(profileId: string): boolean {
  try {
    const filePath = getStatePath(profileId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (err) {
    console.error('[LemChat Storage] Failed to clear state:', err);
    return false;
  }
}
