import { useEffect, useMemo, useState } from 'react'
import type { LandmarkDefinition, SaveSnapshot, WorldDefinition, WorldLayer } from '../domain/contracts'
import { contentPort, savePort } from '../shared/services'
import { useAppStore } from '../stores/appStore'
import { useCenterStore } from '../stores/centerStore'
import { useReaderStore } from '../stores/readerStore'
import { CenterBridge } from './runtime/CenterBridge'
import { CenterGameHost } from './runtime/CenterGameHost'

export function CenterPage() {
  const { currentStoryId, setRoute } = useAppStore()
  const { position, preferences } = useReaderStore()
  const {
    worldState, viewState, hoveredLandmarkId, projections,
    setViewState, setHovered, setProjections, setWorldState,
  } = useCenterStore()
  const bridge = useMemo(() => new CenterBridge(), [])
  const [definition, setDefinition] = useState<WorldDefinition | null>(null)
  const [error, setError] = useState('')
  const selectedId = viewState.selectedLandmarkId ?? hoveredLandmarkId
  const selected = definition?.landmarks.find((landmark) => landmark.id === selectedId) ?? null

  useEffect(() => {
    if (!currentStoryId) return
    void contentPort.getStory(currentStoryId).then((story) => {
      if (!story.worldDefinition) throw new Error('内容包缺少世界定义')
      setDefinition(story.worldDefinition)
      if (!useCenterStore.getState().worldState) {
        const first = story.worldDefinition.progressStates[0]
        setWorldState({
          storyId: currentStoryId,
          progressKey: first.key,
          surfaceVariant: first.surfaceVariant,
          innerVariant: first.innerVariant,
          unlockedLandmarkIds: first.unlockedLandmarks,
          visitedLandmarkIds: [],
        })
      }
    }).catch((reason) => setError(reason instanceof Error ? reason.message : '世界无法载入'))
  }, [currentStoryId, setWorldState])

  useEffect(() => bridge.subscribe((event) => {
    if (event.type === 'landmark/hover') setHovered(event.landmarkId)
    if (event.type === 'landmark/open') {
      setViewState({ selectedLandmarkId: event.landmarkId })
      if (worldState && !worldState.visitedLandmarkIds.includes(event.landmarkId)) {
        setWorldState({
          ...worldState,
          visitedLandmarkIds: [...worldState.visitedLandmarkIds, event.landmarkId],
        })
      }
    }
    if (event.type === 'projection/update') setProjections(event.anchors)
    if (event.type === 'runtime/error') setError(event.message)
  }), [bridge, setHovered, setProjections, setViewState, setWorldState, worldState])

  useEffect(() => {
    if (worldState) bridge.pushWorldState(worldState)
  }, [bridge, worldState])
  useEffect(() => bridge.pushViewState(viewState), [bridge, viewState])
  useEffect(() => () => bridge.dispose(), [bridge])

  const returnToReader = async () => {
    if (currentStoryId) {
      const snapshot: SaveSnapshot = {
        schemaVersion: 1,
        storyId: currentStoryId,
        readerPosition: position,
        readerPreferences: preferences,
        worldState,
        centerViewState: viewState,
        savedAt: new Date().toISOString(),
      }
      await savePort.save(snapshot)
    }
    setRoute('reader')
  }

  const chooseLayer = (layer: WorldLayer | null) => {
    setViewState({ activeLayer: viewState.activeLayer === layer ? null : layer })
  }

  if (error) return <main className="error-screen"><h1>世界中枢暂时关闭</h1><p>{error}</p><button onClick={() => setRoute('reader')}>返回 Reader</button></main>
  if (!definition || !worldState) return <main className="loading-screen">正在对齐两层世界…</main>

  return (
    <main className="center-page" data-testid="center">
      <CenterGameHost bridge={bridge} definition={definition} worldState={worldState} viewState={viewState} />
      <header className="center-header">
        <button className="back-button light" type="button" onClick={() => void returnToReader()}>← 返回正文</button>
        <div className="center-title">
          <p className="eyebrow">World state / {worldState.progressKey}</p>
          <h1>世界中枢</h1>
        </div>
      </header>
      <section className="layer-control" aria-label="世界层控制">
        <button type="button" className={viewState.activeLayer === 'surface' ? 'active' : ''} onClick={() => chooseLayer('surface')}>表世界</button>
        <input
          aria-label="表里世界展开程度"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={viewState.expansion}
          onChange={(event) => setViewState({ expansion: Number(event.target.value) })}
        />
        <button type="button" className={viewState.activeLayer === 'inner' ? 'active' : ''} onClick={() => chooseLayer('inner')}>里世界</button>
        <button className="expand-button" type="button" onClick={() => setViewState({ expansion: viewState.expansion < 0.5 ? 1 : 0 })}>
          {viewState.expansion < 0.5 ? '完全展开' : '收拢世界'}
        </button>
      </section>
      <aside className="center-hint">右键拖动画面 · 滚轮缩放 · 点击发光地标</aside>
      <div className="landmark-count" aria-label="地标数量">
        {definition.landmarks.filter((landmark) => worldState.unlockedLandmarkIds.includes(landmark.id)).length} / 5
      </div>
      {selected && (
        <LandmarkAnnotation
          landmark={selected}
          point={projections[selected.id]}
          language={preferences.language}
          pinned={viewState.selectedLandmarkId === selected.id}
          onClose={() => setViewState({ selectedLandmarkId: null })}
        />
      )}
    </main>
  )
}

function LandmarkAnnotation({
  landmark, point, language, pinned, onClose,
}: {
  landmark: LandmarkDefinition
  point?: { x: number; y: number }
  language: 'zh-CN' | 'en'
  pinned: boolean
  onClose: () => void
}) {
  if (!point) return null
  return (
    <aside
      className={`landmark-annotation ${pinned ? 'is-pinned' : ''}`}
      style={{ left: point.x, top: point.y }}
      tabIndex={0}
      data-testid={`annotation-${landmark.id}`}
    >
      <p className="eyebrow">{landmark.layer === 'surface' ? 'SURFACE' : 'INNER'} / LANDMARK</p>
      <h2>{landmark.title[language]}</h2>
      <p>{landmark.annotation[language]}</p>
      {pinned && <button type="button" onClick={onClose}>关闭详情</button>}
    </aside>
  )
}
