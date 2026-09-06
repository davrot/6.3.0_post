import { useEffect, useState } from 'react'

/**
 * Bridge Overleaf's theme model (body[data-theme]) to Mantine colorSchemes.
 * OL values: 'default' (dark), 'light'; 'system' handled defensively.
 */
export function getOllitexColorScheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark'
  const t = document.body?.dataset?.theme
  if (t === 'light') return 'light'
  if (t === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark' // 'default' or unset → OL's dark default
}

/** Reactive version: updates when OL flips the body attribute (theme picker). */
export function useOllitexColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>(getOllitexColorScheme)

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return
    const update = () => setScheme(getOllitexColorScheme())
    const mo = new MutationObserver(update)
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  return scheme
}
