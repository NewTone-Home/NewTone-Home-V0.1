import { create } from 'zustand'
import type { StorySummary } from '../domain/contracts'

export type AppRoute = 'landing' | 'import' | 'reader' | 'center'

interface AppState {
  route: AppRoute
  stories: StorySummary[]
  currentStoryId: string | null
  initializing: boolean
  error: string | null
  setRoute: (route: AppRoute) => void
  setStories: (stories: StorySummary[]) => void
  setCurrentStory: (storyId: string | null) => void
  setInitializing: (initializing: boolean) => void
  setError: (error: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  route: 'landing',
  stories: [],
  currentStoryId: null,
  initializing: true,
  error: null,
  setRoute: (route) => set({ route }),
  setStories: (stories) => set({ stories }),
  setCurrentStory: (currentStoryId) => set({ currentStoryId }),
  setInitializing: (initializing) => set({ initializing }),
  setError: (error) => set({ error }),
}))
