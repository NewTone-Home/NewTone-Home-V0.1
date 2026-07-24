import type { WorldLayer } from '../../domain/contracts'

export type CenterAction =
  | { type: 'camera/pan'; dx: number; dy: number }
  | { type: 'camera/zoom'; anchorX: number; anchorY: number; delta: number }
  | { type: 'landmark/hover'; landmarkId: string | null }
  | { type: 'landmark/open'; landmarkId: string }
  | { type: 'world/set-expansion'; value: number }
  | { type: 'world/set-active-layer'; layer: WorldLayer | null }
  | { type: 'center/exit' }
