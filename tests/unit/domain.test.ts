import { describe, expect, it } from 'vitest'
import { migrateSave } from '../../src/adapters/save/BrowserSaveAdapter'
import { clampCameraScroll, projectWorldPoint } from '../../src/center/camera/cameraMath'
import type { ReaderPosition, WorldDefinition } from '../../src/domain/contracts'
import { readerPositionSelector } from '../../src/domain/reader/readerPosition'
import { clampExpansion, WorldResolver } from '../../src/domain/world/worldResolver'

const position: ReaderPosition = {
  storyId: 'ghost-market',
  chapterId: 'chapter-001',
  blockId: 'ch1-footsteps',
  progressRatio: 0.6,
  savedAt: '2026-01-01T00:00:00.000Z',
}

const definition: WorldDefinition = {
  schemaVersion: 1,
  surfaceMap: 'surface',
  innerMap: 'inner',
  landmarks: [],
  progressStates: [
    {
      key: 'opening',
      from: { chapterId: 'chapter-001', blockId: 'ch1-opening' },
      surfaceVariant: 'dawn',
      innerVariant: 'dormant',
      unlockedLandmarks: ['station'],
    },
    {
      key: 'awake',
      from: { chapterId: 'chapter-001', blockId: 'ch1-footsteps' },
      surfaceVariant: 'night',
      innerVariant: 'awake',
      unlockedLandmarks: ['station', 'gate'],
    },
  ],
}

describe('domain boundaries', () => {
  it('restores ReaderPosition with a stable block selector', () => {
    expect(readerPositionSelector(position)).toBe('[data-block-id="ch1-footsteps"]')
  })

  it('resolves world state from reading progress', () => {
    const resolved = new WorldResolver(definition).resolve(position, ['station'])
    expect(resolved.progressKey).toBe('awake')
    expect(resolved.unlockedLandmarkIds).toEqual(['station', 'gate'])
    expect(resolved.visitedLandmarkIds).toEqual(['station'])
  })

  it('migrates a partial save snapshot', () => {
    const migrated = migrateSave({ storyId: 'ghost-market', readerPosition: position })
    expect(migrated?.schemaVersion).toBe(1)
    expect(migrated?.readerPreferences.language).toBe('zh-CN')
    expect(migrated?.centerViewState.expansion).toBe(0)
  })

  it('clamps expansion', () => {
    expect(clampExpansion(-0.3)).toBe(0)
    expect(clampExpansion(0.4)).toBe(0.4)
    expect(clampExpansion(4)).toBe(1)
  })

  it('clamps camera boundaries without drift', () => {
    const camera = { scrollX: 0, scrollY: 0, zoom: 1, width: 800, height: 600 }
    expect(clampCameraScroll(-40, 900, camera, 1200, 720)).toEqual({ x: 0, y: 120 })
    expect(clampCameraScroll(900, -10, camera, 1200, 720)).toEqual({ x: 400, y: 0 })
  })

  it('projects world coordinates through the rendered camera', () => {
    expect(projectWorldPoint({ x: 300, y: 220 }, { scrollX: 100, scrollY: 20, zoom: 2 }))
      .toEqual({ x: 400, y: 400 })
  })
})
