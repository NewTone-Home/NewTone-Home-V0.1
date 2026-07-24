import type { ContentPort, ImportResult, ReaderDocument, StoryManifest, StorySummary } from '../../domain/contracts'

export class RemoteContentAdapter implements ContentPort {
  constructor(private readonly baseUrl: string) {}
  private unavailable(): never {
    throw new Error(`远程内容源尚未配置：${this.baseUrl}`)
  }
  listStories(): Promise<StorySummary[]> { return Promise.reject(this.unavailable()) }
  getStory(): Promise<StoryManifest> { return Promise.reject(this.unavailable()) }
  getChapter(): Promise<ReaderDocument> { return Promise.reject(this.unavailable()) }
  importPackage(): Promise<ImportResult> { return Promise.reject(this.unavailable()) }
  removeStory(): Promise<void> { return Promise.reject(this.unavailable()) }
  exportStory(): Promise<Blob> { return Promise.reject(this.unavailable()) }
}
