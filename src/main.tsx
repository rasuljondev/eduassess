import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'

// Apply saved theme ASAP (before first paint) so all routes share the same theme.
// `dark:` utilities are class-based via `@custom-variant` in `index.css`.
const THEME_KEY = 'theme';
try {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
  const shouldUseDark = saved ? saved === 'dark' : Boolean(prefersDark);
  document.documentElement.classList.toggle('dark', shouldUseDark);
} catch {
  // ignore (e.g. privacy mode)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
