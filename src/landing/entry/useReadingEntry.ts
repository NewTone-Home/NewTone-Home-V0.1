// 移植自 V0.0 src/transitions/readingEntryController.js。
// 相位与时序完全保留;差异仅在于:进入 Reader = appStore.setRoute('reader'),
// 语言/模式落到 V0.1 的 readerStore.preferences + appStore 初始化态,
// 而不是 V0.0 的单体 progressStore。
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useReaderStore } from '../../stores/readerStore'
import type { LanguageCode } from '../../domain/contracts'
import { createTimerRegistry, type TimerRegistry } from './timerRegistry'

export const READING_ENTRY_TIMINGS = {
  FIRST_LANDING_LEAVE_MS: 550,
  FIRST_ENTRY_EMPTY_HOLD_MS: 350,
  RETURN_LANDING_LEAVE_MS: 300,
  LANG_LEAVING_MS: 1000,
  MODE_LEAVING_MS: 420,
  MIN_READER_MS: 850,
  TRANSITION_FADE_MS: 400,
  LANGUAGE_INIT_TITLE_DELAY_MS: 300,
} as const

const {
  FIRST_LANDING_LEAVE_MS,
  FIRST_ENTRY_EMPTY_HOLD_MS,
  RETURN_LANDING_LEAVE_MS,
  LANG_LEAVING_MS,
  MODE_LEAVING_MS,
  MIN_READER_MS,
  TRANSITION_FADE_MS,
} = READING_ENTRY_TIMINGS

export type EntryIntent = 'start' | 'continue'
export type ReadingMode = 'immersive' | 'standard'

export type EntryPhase =
  | 'idle'
  | 'landing-leaving'
  | 'landing-empty-hold'
  | 'language-active'
  | 'language-leaving'
  | 'mode-active'
  | 'mode-leaving'
  | 'reader-preparing'
  | 'transition-leaving'

export interface ReadingEntry {
  phase: EntryPhase
  intent: EntryIntent | null
  start: (intent: EntryIntent) => void
  proceedFromLanguage: () => void
  proceedFromMode: (mode: ReadingMode) => void
  handleReaderReady: () => void
  cancel: () => void
  isActive: boolean
}

export function useReadingEntry(): ReadingEntry {
  const [phase, setPhase] = useState<EntryPhase>('idle')
  const [intent, setIntent] = useState<EntryIntent | null>(null)

  const guardRef = useRef(false)
  const readyCalledRef = useRef(false)
  const startTimeRef = useRef(0)
  const intentRef = useRef<EntryIntent | null>(null)
  const phaseRef = useRef<EntryPhase>('idle')

  const timers = useRef<TimerRegistry | null>(null)
  if (!timers.current) timers.current = createTimerRegistry()

  const syncPhase = useCallback((next: EntryPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  useEffect(() => {
    const registry = timers.current
    return () => registry?.clearAll()
  }, [])

  const enterReaderView = useCallback((entryIntent: EntryIntent) => {
    // V0.1:落入 Reader 就是把路由切到 reader;continue 时 Reader 依据保存的
    // position 自动回读,无需额外 resume 标记。
    useAppStore.getState().setRoute('reader')
    startTimeRef.current = Date.now()
    // intent 仅影响过渡文案,这里透传给状态供 ReadingTransition 使用
    intentRef.current = entryIntent
    syncPhase('reader-preparing')
  }, [syncPhase])

  const start = useCallback((entryIntent: EntryIntent) => {
    if (guardRef.current) return
    guardRef.current = true
    readyCalledRef.current = false
    intentRef.current = entryIntent
    setIntent(entryIntent)
    syncPhase('landing-leaving')

    const app = useAppStore.getState()
    const registry = timers.current!
    if (!app.hasInitializedLanguage || !app.hasInitializedReadingMode) {
      registry.add(() => {
        syncPhase('landing-empty-hold')
        registry.add(() => {
          syncPhase(app.hasInitializedLanguage ? 'mode-active' : 'language-active')
        }, FIRST_ENTRY_EMPTY_HOLD_MS)
      }, FIRST_LANDING_LEAVE_MS)
    } else {
      registry.add(() => {
        enterReaderView(entryIntent)
      }, RETURN_LANDING_LEAVE_MS)
    }
  }, [syncPhase, enterReaderView])

  const proceedFromLanguage = useCallback(() => {
    if (phaseRef.current !== 'language-active') return
    syncPhase('language-leaving')
    const registry = timers.current!
    registry.add(() => {
      useAppStore.getState().setInitializedLanguage()
      syncPhase('mode-active')
    }, LANG_LEAVING_MS)
  }, [syncPhase])

  const proceedFromMode = useCallback((mode: ReadingMode) => {
    if (phaseRef.current !== 'mode-active') return
    // V0.1:模式选择落到 preferences.immersiveVisualsEnabled + 初始化态
    useReaderStore.getState().setPreferences({ immersiveVisualsEnabled: mode === 'immersive' })
    useAppStore.getState().setInitializedReadingMode()
    syncPhase('mode-leaving')
    const registry = timers.current!
    registry.add(() => {
      enterReaderView(intentRef.current ?? 'start')
    }, MODE_LEAVING_MS)
  }, [enterReaderView, syncPhase])

  const handleReaderReady = useCallback(() => {
    if (readyCalledRef.current) return
    if (phaseRef.current !== 'reader-preparing') return
    readyCalledRef.current = true

    const elapsed = Date.now() - startTimeRef.current
    const remaining = Math.max(MIN_READER_MS - elapsed, 0)
    const registry = timers.current!

    registry.add(() => {
      syncPhase('transition-leaving')
      registry.add(() => {
        guardRef.current = false
        readyCalledRef.current = false
        intentRef.current = null
        setIntent(null)
        syncPhase('idle')
      }, TRANSITION_FADE_MS)
    }, remaining)
  }, [syncPhase])

  const cancel = useCallback(() => {
    timers.current?.clearAll()
    guardRef.current = false
    readyCalledRef.current = false
    intentRef.current = null
    setIntent(null)
    syncPhase('idle')
  }, [syncPhase])

  return {
    phase,
    intent,
    start,
    proceedFromLanguage,
    proceedFromMode,
    handleReaderReady,
    cancel,
    isActive: phase !== 'idle',
  }
}

export function getEntryIntent(hasProgress: boolean): EntryIntent {
  return hasProgress ? 'continue' : 'start'
}

// intent 供 ReadingTransition 读取过渡文案时用到的语言类型别名
export type { LanguageCode }
