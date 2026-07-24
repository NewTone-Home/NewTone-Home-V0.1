import { CenterPage } from '../center/CenterPage'
import { ImportPage } from '../import/ImportPage'
import { Landing } from '../landing/Landing'
import { Reader } from '../reader/Reader'
import { useAppStore } from '../stores/appStore'

export function App() {
  const { route, initializing, error } = useAppStore()

  if (initializing) {
    return <main className="loading-screen"><span className="ink-loader" />正在展开纸页…</main>
  }

  if (error) {
    return (
      <main className="error-screen">
        <p className="eyebrow">NewTone / 初始化</p>
        <h1>纸页没有顺利展开</h1>
        <p>{error}</p>
        <button type="button" onClick={() => location.reload()}>重新尝试</button>
      </main>
    )
  }

  if (route === 'import') return <ImportPage />
  if (route === 'reader') return <Reader />
  if (route === 'center') return <CenterPage />
  return <Landing />
}
