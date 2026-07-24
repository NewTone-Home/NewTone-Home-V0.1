import { appConfig } from './appConfig'
import { contentPort, savePort } from '../shared/services'
import { useAppStore } from '../stores/appStore'
import { useCenterStore } from '../stores/centerStore'
import { useReaderStore } from '../stores/readerStore'

async function importBundledStory(): Promise<void> {
  const response = await fetch(appConfig.defaultStoryPackageUrl)
  if (!response.ok) throw new Error('无法载入示例内容包')
  const blob = await response.blob()
  await contentPort.importPackage(new File([blob], 'ghost-market.newtone.zip', { type: 'application/zip' }))
}

export async function bootstrap(): Promise<void> {
  const app = useAppStore.getState()
  try {
    let stories = await contentPort.listStories()
    if (stories.length === 0) {
      await importBundledStory()
      stories = await contentPort.listStories()
    }
    const saved = await savePort.load()
    const storyId = saved?.storyId && stories.some((story) => story.id === saved.storyId)
      ? saved.storyId
      : stories[0]?.id ?? null
    app.setStories(stories)
    app.setCurrentStory(storyId)
    if (saved) {
      useReaderStore.getState().setPreferences(saved.readerPreferences)
      useReaderStore.getState().setPosition(saved.readerPosition)
      useCenterStore.getState().setWorldState(saved.worldState)
      useCenterStore.getState().setViewState(saved.centerViewState)
    }
  } catch (error) {
    app.setError(error instanceof Error ? error.message : '初始化失败')
  } finally {
    app.setInitializing(false)
  }
}
