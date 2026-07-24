import { create } from 'zustand'
import type { StorySummary } from '../domain/contracts'

export type AppRoute = 'landing' | 'import' | 'reader' | 'center'

interface AppState {
  route: AppRoute
  stories: StorySummary[]
  currentStoryId: string | null
  initializing: boolean
  error: string | null
  // 入口仪式的一次性初始化态(对应 V0.0 progressStore 的同名字段)。
  // 决定进入时走完整的「语言 → 模式」仪式,还是直接落入 Reader。
  hasInitializedLanguage: boolean
  hasInitializedReadingMode: boolean
  setRoute: (route: AppRoute) => void
  setStories: (stories: StorySummary[]) => void
  setCurrentStory: (storyId: string | null) => void
  setInitializing: (initializing: boolean) => void
  setError: (error: string | null) => void
  setInitializedLanguage: () => void
  setInitializedReadingMode: () => void
}

export const useAppStore = create<AppState>((set) => ({
  route: 'landing',
  stories: [],
  currentStoryId: null,
  initializing: true,
  error: null,
  hasInitializedLanguage: false,
  hasInitializedReadingMode: false,
  setRoute: (route) => set({ route }),
  setStories: (stories) => set({ stories }),
  setCurrentStory: (currentStoryId) => set({ currentStoryId }),
  setInitializing: (initializing) => set({ initializing }),
  setError: (error) => set({ error }),
  setInitializedLanguage: () => set({ hasInitializedLanguage: true }),
  setInitializedReadingMode: () => set({ hasInitializedReadingMode: true }),
}))
