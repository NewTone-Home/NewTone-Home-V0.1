import type { ReaderPosition, WorldDefinition, WorldState } from '../contracts'

export class WorldResolver {
  constructor(private readonly definition: WorldDefinition) {}

  resolve(input: ReaderPosition, visitedLandmarkIds: string[] = []): WorldState {
    let resolved = this.definition.progressStates[0]
    for (const candidate of this.definition.progressStates) {
      if (candidate.from.chapterId !== input.chapterId) continue
      if (candidate.from.blockId === input.blockId || input.progressRatio >= 0.5) {
        resolved = candidate
      }
    }

    return {
      storyId: input.storyId,
      progressKey: resolved.key,
      surfaceVariant: resolved.surfaceVariant,
      innerVariant: resolved.innerVariant,
      unlockedLandmarkIds: [...resolved.unlockedLandmarks],
      visitedLandmarkIds: [...new Set(visitedLandmarkIds)],
    }
  }
}

export const clampExpansion = (value: number) => Math.max(0, Math.min(1, value))
