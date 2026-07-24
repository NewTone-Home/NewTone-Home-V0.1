import JSZip from 'jszip'
import { deleteDB } from 'idb'
import { describe, expect, it } from 'vitest'
import { IndexedDbContentAdapter } from '../../src/adapters/content/IndexedDbContentAdapter'
import { parseMarkdown, stableBlockId } from '../../src/adapters/content/markdownParser'
import { manifestSchema } from '../../src/domain/content/schema'

const manifest = {
  schemaVersion: 1,
  id: 'test-story',
  version: '1.0.0',
  defaultLanguage: 'zh-CN',
  languages: ['zh-CN', 'en'],
  title: { 'zh-CN': '测试', en: 'Test' },
  chapters: [{
    id: 'chapter-001',
    order: 1,
    title: { 'zh-CN': '第一章', en: 'Chapter One' },
    sources: {
      'zh-CN': 'chapters/chapter-001.zh-CN.md',
      en: 'chapters/chapter-001.en.md',
    },
  }],
  world: 'world/world.json',
} as const

const world = {
  schemaVersion: 1,
  surfaceMap: 'map.surface.default',
  innerMap: 'map.inner.default',
  landmarks: [],
  progressStates: [{
    key: 'opening',
    from: { chapterId: 'chapter-001', blockId: 'opening' },
    surfaceVariant: 'dawn',
    innerVariant: 'dormant',
    unlockedLandmarks: [],
  }],
}

async function createPackage() {
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest))
  zip.file('world/world.json', JSON.stringify(world))
  zip.file('chapters/chapter-001.zh-CN.md', '<!-- block:opening -->\n\n山谷醒来。')
  zip.file('chapters/chapter-001.en.md', '<!-- block:opening -->\n\nThe valley wakes.')
  return zip.generateAsync({ type: 'uint8array' })
}

describe('content package', () => {
  it('validates a manifest and rejects invalid ids', () => {
    expect(manifestSchema.parse(manifest).id).toBe('test-story')
    expect(() => manifestSchema.parse({ ...manifest, id: 'Bad ID' })).toThrow()
  })

  it('parses Markdown blocks and removes unsafe HTML', () => {
    const result = parseMarkdown({
      storyId: 'test-story',
      chapterId: 'chapter-001',
      language: 'zh-CN',
      title: '第一章',
      markdown: '<!-- block:opening -->\n\n山谷 <script>alert(1)</script> 醒来。\n\n<!-- world-cue:dawn -->',
    })
    expect(result.blocks[0]).toMatchObject({ id: 'opening', type: 'paragraph' })
    expect('text' in result.blocks[0] && result.blocks[0].text).not.toContain('<script>')
    expect(result.blocks[1]).toMatchObject({ type: 'scene-cue', cue: { key: 'dawn' } })
  })

  it('generates stable block ids from chapter and content', () => {
    expect(stableBlockId('chapter-001', 'Same words')).toBe(stableBlockId('chapter-001', 'Same words'))
    expect(stableBlockId('chapter-001', 'Same words')).not.toBe(stableBlockId('chapter-002', 'Same words'))
  })

  it('imports, reads, exports, and removes content through ContentPort', async () => {
    await deleteDB('newtone-content-v1')
    const adapter = new IndexedDbContentAdapter()
    const bytes = await createPackage()
    const result = await adapter.importPackage(bytes as unknown as File)
    expect(result.story.id).toBe('test-story')
    expect(await adapter.listStories()).toHaveLength(1)
    expect((await adapter.getChapter('test-story', 'chapter-001', 'en')).blocks[0]).toMatchObject({ id: 'opening' })
    expect((await adapter.exportStory('test-story')).size).toBeGreaterThan(100)
    await adapter.removeStory('test-story')
    expect(await adapter.listStories()).toHaveLength(0)
  })
})
