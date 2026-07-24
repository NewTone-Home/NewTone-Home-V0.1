// 移植自 V0.0 src/components/ScrambleText.jsx
import { useEffect, useRef, useState } from 'react'

const CHARS = '░▒/\\-_01'

interface ScrambleTextProps {
  text: string
  active: boolean
  duration?: number
  onRevealed?: () => void
}

export function ScrambleText({ text, active, duration = 800, onRevealed }: ScrambleTextProps) {
  const [display, setDisplay] = useState('')
  const timerRef = useRef<number | null>(null)
  const revealedRef = useRef(false)

  useEffect(() => {
    if (!active) {
      setDisplay('')
      revealedRef.current = false
      return
    }

    if (revealedRef.current) {
      setDisplay(text)
      return
    }

    const step = 40
    const totalFrames = Math.floor(duration / step)
    let frame = 0

    timerRef.current = window.setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const revealCount = Math.min(Math.floor(progress * text.length), text.length)

      let result = ''
      for (let i = 0; i < text.length; i++) {
        result += i < revealCount ? text[i] : CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      setDisplay(result)

      if (frame >= totalFrames) {
        if (timerRef.current) window.clearInterval(timerRef.current)
        setDisplay(text)
        revealedRef.current = true
        onRevealed?.()
      }
    }, step)

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [text, active, duration, onRevealed])

  return <span>{display}</span>
}

export default ScrambleText
