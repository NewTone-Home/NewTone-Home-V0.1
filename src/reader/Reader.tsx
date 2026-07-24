import { useCallback, useEffect, useRef } from 'react'
import type { LanguageCode, ReaderPosition, SaveSnapshot } from '../domain/contracts'
import { readerPositionSelector } from '../domain/reader/readerPosition'
import { WorldResolver } from '../domain/world/worldResolver'
import { contentPort, savePort } from '../shared/services'
import { useAppStore } from '../stores/appStore'
import { useCenterStore } from '../stores/centerStore'
import { useReaderStore } from '../stores/readerStore'
import { ReaderBlockView } from './ReaderBlockView'
import { ReaderSettings } from './ReaderSettings'

export function Reader() {
  const { currentStoryId, setRoute } = useAppStore()
  const { document, position, preferences, loading, setDocument, setPosition, setPreferences, setLoading } = useReaderStore()
  const { worldState, viewState, setWorldState } = useCenterStore()
  const scrollRoot = useRef<HTMLElement>(null)
  const restorePending = useRef(true)
  const saveTimer = useRef<number | null>(null)

  const loadChapter = useCallback(async (language: LanguageCode) => {
    if (!currentStoryId) return
    setLoading(true)
    try {
      const story = await contentPort.getStory(currentStoryId)
      const chapterId = position?.storyId === currentStoryId ? position.chapterId : story.chapters[0].id
      const next = await contentPort.getChapter(currentStoryId, chapterId, language)
      restorePending.current = true
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

  useEffect(() => {
    if (!document || !restorePending.current) return
    restorePending.current = false
    requestAnimationFrame(() => {
      const selector = position?.storyId === document.storyId ? readerPositionSelector(position) : null
      const target = selector ? scrollRoot.current?.querySelector<HTMLElement>(selector) : null
      target?.scrollIntoView({ block: 'center' })
    })
  }, [document, position])

  useEffect(() => {
    const root = scrollRoot.current
    if (!root || !document) return
    const visible = new Map<string, number>()
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.blockId
        if (!id) continue
        if (entry.isIntersecting) visible.set(id, entry.intersectionRatio)
        else visible.delete(id)
      }
      const current = [...visible].sort((a, b) => b[1] - a[1])[0]?.[0]
      if (!current) return
      const ratio = root.scrollTop / Math.max(1, root.scrollHeight - root.clientHeight)
      const nextPosition: ReaderPosition = {
        storyId: document.storyId,
        chapterId: document.chapterId,
        blockId: current,
        progressRatio: Math.max(0, Math.min(1, ratio)),
        savedAt: new Date().toISOString(),
      }
      setPosition(nextPosition)
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => void persist(nextPosition), 2000)
    }, { root, threshold: [0.2, 0.5, 0.8] })
    root.querySelectorAll('[data-block-id]').forEach((element) => observer.observe(element))
    return () => {
      observer.disconnect()
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [document, persist, setPosition])

  useEffect(() => {
    const saveNow = () => void persist()
    const onVisibility = () => { if (window.document.visibilityState === 'hidden') saveNow() }
    window.document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', saveNow)
    return () => {
      window.document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', saveNow)
    }
  }, [persist])

  const enterCenter = async () => {
    await persist()
    setRoute('center')
  }

  if (loading || !document) return <main className="loading-screen">正在取出章节…</main>

  return (
    <main
      className={`reader ${preferences.immersiveVisualsEnabled ? 'is-immersive' : 'is-stable'}`}
      style={{
        '--reader-scale': preferences.fontScale,
        '--reader-leading': preferences.lineHeight,
        '--reader-atmosphere': preferences.backgroundIntensity,
      } as React.CSSProperties}
      data-testid="reader"
    >
      <header className="reader-toolbar">
        <button className="back-button" type="button" onClick={() => setRoute('landing')}>← 书封</button>
        <span className="reader-progress">{Math.round((position?.progressRatio ?? 0) * 100)}%</span>
        <ReaderSettings onLanguageChange={(language) => void loadChapter(language)} />
      </header>
      <article ref={scrollRoot} className="reader-scroll" aria-label={document.title}>
        <div className="reader-document">
          <p className="eyebrow">Ghost Market / 001</p>
          {document.blocks.map((block) => <ReaderBlockView key={block.id} block={block} />)}
          <footer className="chapter-end">
            <span>CHAPTER END</span>
            <button type="button" onClick={() => void enterCenter()}>进入世界中枢 <span>↗</span></button>
          </footer>
        </div>
      </article>
      <button className="center-entry" type="button" onClick={() => void enterCenter()} aria-label="进入 Center">
        <span className="center-entry-mark">◎</span>
        <span>世界中枢</span>
      </button>
    </main>
  )
}
