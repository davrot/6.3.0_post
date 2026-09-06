// Admin hub — all admin items on one page (Option B, owner 2026-09-06).
// Sections reuse the proven React roots of the standalone pages
// (/admin/site, /admin/user, /admin/project, LLM settings) inside the
// shared kit shell, so behavior stays identical — only the surface
// unifies.
import React, { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import useWaitForI18n from '@/shared/hooks/use-wait-for-i18n'
import { getJSON } from '@/infrastructure/fetch-json'
import {
  Badge,
} from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import HubShell from './hub-shell'

// Server/Settings/Users icons used by the shell nav
import { Bot, FolderKanban, Server, Settings, Users } from 'lucide-react'

// ---- sections (lazy so each chunk loads on first visit) -----------------

const SiteSection = lazy(
  () => import('../../../../admin-tools/frontend/js/site-settings/site-settings-root')
)
const UsersSection = lazy(
  () => import('../../../../admin-tools/frontend/js/manage-users-root')
)
const ProjectsSection = lazy(
  () => import('../../../../admin-tools/frontend/js/manage-projects-root')
)
const LlmSection = lazy(
  () => import('../../../../llm/frontend/js/components/llm-settings-page')
)

function InstanceSection() {
  const { t } = useTranslation()
  const [values, setValues] = React.useState<Record<string, number | null>>({})
  const [failed, setFailed] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      // /admin/instance-stats/api/series?metric=<key>&window=month →
      // { metric, window, points: [{ day, values: number[] }] }
      const keys = [
        'user_count',
        'project_count',
        'active_users',
        'active_projects',
        'overleaf_storage',
        'mongodb_storage',
      ]
      const out: Record<string, number | null> = {}
      const results = await Promise.all(keys.map(async k => {
        try {
          const data = await getJSON('/admin/instance-stats/api/series?metric=' + k + '&window=month')
          const pts = (data && data.points) || []
          const last = pts[pts.length - 1]
          const v = last && Array.isArray(last.values) ? last.values[last.values.length - 1] : null
          out[k] = typeof v === 'number' ? v : null
        } catch {
          out[k] = null
        }
        return k
      }))
      void results
      if (!cancelled) {
        setValues(out)
        setFailed(keys.every(k => out[k] == null))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading instance stats…</div>
  }

  const fmtBytes = (v: number) => {
    const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    let i = 0
    let n = v
    while (n >= 1024 && i < u.length - 1) {
      n /= 1024
      i++
    }
    return `${n.toFixed(1)} ${u[i]}`
  }

  const stats = [
    { key: 'user_count', label: t('Users') },
    { key: 'project_count', label: t('Projects') },
    { key: 'active_users', label: t('Active users') },
    { key: 'active_projects', label: t('Active projects') },
    { key: 'overleaf_storage', label: t('Overleaf storage'), bytes: true },
    { key: 'mongodb_storage', label: t('MongoDB storage'), bytes: true },
  ]

  return (
    <div>
      {failed && (
        <div className="px-5 pt-4 text-sm text-muted-foreground">
          Live values are not available yet (stats collector pending or disabled).{
          ' '}
          <a className="underline" href="/admin/instance-stats">
            Open the full dashboard
          </a>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
        {stats.map(s => {
          const v = values[s.key]
          return (
            <Card key={s.key} className="bg-card/60 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    30d
                  </Badge>
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">
                  {v == null ? '—' : s.bytes ? fmtBytes(v) : v.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-sm text-muted-foreground">
          Time-series charts, alerts and e-mail configuration live in the full dashboard.
        </span>
        <a
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium hover:bg-accent"
          href="/admin/instance-stats"
        >
          Open full dashboard
        </a>
      </div>
    </div>
  )
}

// Uniform lazy wrapper for the shell's Suspense handling.
const InstanceSectionLazy = lazy(() => Promise.resolve({ default: InstanceSection }))

// ---- the hub -------------------------------------------------------------

export default function AdminHubRoot() {
  const { t } = useTranslation()
  const { isReady } = useWaitForI18n()
  if (!isReady) return null

  const sections = [
    {
      id: 'instance',
      label: t('Instance'),
      icon: Server,
      content: InstanceSectionLazy as React.LazyExoticComponent<() => React.ReactNode>,
    },
    { id: 'site', label: t('Site settings'), icon: Settings, content: SiteSection },
    { id: 'users', label: t('Users'), icon: Users, content: UsersSection },
    { id: 'projects', label: t('Projects'), icon: FolderKanban, content: ProjectsSection },
    { id: 'llm', label: t('LLM'), icon: Bot, content: LlmSection },
  ]

  return (
    <HubShell
      title={t('OlliTeX Admin')}
      icon={Server}
      sections={sections}
      defaultSection="instance"
      homeLabel={t('Home')}
    />
  )
}
