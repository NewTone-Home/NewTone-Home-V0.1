import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LandmarkDefinition, SaveSnapshot, WorldDefinition } from '../domain/contracts'
import { contentPort, savePort } from '../shared/services'
import { useAppStore } from '../stores/appStore'
import { useCenterStore } from '../stores/centerStore'
import { useReaderStore } from '../stores/readerStore'
import { CenterBridge } from './runtime/CenterBridge'
import { CenterGameHost } from './runtime/CenterGameHost'
import './center.css'

// 对应 V0.0 useCenterNavigation 的手感常量
const HOVER_FOCUS_MS = 760
const EDGE_RATIO = 0.13
const WHEEL_THRESHOLD = 34
// 去掉展开滑块后,给一个默认展开度让表/里两层可见地分层(本阶段=基础分层)
const DEFAULT_EXPANSION = 0.42

export function CenterPage() {
  const { currentStoryId, setRoute } = useAppStore()
  const { position, preferences } = useReaderStore()
  const {
    worldState, viewState, projections,
    setViewState, setHovered, setProjections, setWorldState,
  } = useCenterStore()
  const bridge = useMemo(() => new CenterBridge(), [])
  const [definition, setDefinition] = useState<WorldDefinition | null>(null)
  const [error, setError] = useState('')

  const [dwelledId, setDwelledId] = useState<string | null>(null) // 悬停约 760ms 后显现手写批注
  const [detailId, setDetailId] = useState<string | null>(null)   // 点击后展开的纸页详情
  const [edgeIntent, setEdgeIntent] = useState<'top' | 'bottom' | null>(null)

  const dwellTimer = useRef<number | null>(null)
  const language = preferences.language

  const annotation = definition?.landmarks.find((l) => l.id === dwelledId) ?? null
  const detail = definition?.landmarks.find((l) => l.id === detailId) ?? null

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

  // 地标交互:hover → 760ms 蓄力后出批注;click(open) → 纸页详情
  useEffect(() => bridge.subscribe((event) => {
    if (event.type === 'landmark/hover') {
      setHovered(event.landmarkId)
      if (dwellTimer.current) window.clearTimeout(dwellTimer.current)
      if (event.landmarkId) {
        const id = event.landmarkId
        dwellTimer.current = window.setTimeout(() => setDwelledId(id), HOVER_FOCUS_MS)
      } else {
        setDwelledId(null)
      }
    }
    if (event.type === 'landmark/open') {
      if (dwellTimer.current) window.clearTimeout(dwellTimer.current)
      setDwelledId(null)
      setDetailId(event.landmarkId)
      const ws = useCenterStore.getState().worldState
      if (ws && !ws.visitedLandmarkIds.includes(event.landmarkId)) {
        setWorldState({ ...ws, visitedLandmarkIds: [...ws.visitedLandmarkIds, event.landmarkId] })
      }
    }
    if (event.type === 'projection/update') setProjections(event.anchors)
    if (event.type === 'runtime/error') setError(event.message)
  }), [bridge, setHovered, setProjections, setWorldState])

  useEffect(() => {
    if (worldState) bridge.pushWorldState(worldState)
  }, [bridge, worldState])
  useEffect(() => bridge.pushViewState(viewState), [bridge, viewState])
  useEffect(() => () => bridge.dispose(), [bridge])
  useEffect(() => () => { if (dwellTimer.current) window.clearTimeout(dwellTimer.current) }, [])

  // 表/里基础分层:去掉滑块后给默认展开度(仅当尚未展开时)
  useEffect(() => {
    if (definition && viewState.expansion === 0) setViewState({ expansion: DEFAULT_EXPANSION })
  }, [definition, viewState.expansion, setViewState])

  const persist = useCallback(async () => {
    if (!currentStoryId) return
    const snapshot: SaveSnapshot = {
      schemaVersion: 1,
      storyId: currentStoryId,
      readerPosition: position,
      readerPreferences: preferences,
      worldState: useCenterStore.getState().worldState,
      centerViewState: useCenterStore.getState().viewState,
      savedAt: new Date().toISOString(),
    }
    await savePort.save(snapshot)
  }, [currentStoryId, position, preferences])

  // 边缘导航:顶部通往 Landing,底部回到 Reader(往返均先存档,入口态/阅读态天然保留)
  const exitTop = useCallback(async () => { await persist(); setRoute('landing') }, [persist, setRoute])
  const exitBottom = useCallback(async () => { await persist(); setRoute('reader') }, [persist, setRoute])

  const closeDetail = useCallback(() => setDetailId(null), [])

  if (error) {
    return (
      <main className="error-screen">
        <h1>世界中枢暂时关闭</h1>
        <p>{error}</p>
        <button onClick={() => setRoute('reader')}>返回正文</button>
      </main>
    )
  }
  if (!definition || !worldState) return <main className="loading-screen">正在对齐两层世界…</main>

  return (
    <main className="center-page center-hub" data-testid="center">
      <CenterGameHost bridge={bridge} definition={definition} worldState={worldState} viewState={viewState} />

      {/* 手写批注:悬停约 760ms 后从投影锚点浮现,地图保留在背景 */}
      {annotation && !detail && (
        <LandmarkAnnotation landmark={annotation} point={projections[annotation.id]} language={language} />
      )}

      {/* 纸页式详情:点击地标后从世界中展开,地图继续在背景 */}
      {detail && (
        <LandmarkPaperDetail
          landmark={detail}
          language={language}
          onClose={closeDetail}
        />
      )}

      {/* 边缘导航条:顶→Landing,底→Reader。用透明浮层接管滚轮,中部滚轮仍归 Phaser 缩放 */}
      {!detail && (
        <EdgeGuides
          edgeIntent={edgeIntent}
          setEdgeIntent={setEdgeIntent}
          onExitTop={() => void exitTop()}
          onExitBottom={() => void exitBottom()}
        />
      )}
    </main>
  )
}

