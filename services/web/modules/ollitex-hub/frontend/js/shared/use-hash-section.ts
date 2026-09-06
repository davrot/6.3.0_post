import { useCallback, useEffect, useState } from 'react'

/**
 * Hub section state synced to location.hash (#/projects, #/settings-llm …)
 * so sections are deep-linkable and survive accidental full reloads.
 *
 * options.autoHash: replaceState on every change (pages whose URL is not
 * otherwise hash-routed, e.g. #/admin-instance).
 */
export default function useHashSection(defaultSection: string, options?: { autoHash?: boolean }) {
  const [section, setSection] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultSection
    const h = window.location.hash.replace(/^#\/?/, '')
    return h || defaultSection
  })

  const select = useCallback(
    (next: string) => {
      setSection(next)
      try {
        history.replaceState(null, '', `#/${next}`)
      } catch {
        // jsdom/tests without reliable history
      }
      window.dispatchEvent(new CustomEvent('ollitex-hub-section', { detail: { section: next } }))
    },
    []
  )

  // Accept plain-hash navigation (e.g. in-hub anchors "Go to #templates →").
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onHash = () => {
      const h = window.location.hash.replace(/^#\/?/, '')
      if (h) setSection(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return { section, select }
}
