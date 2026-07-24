// 移植自 V0.0 src/views/Landing.jsx —— 休眠 → 唤醒(标题呼吸 + 粒子 + 手绘补全)→ 向下滚动进入。
// 适配 V0.1:去掉 Center 相关(向上进入 / centerUnlocked)分支(本切片不碰 Center);
// language 来自 readerStore.preferences,进度判断来自 readerStore.position。
import { useEffect, useRef, useState } from 'react'
import { savePort } from '../shared/services'
import { useAppStore } from '../stores/appStore'
import { useReaderStore } from '../stores/readerStore'
import { entryCopy, getNextEntryLanguage } from './entry/copy'
import type { EntryIntent } from './entry/useReadingEntry'
import { ScrambleText } from './ScrambleText'
import { LandingSketchLayer } from './LandingSketchLayer'
import './entry.tokens.css'
import './sketchPrimitives.css'
import './landing.css'

interface Particle {
  id: number
  char: string
  x: number
  delay: number
  duration: number
  fall: number
}

function TitleSignal({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!active) {
      setParticles([])
      return
    }
    const chars = '·./\\|~'
    const items: Particle[] = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      char: chars[Math.floor(Math.random() * chars.length)],
      x: (Math.random() - 0.5) * 100,
      delay: 100 + Math.random() * 350,
      duration: 1000 + Math.random() * 600,
      fall: 15 + Math.random() * 35,
    }))
    setParticles(items)
  }, [active])

  return (
    <div className="title-signal">
      {active && particles.map((p) => (
        <span
          key={p.id}
          className="title-signal-particle"
          style={{
            '--x': `${p.x}px`,
            '--fall': `${p.fall}px`,
            '--delay': `${p.delay}ms`,
            '--duration': `${p.duration}ms`,
          } as React.CSSProperties}
        >
          {p.char}
        </span>
      ))}
    </div>
  )
}

interface LandingProps {
  onEnter: (intent: EntryIntent) => void
  leaving?: boolean
  leavingMs?: number
}

export function Landing({ onEnter, leaving = false, leavingMs = 300 }: LandingProps) {
  const language = useReaderStore((s) => s.preferences.language)
  const setPreferences = useReaderStore((s) => s.setPreferences)

  const [isLandingAwake, setIsLandingAwake] = useState(false)
  const [scrollTriggered, setScrollTriggered] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const triggeredRef = useRef(false)

  const activateTitle = () => {
    if (!isLandingAwake) setIsLandingAwake(true)
    setClickCount((c) => c + 1)
  }

  useEffect(() => {
    triggeredRef.current = false

    const detectReader = () => {
      if (triggeredRef.current) return
      triggeredRef.current = true
      const reader = useReaderStore.getState()
      const app = useAppStore.getState()
      const hasProgress = !!reader.position && reader.position.storyId === app.currentStoryId
      onEnter(hasProgress ? 'continue' : 'start')
    }

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 8) {
        if (!triggeredRef.current) setScrollTriggered(true)
        detectReader()
      }
    }

    let touchStartY = 0
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      const delta = touchStartY - e.touches[0].clientY
      if (delta > 20) {
        if (!triggeredRef.current) setScrollTriggered(true)
        detectReader()
      }
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [onEnter])

  const reader = useReaderStore((s) => s.position)
  const currentStoryId = useAppStore((s) => s.currentStoryId)
  const hasProgress = !!reader && reader.storyId === currentStoryId
  const promptText = hasProgress
    ? entryCopy[language].landingPromptResume
    : entryCopy[language].landingPromptInitial

  const toggleLanguage = () => {
    setPreferences({ language: getNextEntryLanguage(language).code })
  }

  const handleReset = () => {
    void savePort.clear()
    useReaderStore.getState().setPosition(null)
    useAppStore.setState({ hasInitializedLanguage: false, hasInitializedReadingMode: false })
    setIsLandingAwake(false)
    setScrollTriggered(false)
    triggeredRef.current = false
  }

  return (
    <div
      className={`landing paper-surface${leaving ? ' landing--leaving' : ''}`}
      style={{ '--landing-leave-ms': `${leavingMs}ms` } as React.CSSProperties}
      data-testid="landing"
    >
      <LandingSketchLayer
        titleActivated={isLandingAwake}
        archwayPhase={scrollTriggered ? 2 : isLandingAwake ? 1 : 0}
        retraceKey={clickCount}
      />

      <button className="landing-lang-toggle" onClick={toggleLanguage}>
        {language === 'zh-CN' ? 'EN' : '中'}
      </button>

      <div className="landing-main">
        <div className={['landing-title-stack', isLandingAwake ? 'landing-direction-prompts--revealed' : ''].filter(Boolean).join(' ')}>
          <h1
            className={['landing-title', isLandingAwake ? 'landing-title--activated' : ''].filter(Boolean).join(' ')}
            onMouseEnter={activateTitle}
            onClick={activateTitle}
          >
            <span className="landing-title-text">NewTone</span>
          </h1>

          {isLandingAwake && (
            <div className="down-entry-group">
              <p className="landing-prompt landing-prompt--down">
                <ScrambleText text={promptText} active duration={800} />
              </p>
              <svg className="entry-arrow entry-arrow--down" viewBox="-60 0 120 80" width="32" height="22" aria-hidden="true">
                <g className={isLandingAwake ? 'sketch-down-breathe' : ''}>
                  <path className="sketch-down-shaft" d="M 0,5 L 0,65" />
                  <path className="sketch-down-shaft-faint" d="M -2,8 L -2,62" />
                  <path className="sketch-down-head" d="M 0,65 L -10,50" />
                  <path className="sketch-down-head" d="M 0,65 L 10,50" />
                </g>
              </svg>
            </div>
          )}
        </div>

        {isLandingAwake && <TitleSignal active={isLandingAwake} />}
      </div>

      <button className="landing-reset" onClick={handleReset}>
        {entryCopy[language].reset}
      </button>
    </div>
  )
}

export default Landing
