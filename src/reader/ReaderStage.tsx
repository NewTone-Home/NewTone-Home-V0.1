import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReaderBlock } from '../domain/contracts'
import { ReaderBlockView } from './ReaderBlockView'

const INPUT_LOCK_MS = 460

interface ReaderStageProps {
  blocks: ReaderBlock[]
  initialBlockId?: string | null
  onPositionChange: (block: ReaderBlock, index: number, total: number) => void
  onExitTop: () => void
}

function isBeat(block: ReaderBlock) {
  return block.type !== 'scene-cue'
}

export function ReaderStage({ blocks, initialBlockId, onPositionChange, onExitTop }: ReaderStageProps) {
  const beats = useMemo(() => blocks.filter(isBeat), [blocks])
  const initialIndex = Math.max(0, beats.findIndex((block) => block.id === initialBlockId))
  const [index, setIndex] = useState(initialIndex)
  const lockUntil = useRef(0)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    const restored = beats.findIndex((block) => block.id === initialBlockId)
    setIndex(restored >= 0 ? restored : 0)
  }, [beats, initialBlockId])

  useEffect(() => {
    const current = beats[index]
    if (current) onPositionChange(current, index, beats.length)
  }, [beats, index, onPositionChange])

  const advance = (direction: 1 | -1) => {
    const now = Date.now()
    if (now < lockUntil.current) return
    lockUntil.current = now + INPUT_LOCK_MS

    setIndex((current) => {
      if (direction < 0 && current === 0) {
        onExitTop()
        return current
      }
      return Math.max(0, Math.min(beats.length - 1, current + direction))
    })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) {
        event.preventDefault()
        advance(1)
      }
      if (['ArrowUp', 'PageUp', 'Backspace'].includes(event.key)) {
        event.preventDefault()
        advance(-1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (beats.length === 0) return <div className="reader-stage reader-stage--empty">这一页暂时没有文字。</div>

  return (
    <section
      className="reader-stage"
      aria-live="polite"
      onWheel={(event) => {
        event.preventDefault()
        if (Math.abs(event.deltaY) < 8) return
        advance(event.deltaY > 0 ? 1 : -1)
      }}
      onTouchStart={(event) => { touchStartY.current = event.touches[0]?.clientY ?? null }}
      onTouchEnd={(event) => {
        const start = touchStartY.current
        const end = event.changedTouches[0]?.clientY
        touchStartY.current = null
        if (start == null || end == null || Math.abs(start - end) < 28) return
        advance(start > end ? 1 : -1)
      }}
    >
      <div className="reader-stage__paper-grain" aria-hidden="true" />
      <div className="reader-stage__beats">
        {beats.map((block, beatIndex) => {
          const distance = beatIndex - index
          if (Math.abs(distance) > 2) return null
          const state = distance === 0 ? 'current' : distance < 0 ? 'previous' : 'next'
          return (
            <div
              key={block.id}
              className={`reader-beat reader-beat--${state} reader-beat--distance-${Math.abs(distance)}`}
              aria-hidden={distance !== 0}
            >
              <ReaderBlockView block={block} />
            </div>
          )
        })}
      </div>
      <div className="reader-stage__hint" aria-hidden="true">
        <span>{index === 0 ? '向上 · 返回入口' : '向上 · 回看'}</span>
        <i />
        <span>{index === beats.length - 1 ? '向下 · 页末' : '向下 · 继续'}</span>
      </div>
    </section>
  )
}
