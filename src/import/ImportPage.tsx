import { useState } from 'react'
import { LocalPackageParser, type ParsedPackage } from '../adapters/content/LocalPackageParser'
import { contentPort } from '../shared/services'
import { useAppStore } from '../stores/appStore'
import { useReaderStore } from '../stores/readerStore'

export function ImportPage() {
  const { stories, setStories, setCurrentStory, setRoute } = useAppStore()
  const language = useReaderStore((state) => state.preferences.language)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsedPackage | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const inspect = async (nextFile: File | null) => {
    setFile(nextFile)
    setPreview(null)
    setMessage('')
    if (!nextFile) return
    try {
      setBusy(true)
      setPreview(await new LocalPackageParser().parse(nextFile))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '内容包无法读取')
    } finally {
      setBusy(false)
    }
  }

  const confirmImport = async () => {
    if (!file || !preview) return
    try {
      setBusy(true)
      const result = await contentPort.importPackage(file)
      const updated = await contentPort.listStories()
      setStories(updated)
      setCurrentStory(result.story.id)
      setMessage('内容包已写入本地书架。')
      setPreview(null)
      setFile(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (storyId: string) => {
    await contentPort.removeStory(storyId)
    const updated = await contentPort.listStories()
    setStories(updated)
    setCurrentStory(updated[0]?.id ?? null)
  }

  const exportStory = async (storyId: string) => {
    const blob = await contentPort.exportStory(storyId)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${storyId}.newtone.zip`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="import-page">
      <header className="page-header">
        <button className="back-button" type="button" onClick={() => setRoute('landing')}>← 返回</button>
        <div><p className="eyebrow">Local library</p><h1>内容书架</h1></div>
      </header>
      <section className="import-grid">
        <div className="import-drop">
          <span className="import-mark" aria-hidden="true">＋</span>
          <h2>导入本地内容包</h2>
          <p>支持 `.newtone` 与 `.zip`，内容在确认前会先完成结构校验。</p>
          <label className="file-button">
            选择文件
            <input
              type="file"
              accept=".newtone,.zip,application/zip"
              onChange={(event) => void inspect(event.target.files?.[0] ?? null)}
            />
          </label>
          {busy && <p role="status">正在检查…</p>}
          {message && <p role="status">{message}</p>}
        </div>
        <div className="library-list">
          <h2>本地作品</h2>
          {stories.map((story) => (
            <article className="library-row" key={story.id}>
              <div>
                <p className="eyebrow">{story.version} · {story.chapterCount} CHAPTER</p>
                <h3>{story.title[language]}</h3>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => { setCurrentStory(story.id); setRoute('reader') }}>阅读</button>
                <button type="button" onClick={() => void exportStory(story.id)}>备份</button>
                <button type="button" onClick={() => void remove(story.id)}>删除</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {preview && (
        <section className="import-preview" aria-label="导入预览">
          <p className="eyebrow">Validation passed</p>
          <h2>{preview.manifest.title[language]}</h2>
          <p>{preview.manifest.chapterCount} 个章节 · {preview.manifest.worldDefinition?.landmarks.length ?? 0} 个地标</p>
          <button type="button" className="primary-entry" onClick={() => void confirmImport()}>确认导入 <span>↗</span></button>
        </section>
      )}
    </main>
  )
}
