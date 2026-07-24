import type { SavePort, SaveSnapshot } from '../../domain/contracts'

const SAVE_KEY = 'newtone-save-v1'

export const DEFAULT_PREFERENCES = {
  language: 'zh-CN' as const,
  immersiveVisualsEnabled: true,
  fontScale: 1,
  lineHeight: 1.9,
  backgroundIntensity: 0.65,
}

export const DEFAULT_CENTER_VIEW = {
  expansion: 0,
  activeLayer: null,
  selectedLandmarkId: null,
}

export function migrateSave(raw: unknown): SaveSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Partial<SaveSnapshot>
  if (!candidate.storyId && !candidate.readerPosition) return null
  return {
    schemaVersion: 1,
    storyId: candidate.storyId ?? candidate.readerPosition?.storyId ?? null,
    readerPosition: candidate.readerPosition ?? null,
    readerPreferences: { ...DEFAULT_PREFERENCES, ...candidate.readerPreferences },
    worldState: candidate.worldState ?? null,
    centerViewState: { ...DEFAULT_CENTER_VIEW, ...candidate.centerViewState },
    savedAt: candidate.savedAt ?? new Date().toISOString(),
  }
}

export class BrowserSaveAdapter implements SavePort {
  async load(): Promise<SaveSnapshot | null> {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      return raw ? migrateSave(JSON.parse(raw)) : null
    } catch {
      return null
    }
  }

  async save(snapshot: SaveSnapshot): Promise<void> {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot))
  }

  async clear(): Promise<void> {
    localStorage.removeItem(SAVE_KEY)
  }
}
