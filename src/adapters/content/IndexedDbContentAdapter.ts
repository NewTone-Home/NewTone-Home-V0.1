import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import JSZip from 'jszip'
import type { ContentPort, ImportResult, LanguageCode, ReaderDocument, StoryManifest, StorySummary } from '../../domain/contracts'
import { LocalPackageParser } from './LocalPackageParser'

interface NewToneDb extends DBSchema {
  stories: { key: string; value: StoryManifest }
  chapters: { key: string; value: ReaderDocument }
  assets: { key: string; value: { storyId: string; path: string; data: Uint8Array } }
  imports: { key: string; value: { storyId: string; importedAt: string } }
}

export class IndexedDbContentAdapter implements ContentPort {
  private database: Promise<IDBPDatabase<NewToneDb>>
  private parser = new LocalPackageParser()

  constructor() {
    this.database = openDB<NewToneDb>('newtone-content-v1', 1, {
      upgrade(db) {
        db.createObjectStore('stories')
        db.createObjectStore('chapters')
        db.createObjectStore('assets')
        db.createObjectStore('imports')
      },
    })
  }

  async listStories(): Promise<StorySummary[]> {
    return (await (await this.database).getAll('stories')).map(({ id, title, version, chapterCount }) => ({
      id, title, version, chapterCount,
    }))
  }

  async getStory(storyId: string): Promise<StoryManifest> {
    const story = await (await this.database).get('stories', storyId)
    if (!story) throw new Error(`未找到作品 ${storyId}`)
    return story
  }

  async getChapter(storyId: string, chapterId: string, language: LanguageCode): Promise<ReaderDocument> {
    const chapter = await (await this.database).get('chapters', `${storyId}:${chapterId}:${language}`)
    if (!chapter) throw new Error(`未找到章节 ${chapterId} (${language})`)
    return chapter
  }

  async importPackage(file: File): Promise<ImportResult> {
    const parsed = await this.parser.parse(file)
    const db = await this.database
    const tx = db.transaction(['stories', 'chapters', 'assets', 'imports'], 'readwrite')
    await tx.objectStore('stories').put(parsed.manifest, parsed.manifest.id)
    for (const chapter of parsed.chapters) {
      await tx.objectStore('chapters').put(chapter, `${chapter.storyId}:${chapter.chapterId}:${chapter.language}`)
    }
    for (const [path, data] of parsed.files) {
      await tx.objectStore('assets').put({ storyId: parsed.manifest.id, path, data }, `${parsed.manifest.id}:${path}`)
    }
    await tx.objectStore('imports').put(
      { storyId: parsed.manifest.id, importedAt: new Date().toISOString() },
      `${parsed.manifest.id}:${Date.now()}`,
    )
    await tx.done
    return {
      story: {
        id: parsed.manifest.id,
        title: parsed.manifest.title,
        version: parsed.manifest.version,
        chapterCount: parsed.manifest.chapterCount,
      },
      warnings: [],
    }
  }

  async removeStory(storyId: string): Promise<void> {
    const db = await this.database
    const tx = db.transaction(['stories', 'chapters', 'assets'], 'readwrite')
    await tx.objectStore('stories').delete(storyId)
    for (const storeName of ['chapters', 'assets'] as const) {
      const store = tx.objectStore(storeName)
      for (const key of await store.getAllKeys()) {
        if (String(key).startsWith(`${storyId}:`)) await store.delete(key)
      }
    }
    await tx.done
  }

  async exportStory(storyId: string): Promise<Blob> {
    const db = await this.database
    const story = await this.getStory(storyId)
    const zip = new JSZip()
    const assets = await db.getAll('assets')
    for (const asset of assets.filter((item) => item.storyId === storyId)) {
      zip.file(asset.path, Uint8Array.from(asset.data))
    }
    if (!zip.file('manifest.json')) {
      const manifest: Partial<StoryManifest> = { ...story }
      delete manifest.worldDefinition
      delete manifest.chapterCount
      zip.file('manifest.json', JSON.stringify(manifest, null, 2))
    }
    return zip.generateAsync({ type: 'blob' })
  }
}
