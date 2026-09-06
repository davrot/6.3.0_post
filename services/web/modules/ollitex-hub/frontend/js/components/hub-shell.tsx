import React, { ReactNode, Suspense, useCallback, useState, Component, ErrorInfo } from 'react'
import {
  Bell,
  Bot,
  FolderKanban,
  Home,
  Library,
  LayoutTemplate,
  LayoutGrid,
  Moon,
  Server,
  Settings,
  Sun,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/ui/cn'

export interface HubSection {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string; size?: number | string }>
  // Lazy component (React.lazy) — mounted on first visit, kept alive after.
  content: React.LazyExoticComponent<() => ReactNode>
  /** When true, render plain content without the surrounding kit Card. */
  plain?: boolean
}

export function useOverallThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const b = typeof document !== 'undefined' ? document.body : null
    return !b || b.dataset.theme !== 'light'
  })
  const toggle = useCallback(() => {
    const b = document.body
    const dark = b.dataset.theme !== 'light'
    b.dataset.theme = dark ? 'light' : 'default'
    // keep in sync with the app-wide overall-theme storage (use-active-overall-theme)
    try {
      const stored = localStorage.getItem('overallTheme')
      if (stored !== 'system') {
        localStorage.setItem('overallTheme', dark ? 'light' : 'dark')
      }
      window.dispatchEvent(new CustomEvent('overallThemeChanged'))
    } catch {
      /* storage unavailable */
    }
    setIsDark(!dark)
  }, [])
  return { isDark, toggle }
}

export function ThemeToggleButton({ className }: { className?: string }) {
  const { isDark, toggle } = useOverallThemeToggle()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={className}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}

// Per-section error boundary: a crashing section must render its own error
// box, never take down the whole hub (the user manager crashed on a missing
// page-meta before this boundary existed, which blanked the entire page).
class SectionBoundary extends Component<
  { children: ReactNode; label: string },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[hub] section "${this.props.label}" crashed:`, error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="m-5 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <div className="text-sm font-semibold text-destructive">
            This section failed to load
          </div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button
            type="button"
            className="mt-3 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
            onClick={() => this.setState({ error: null })}
          >
            Retry section
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function HubShell({
  title,
  icon: TitleIcon,
  sections,
  defaultSection = 'instance',
  homeHref = '/',
  homeLabel,
}: {
  title: string
  icon: HubSection['icon']
  sections: HubSection[]
  defaultSection?: string
  homeHref?: string
  homeLabel?: string
}) {
  const [active, setActive] = useState(defaultSection)
  // sections mounted so far (mount-once, keep alive)
  const [mounted, setMounted] = useState<Set<string>>(() => new Set([defaultSection]))
  const select = (id: string) => {
    setActive(id)
    setMounted(prev => new Set(prev).add(id))
  }

  return (
    <div className="olkit flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card/60">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <TitleIcon size={18} className="text-primary" />
          <span className="text-base font-semibold tracking-tight">{title}</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {sections.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => select(s.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <s.icon size={16} />
              {s.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <a
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            href={homeHref}
          >
            <Home size={15} />
            {homeLabel ?? 'Home'}
          </a>
          <ThemeToggleButton />
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-6 lg:p-8">
          {sections
            .filter(s => mounted.has(s.id))
            .map(s => (
              <section
                key={s.id}
                className={active === s.id ? '' : 'hidden'}
                aria-hidden={active !== s.id}
              >
                {s.plain ? (
                  <SectionBoundary label={s.label}>
                    <Suspense
                      fallback={
                        <Card className="p-8 text-center text-muted-foreground">
                          Loading…
                        </Card>
                      }
                    >
                      <s.content />
                    </Suspense>
                  </SectionBoundary>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <SectionBoundary label={s.label}>
                        <Suspense
                          fallback={
                            <div className="p-8 text-center text-muted-foreground">
                              Loading…
                            </div>
                          }
                        >
                          <div className="olkit-embed p-5">{React.createElement(s.content)}</div>
                        </Suspense>
                      </SectionBoundary>
                    </CardContent>
                  </Card>
                )}
              </section>
            ))}
        </div>
      </main>
    </div>
  )
}
