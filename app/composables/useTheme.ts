type ThemeMode = 'light' | 'dark' | 'system'

export function useTheme() {
  const mode = useState<ThemeMode>('theme-mode', () => 'system')
  const isDark = useState<boolean>('theme-is-dark', () => false)

  function apply(next: ThemeMode): void {
    mode.value = next
    if (import.meta.server) return
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = next === 'dark' || (next === 'system' && prefersDark)
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage can be unavailable in private modes; the theme still applies.
    }
  }

  function initTheme(): void {
    if (import.meta.server) return
    let stored: ThemeMode = 'system'
    try {
      const raw = localStorage.getItem('theme')
      if (raw === 'light' || raw === 'dark' || raw === 'system') stored = raw
    } catch {
      stored = 'system'
    }
    apply(stored)
  }

  function toggle(): void {
    apply(isDark.value ? 'light' : 'dark')
  }

  return { mode, isDark, initTheme, apply, toggle }
}
