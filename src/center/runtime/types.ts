import type { CenterViewState, WorldState } from '../../domain/contracts'

export type ScreenPoint = { x: number; y: number }

export type CenterRuntimeEvent =
  | { type: 'runtime/ready' }
  | { type: 'landmark/hover'; landmarkId: string | null }
  | { type: 'landmark/open'; landmarkId: string }
  | { type: 'projection/update'; anchors: Record<string, ScreenPoint> }
  | { type: 'camera/change'; camera: { scrollX: number; scrollY: number; zoom: number } }
  | { type: 'runtime/error'; message: string }

export interface CenterBridge {
  pushWorldState(snapshot: WorldState): void
  pushViewState(snapshot: CenterViewState): void
  subscribe(listener: (event: CenterRuntimeEvent) => void): () => void
  subscribeWorld(listener: (snapshot: WorldState) => void): () => void
  subscribeView(listener: (snapshot: CenterViewState) => void): () => void
  dispose(): void
}
