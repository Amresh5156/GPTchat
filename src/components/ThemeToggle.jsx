import { useState } from 'react'
import { setTheme } from '../theme/initTheme'
import './ThemeToggle.css'

export default function ThemeToggle({ className = '' }) {
  const [mode, setMode] = useState(() =>
    typeof document !== 'undefined' &&
    document.documentElement.dataset.theme === 'dark'
      ? 'dark'
      : 'light'
  )

  const next = mode === 'dark' ? 'light' : 'dark'

  function apply(m) {
    setTheme(m)
    setMode(m)
  }

  return (
    <div className={`theme-toggle ${className}`.trim()}>
      <button
        type="button"
        className="theme-toggle__switch"
        onClick={() => apply(next)}
        role="switch"
        aria-checked={mode === 'dark'}
        aria-label={`Theme: ${mode}. Switch to ${next} mode.`}
      >
        <span className="theme-toggle__rail" aria-hidden>
          <span className="theme-toggle__knob" />
        </span>
        <span className="theme-toggle__text">
          <span className={mode === 'light' ? 'is-on' : ''}>Light</span>
          <span className={mode === 'dark' ? 'is-on' : ''}>Dark</span>
        </span>
      </button>
    </div>
  )
}
