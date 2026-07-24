import type { CenterViewState, WorldState } from '../../domain/contracts'
import type { CenterBridge as CenterBridgeContract, CenterRuntimeEvent } from './types'

export class CenterBridge implements CenterBridgeContract {
  private eventListeners = new Set<(event: CenterRuntimeEvent) => void>()
  private worldListeners = new Set<(snapshot: WorldState) => void>()
  private viewListeners = new Set<(snapshot: CenterViewState) => void>()

  emit(event: CenterRuntimeEvent): void {
    this.eventListeners.forEach((listener) => listener(event))
  }
  pushWorldState(snapshot: WorldState): void {
    this.worldListeners.forEach((listener) => listener(snapshot))
  }
  pushViewState(snapshot: CenterViewState): void {
    this.viewListeners.forEach((listener) => listener(snapshot))
  }
  subscribe(listener: (event: CenterRuntimeEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }
  subscribeWorld(listener: (snapshot: WorldState) => void): () => void {
    this.worldListeners.add(listener)
    return () => this.worldListeners.delete(listener)
  }
  subscribeView(listener: (snapshot: CenterViewState) => void): () => void {
    this.viewListeners.add(listener)
    return () => this.viewListeners.delete(listener)
  }
  dispose(): void {
    this.eventListeners.clear()
    this.worldListeners.clear()
    this.viewListeners.clear()
  }
}
