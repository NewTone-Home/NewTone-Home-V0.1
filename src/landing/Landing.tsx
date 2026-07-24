import { useState } from 'react'
import type { LanguageCode } from '../domain/contracts'
import { useAppStore } from '../stores/appStore'
import { useReaderStore } from '../stores/readerStore'

export function Landing() {
  const { stories, currentStoryId, setCurrentStory, setRoute } = useAppStore()
  const { position, preferences, setPreferences } = useReaderStore()
  const [entering, setEntering] = useState(false)
  const current = stories.find((story) => story.id === currentStoryId)
  const language = preferences.language

  const begin = () => {
    if (!current) {
      setRoute('import')
      return
    }
    setEntering(true)
    window.setTimeout(() => setRoute('reader'), 280)
  }

  return (
    <main className={`landing ${entering ? 'is-entering' : ''}`} data-testid="landing">
      <div className="landing-grain" />
      <header className="landing-topline">
        <span>NEWTONE / FIELD EDITION 01</span>
        <button className="text-button" type="button" onClick={() => setRoute('import')}>
          内容书架
        </button>
      </header>
      <section className="landing-copy">
        <p className="eyebrow">A reader with another world beneath it</p>
        <h1 aria-label="NewTone">
          <span>New</span>
          <span>Tone</span>
        </h1>
        <p className="landing-intro">
          {language === 'zh-CN'
            ? '沿着文字留下的坐标，进入一座会随阅读醒来的双层世界。'
            : 'Follow the coordinates left by the text into a layered world awakened by reading.'}
        </p>
      </section>
      <section className="landing-actions" aria-label="开始阅读">
        <label className="language-field">
          <span>语言 / Language</span>
          <select
            value={language}
            onChange={(event) => setPreferences({ language: event.target.value as LanguageCode })}
          >
            <option value="zh-CN">中文</option>
            <option value="en">English</option>
          </select>
        </label>
        {stories.length > 1 && (
          <label className="language-field">
            <span>作品</span>
            <select value={currentStoryId ?? ''} onChange={(event) => setCurrentStory(event.target.value)}>
              {stories.map((story) => <option key={story.id} value={story.id}>{story.title[language]}</option>)}
            </select>
          </label>
        )}
        <button className="primary-entry" type="button" onClick={begin}>
          <span>{position?.storyId === currentStoryId ? '继续阅读' : '开始阅读'}</span>
          <span aria-hidden="true">↗</span>
        </button>
        <p className="current-work">{current ? current.title[language] : '尚未导入内容'}</p>
      </section>
      <footer className="landing-footer">
        <span>连续阅读</span><span>自动存档</span><span>表里世界</span>
      </footer>
    </main>
  )
}
