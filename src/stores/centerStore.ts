import { create } from 'zustand'
import type { CenterViewState, WorldState } from '../domain/contracts'
import { DEFAULT_CENTER_VIEW } from '../adapters/save/BrowserSaveAdapter'
import { clampExpansion } from '../domain/world/worldResolver'

interface CenterState {
  worldState: WorldState | null
  viewState: CenterViewState
  hoveredLandmarkId: string | null
  projections: Record<string, { x: number; y: number }>
  setWorldState: (worldState: WorldState | null) => void
  setViewState: (value: Partial<CenterViewState>) => void
  setHovered: (landmarkId: string | null) => void
  setProjections: (projections: Record<string, { x: number; y: number }>) => void
}

export const useCenterStore = create<CenterState>((set) => ({
  worldState: null,
  viewState: DEFAULT_CENTER_VIEW,
  hoveredLandmarkId: null,
  projections: {},
  setWorldState: (worldState) => set({ worldState }),
  setViewState: (value) => set((state) => ({
    viewState: {
      ...state.viewState,
      ...value,
      expansion: value.expansion === undefined
        ? state.viewState.expansion
        : clampExpansion(value.expansion),
    },
  })),
  setHovered: (hoveredLandmarkId) => set({ hoveredLandmarkId }),
  setProjections: (projections) => set({ projections }),
}))
