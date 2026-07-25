// 协调 Landing ↔ Reader 的入口流(移植自 V0.0 App.jsx 的对应部分,去掉 Center)。
// 由 useReadingEntry 状态机驱动:Landing 触发 → 仪式覆盖层 → Reader 就绪握手 → 覆盖层淡出。
import { Reader } from '../reader/Reader'
import { useAppStore } from '../stores/appStore'
import { useReaderStore } from '../stores/readerStore'
import { Landing } from './Landing'
import { ReadingTransition } from './ReadingTransition'
import { READING_ENTRY_TIMINGS, useReadingEntry } from './entry/useReadingEntry'

export function EntryFlow() {
  const route = useAppStore((s) => s.route)
  const hasInitializedLanguage = useAppStore((s) => s.hasInitializedLanguage)
  const language = useReaderStore((s) => s.preferences.language)
  const immersive = useReaderStore((s) => s.preferences.immersiveVisualsEnabled)

  const entry = useReadingEntry()

  const landingLeaving =
    entry.phase === 'landing-leaving' || entry.phase === 'landing-empty-hold'

  const needsReader =
    entry.phase === 'reader-preparing' || entry.phase === 'transition-leaving'

  const showReader = route === 'reader' && (!entry.isActive || needsReader)
  const showLanding = route === 'landing' && (!entry.isActive || landingLeaving)

  const isFirstTimeLeaving = entry.phase === 'landing-leaving' && !hasInitializedLanguage
  const landingLeaveMs = isFirstTimeLeaving
    ? READING_ENTRY_TIMINGS.FIRST_LANDING_LEAVE_MS
    : READING_ENTRY_TIMINGS.RETURN_LANDING_LEAVE_MS

  return (
    <>
      {showReader && (
        <Reader onReaderReady={entry.isActive ? entry.handleReaderReady : undefined} />
      )}
      {showLanding && (
        <Landing onEnter={entry.start} leaving={landingLeaving} leavingMs={landingLeaveMs} />
      )}
      <ReadingTransition
        phase={entry.phase}
        intent={entry.intent}
        language={language}
        readingMode={immersive ? 'immersive' : 'standard'}
        onProceed={entry.proceedFromLanguage}
        onModeSelect={entry.proceedFromMode}
      />
    </>
  )
}

export default EntryFlow
