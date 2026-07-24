import { create } from 'zustand'
import type { ReaderDocument, ReaderPosition, ReaderPreferences } from '../domain/contracts'
import { DEFAULT_PREFERENCES } from '../adapters/save/BrowserSaveAdapter'

interface ReaderState {
  document: ReaderDocument | null
  position: ReaderPosition | null
  preferences: ReaderPreferences
  loading: boolean
  setDocument: (document: ReaderDocument | null) => void
  setPosition: (position: ReaderPosition | null) => void
  setPreferences: (preferences: Partial<ReaderPreferences>) => void
  setLoading: (loading: boolean) => void
}

export const useReaderStore = create<ReaderState>((set) => ({
  document: null,
  position: null,
  preferences: DEFAULT_PREFERENCES,
  loading: false,
  setDocument: (document) => set({ document }),
  setPosition: (position) => set({ position }),
  setPreferences: (preferences) => set((state) => ({
    preferences: { ...state.preferences, ...preferences },
  })),
  setLoading: (loading) => set({ loading }),
}))
