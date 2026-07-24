import type { ReaderBlock, ReaderDocument, WorldCue } from '../../domain/contracts'

const explicitIdPattern = /^<!--\s*block:([a-zA-Z0-9_-]+)\s*-->$/
const cuePattern = /^<!--\s*world-cue:([a-zA-Z0-9_-]+)\s*-->$/

export function stableBlockId(chapterId: string, text: string): string {
  let hash = 2166136261
  for (const char of `${chapterId}:${text.trim().toLowerCase()}`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `${chapterId}-${(hash >>> 0).toString(36)}`
}

export function parseMarkdown(input: {
  storyId: string
  chapterId: string
  language: 'zh-CN' | 'en'
  title: string
  markdown: string
}): ReaderDocument {
  const lines = input.markdown.replace(/^---[\s\S]*?---\s*/, '').split(/\r?\n/)
  const blocks: ReaderBlock[] = []
  let pendingId: string | null = null
  let paragraph: string[] = []

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    paragraph = []
    if (!text) return
    blocks.push({
      id: pendingId ?? stableBlockId(input.chapterId, text),
      type: 'paragraph',
      text,
    })
    pendingId = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const explicit = line.match(explicitIdPattern)
    const cue = line.match(cuePattern)
    if (explicit) {
      flushParagraph()
      pendingId = explicit[1]
      continue
    }
    if (cue) {
      flushParagraph()
      const worldCue: WorldCue = { key: cue[1] }
      blocks.push({ id: `cue-${cue[1]}`, type: 'scene-cue', cue: worldCue })
      continue
    }
    if (!line) {
      flushParagraph()
      continue
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      blocks.push({
        id: pendingId ?? stableBlockId(input.chapterId, heading[2]),
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      })
      pendingId = null
      continue
    }
    if (/^([-*_])\1\1+$/.test(line)) {
      flushParagraph()
      blocks.push({ id: pendingId ?? stableBlockId(input.chapterId, 'divider'), type: 'divider' })
      pendingId = null
      continue
    }
    if (line.startsWith('> ')) {
      flushParagraph()
      const text = line.slice(2)
      blocks.push({ id: pendingId ?? stableBlockId(input.chapterId, text), type: 'quote', text })
      pendingId = null
      continue
    }
    paragraph.push(line.replace(/<[^>]+>/g, ''))
  }
  flushParagraph()

  return { ...input, blocks }
}
