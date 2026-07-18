'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Matches [data-theme] --bg-chrome / --bg-primary (header / footer / Safari UI tint). */
const THEME_COLOR_HEX = {
  light: '#FCFCFC',
  dark: '#383838',
} as const

export function readThemeFromDocument(): ThemeMode {
  if (typeof document === 'undefined') return 'light'
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'dark' || attr === 'light') return attr
  try {
    const raw = localStorage.getItem('theme')
    return raw === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function syncWebViewChromeMeta(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const appleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (appleStatus) {
    appleStatus.setAttribute('content', mode === 'dark' ? 'black-translucent' : 'default')
  }
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
    el.setAttribute('content', THEME_COLOR_HEX[mode])
  })
}

/** Run before React mounts so `data-theme` and iOS `meta` match localStorage on first paint. */
export function applyStoredThemeToDocument(): void {
  if (typeof document === 'undefined') return
  const theme = readThemeFromDocument()
  document.documentElement.setAttribute('data-theme', theme)
  syncWebViewChromeMeta(theme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setTheme(readThemeFromDocument())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    const current = document.documentElement.getAttribute('data-theme')
    if (current !== theme) {
      document.documentElement.setAttribute('data-theme', theme)
    }
    syncWebViewChromeMeta(theme)
  }, [theme, ready])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: ThemeMode = current === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
