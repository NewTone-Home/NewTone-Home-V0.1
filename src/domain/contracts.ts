export type LanguageCode = 'zh-CN' | 'en'
export type WorldLayer = 'surface' | 'inner'

export interface StorySummary {
  id: string
  title: Record<LanguageCode, string>
  version: string
  chapterCount: number
}

export interface ChapterDefinition {
  id: string
  order: number
  title: Record<LanguageCode, string>
  sources: Partial<Record<LanguageCode, string>>
}

export interface StoryManifest extends StorySummary {
  schemaVersion: number
  defaultLanguage: LanguageCode
  languages: LanguageCode[]
  chapters: ChapterDefinition[]
  world: string
  worldDefinition?: WorldDefinition
}

export interface ReaderPosition {
  storyId: string
  chapterId: string
  blockId: string
  progressRatio: number
  savedAt: string
}

export interface WorldCue {
  key: string
}

export type ReaderBlock =
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'heading'; level: 1 | 2 | 3; text: string }
  | { id: string; type: 'quote'; text: string }
  | { id: string; type: 'divider' }
  | { id: string; type: 'scene-cue'; cue: WorldCue }

export interface ReaderDocument {
  storyId: string
  chapterId: string
  language: LanguageCode
  title: string
  blocks: ReaderBlock[]
}

export interface LandmarkDefinition {
  id: string
  layer: WorldLayer
  title: Record<LanguageCode, string>
  annotation: Record<LanguageCode, string>
  polygon: Array<{ x: number; y: number }>
  anchor: { x: number; y: number }
  requiredProgressKey?: string
  contentTarget?: { type: 'chapter' | 'note'; id: string }
}

export interface ProgressStateDefinition {
  key: string
  from: { chapterId: string; blockId: string }
  surfaceVariant: string
  innerVariant: string
  unlockedLandmarks: string[]
}

export interface WorldDefinition {
  schemaVersion: number
  surfaceMap: string
  innerMap: string
  landmarks: LandmarkDefinition[]
  progressStates: ProgressStateDefinition[]
}

export interface WorldState {
  storyId: string
  progressKey: string
  surfaceVariant: string
  innerVariant: string
  unlockedLandmarkIds: string[]
  visitedLandmarkIds: string[]
}

export interface CenterViewState {
  expansion: number
  activeLayer: WorldLayer | null
  selectedLandmarkId: string | null
}

export interface ReaderPreferences {
  language: LanguageCode
  immersiveVisualsEnabled: boolean
  fontScale: number
  lineHeight: number
  backgroundIntensity: number
}

export interface SaveSnapshot {
  schemaVersion: number
  storyId: string | null
  readerPosition: ReaderPosition | null
  readerPreferences: ReaderPreferences
  worldState: WorldState | null
  centerViewState: CenterViewState
  savedAt: string
}

export interface ImportResult {
  story: StorySummary
  warnings: string[]
}

export interface ContentPort {
  listStories(): Promise<StorySummary[]>
  getStory(storyId: string): Promise<StoryManifest>
  getChapter(storyId: string, chapterId: string, language: LanguageCode): Promise<ReaderDocument>
  importPackage(file: File): Promise<ImportResult>
  removeStory(storyId: string): Promise<void>
  exportStory(storyId: string): Promise<Blob>
}

export interface SavePort {
  load(): Promise<SaveSnapshot | null>
  save(snapshot: SaveSnapshot): Promise<void>
  clear(): Promise<void>
}
