import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { bootstrap } from './app/bootstrap'
import './themes/theme.css'
import './styles.css'

void bootstrap()

createRoot(document.getElementById('root')!).render(<App />)