function LandmarkAnnotation({
  landmark, point, language,
}: {
  landmark: LandmarkDefinition
  point?: { x: number; y: number }
  language: 'zh-CN' | 'en'
}) {
  if (!point) return null
  return (
    <aside
      className="center-annotation"
      style={{ left: point.x, top: point.y }}
      data-testid={`annotation-${landmark.id}`}
      aria-hidden="true"
    >
      <span className="center-annotation-mark" />
      <span className="center-annotation-body">
        <span className="center-annotation-title">{landmark.title[language]}</span>
        <span className="center-annotation-note">{landmark.annotation[language]}</span>
        <span className="center-annotation-hint">{language === 'zh-CN' ? '点击展开' : 'click to open'}</span>
      </span>
    </aside>
  )
}

function LandmarkPaperDetail({
  landmark, language, onClose,
}: {
  landmark: LandmarkDefinition
  language: 'zh-CN' | 'en'
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside className="center-detail" data-testid={`detail-${landmark.id}`}>
      <div className="center-detail-sheet">
        <p className="center-detail-eyebrow">{landmark.layer === 'surface' ? '表 · 表世界' : '里 · 里世界'}</p>
        <h2 className="center-detail-title">{landmark.title[language]}</h2>
        <p className="center-detail-note">{landmark.annotation[language]}</p>
        <div className="center-detail-foot">
          <span className="center-detail-target">
            {landmark.contentTarget?.type === 'chapter'
              ? (language === 'zh-CN' ? '关联章节' : 'linked chapter')
              : (language === 'zh-CN' ? '世界批注' : 'world note')}
          </span>
          <button type="button" className="center-detail-close" onClick={onClose}>
            {language === 'zh-CN' ? '收起纸页' : 'fold away'}
          </button>
        </div>
      </div>
    </aside>
  )
}

function EdgeGuides({
  edgeIntent, setEdgeIntent, onExitTop, onExitBottom,
}: {
  edgeIntent: 'top' | 'bottom' | null
  setEdgeIntent: (v: 'top' | 'bottom' | null) => void
  onExitTop: () => void
  onExitBottom: () => void
}) {
  const topAccum = useRef(0)
  const bottomAccum = useRef(0)

  const makeWheel = (edge: 'top' | 'bottom') => (e: React.WheelEvent) => {
    const accum = edge === 'top' ? topAccum : bottomAccum
    accum.current += e.deltaY
    if (Math.abs(accum.current) < WHEEL_THRESHOLD) return
    const dir = Math.sign(accum.current)
    accum.current = 0
    if (edge === 'top' && dir < 0) onExitTop()
    if (edge === 'bottom' && dir > 0) onExitBottom()
  }

  return (
    <>
      <div
        className={`center-edge center-edge--top${edgeIntent === 'top' ? ' is-active' : ''}`}
        style={{ height: `${EDGE_RATIO * 100}%` }}
        onPointerEnter={() => setEdgeIntent('top')}
        onPointerLeave={() => setEdgeIntent(null)}
        onWheel={makeWheel('top')}
      >
        <span className="center-edge-arrow">↑</span>
        <span className="center-edge-label">向上滚动 · 回到入口</span>
      </div>
      <div
        className={`center-edge center-edge--bottom${edgeIntent === 'bottom' ? ' is-active' : ''}`}
        style={{ height: `${EDGE_RATIO * 100}%` }}
        onPointerEnter={() => setEdgeIntent('bottom')}
        onPointerLeave={() => setEdgeIntent(null)}
        onWheel={makeWheel('bottom')}
      >
        <span className="center-edge-label">向下滚动 · 继续读取</span>
        <span className="center-edge-arrow">↓</span>
      </div>
    </>
  )
}
