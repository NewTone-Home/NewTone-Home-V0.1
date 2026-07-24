import type { LanguageCode } from '../domain/contracts'
import { useReaderStore } from '../stores/readerStore'

export function ReaderSettings({ onLanguageChange }: { onLanguageChange: (language: LanguageCode) => void }) {
  const { preferences, setPreferences } = useReaderStore()
  return (
    <details className="reader-settings">
      <summary aria-label="阅读设置">Aa</summary>
      <div className="settings-sheet">
        <label>语言
          <select value={preferences.language} onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}>
            <option value="zh-CN">中文</option><option value="en">English</option>
          </select>
        </label>
        <label>字号
          <input type="range" min="0.85" max="1.25" step="0.05" value={preferences.fontScale}
            onChange={(event) => setPreferences({ fontScale: Number(event.target.value) })} />
        </label>
        <label>行距
          <input type="range" min="1.5" max="2.2" step="0.1" value={preferences.lineHeight}
            onChange={(event) => setPreferences({ lineHeight: Number(event.target.value) })} />
        </label>
        <label>背景强度
          <input type="range" min="0" max="1" step="0.1" value={preferences.backgroundIntensity}
            onChange={(event) => setPreferences({ backgroundIntensity: Number(event.target.value) })} />
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={preferences.immersiveVisualsEnabled}
            onChange={(event) => setPreferences({ immersiveVisualsEnabled: event.target.checked })} />
          沉浸视觉
        </label>
      </div>
    </details>
  )
}
