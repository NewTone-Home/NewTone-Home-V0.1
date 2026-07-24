import { useCallback, useEffect, useRef } from 'react'
import type { LanguageCode, ReaderBlock, ReaderPosition, SaveSnapshot } from '../domain/contracts'
import { WorldResolver } from '../domain/world/worldResolver'
import { contentPort, savePort } from '../shared/services'
import { useAppStore } from '../stores/appStore'
import { useCenterStore } from '../stores/centerStore'
import { useReaderStore } from '../stores/readerStore'
import { ReaderReturnControl } from './ReaderReturnControl'
import { ReaderStage } from './ReaderStage'
import './readerStage.css'

interface ReaderProps {
  onReaderReady?: () => void
}

export function Reader({ onReaderReady }: ReaderProps = {}) {
  const { currentStoryId, setRoute } = useAppStore()
  const { document, position, preferences, loading, setDocument, setPosition, setPreferences, setLoading } = useReaderStore()
  const { worldState, viewState, setWorldState } = useCenterStore()
  const saveTimer = useRef<number | null>(null)
  const readyFiredRef = useRef(false)

  const loadChapter = useCallback(async (language: LanguageCode) => {
    if (!currentStoryId) return
    setLoading(true)
    try {
      const story = await contentPort.getStory(currentStoryId)
      const chapterId = position?.storyId === currentStoryId ? position.chapterId : story.chapters[0].id
      const next = await contentPort.getChapter(currentStoryId, chapterId, language)
      setDocument(next)
      setPreferences({ language })
    } finally {
      setLoading(false)
    }
  }, [currentStoryId, position?.chapterId, position?.storyId, setDocument, setLoading, setPreferences])

  useEffect(() => { void loadChapter(preferences.language) }, [loadChapter, preferences.language])

  const persist = useCallback(async (nextPosition: ReaderPosition | null = position) => {
    if (!currentStoryId) return
    const story = await contentPort.getStory(currentStoryId)
    const resolvedWorld = nextPosition && story.worldDefinition
      ? new WorldResolver(story.worldDefinition).resolve(nextPosition, worldState?.visitedLandmarkIds)
      : worldState
    if (resolvedWorld) setWorldState(resolvedWorld)
    const snapshot: SaveSnapshot = {
      schemaVersion: 1,
      storyId: currentStoryId,
      readerPosition: nextPosition,
      readerPreferences: preferences,
      worldState: resolvedWorld,
      centerViewState: viewState,
      savedAt: new Date().toISOString(),
    }
    await savePort.save(snapshot)
  }, [currentStoryId, position, preferences, setWorldState, viewState, worldState])

  const handlePositionChange = useCallback((block: ReaderBlock, index: number, total: number) => {
    if (!document) return
    const nextPosition: ReaderPosition = {
      storyId: document.storyId,
      chapterId: document.chapterId,
      blockId: block.id,
      progressRatio: total <= 1 ? 1 : index / (total - 1),
      savedAt: new Date().toISOString(),
    }
    setPosition(nextPosition)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void persist(nextPosition), 650)
  }, [document, persist, setPosition])

  useEffect(() => {
    const saveNow = () => void persist()
    const onVisibility = () => { if (window.document.visibilityState === 'hidden') saveNow() }
    window.document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', saveNow)
    return () => {
      window.document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', saveNow)
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [persist])

  useEffect(() => {
    if (!document || loading || readyFiredRef.current) return
    readyFiredRef.current = true
    const raf = requestAnimationFrame(() => onReaderReady?.())
    return () => cancelAnimationFrame(raf)
  }, [document, loading, onReaderReady])

  const enterCenter = async () => {
    await persist()
    setRoute('center')
  }

  const returnToLanding = async () => {
    await persist()
    setRoute('landing')
  }

  if (loading || !document) return <main className="loading-screen">正在取出章节…</main>

  const restoredBlockId = position?.storyId === document.storyId && position.chapterId === document.chapterId
    ? position.blockId
    : null

  return (
    <main
      className={`reader reader--stage ${preferences.immersiveVisualsEnabled ? 'is-immersive' : 'is-stable'}`}
      style={{
        '--reader-scale': preferences.fontScale,
        '--reader-leading': preferences.lineHeight,
        '--reader-atmosphere': preferences.backgroundIntensity,
      } as React.CSSProperties}
      data-testid="reader"
    >
      <ReaderStage
        blocks={document.blocks}
        initialBlockId={restoredBlockId}
        onPositionChange={handlePositionChange}
        onExitTop={() => void returnToLanding()}
      />
      <ReaderReturnControl onComplete={() => void enterCenter()} />
    </main>
  )
}
