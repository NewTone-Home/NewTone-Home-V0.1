import JSZip from 'jszip'
import type { LanguageCode, ReaderDocument, StoryManifest, WorldDefinition } from '../../domain/contracts'
import { manifestSchema, worldDefinitionSchema } from '../../domain/content/schema'
import { parseMarkdown } from './markdownParser'

export interface ParsedPackage {
  manifest: StoryManifest
  chapters: ReaderDocument[]
  files: Map<string, Uint8Array>
}

export class LocalPackageParser {
  async parse(file: Blob | Uint8Array | ArrayBuffer): Promise<ParsedPackage> {
    const source = file instanceof Blob ? await file.arrayBuffer() : file
    const zip = await JSZip.loadAsync(source)
    const manifestEntry = zip.file('manifest.json')
    if (!manifestEntry) throw new Error('内容包缺少 manifest.json')
    const rawManifest = manifestSchema.parse(JSON.parse(await manifestEntry.async('string')))
    const worldEntry = zip.file(rawManifest.world)
    if (!worldEntry) throw new Error(`内容包缺少 ${rawManifest.world}`)
    const worldDefinition = worldDefinitionSchema.parse(JSON.parse(await worldEntry.async('string'))) as WorldDefinition
    const manifest: StoryManifest = {
      ...rawManifest,
      chapterCount: rawManifest.chapters.length,
      worldDefinition,
    }
    const chapters: ReaderDocument[] = []
    for (const chapter of rawManifest.chapters) {
      for (const language of rawManifest.languages) {
        const path = chapter.sources[language]
        if (!path) continue
        const entry = zip.file(path)
        if (!entry) throw new Error(`内容包缺少 ${path}`)
        chapters.push(parseMarkdown({
          storyId: rawManifest.id,
          chapterId: chapter.id,
          language: language as LanguageCode,
          title: chapter.title[language],
          markdown: await entry.async('string'),
        }))
      }
    }
    const files = new Map<string, Uint8Array>()
    for (const [path, entry] of Object.entries(zip.files)) {
      if (!entry.dir) files.set(path, await entry.async('uint8array'))
    }
    return { manifest, chapters, files }
  }
}
