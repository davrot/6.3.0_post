// Workspace hub — /project + /library + /templates on one page
// (Option B, owner 2026-09-06). Reuses the proven roots of the standalone
// pages inside the shared kit shell.
import React, { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import useWaitForI18n from '@/shared/hooks/use-wait-for-i18n'
import { LayoutGrid, LayoutTemplate, Library, LayoutList } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Switch } from '@/shared/ui/switch'
import HubShell from './hub-shell'

const ProjectsSection = lazy(
  () => import('../../../../../frontend/js/features/project-list/components/project-list-root')
)
const LibrarySection = lazy(
  () => import('../../../../bib-editor/frontend/js/library/library-root')
)
const GallerySection = lazy(
  () =>
    import(
      '../../../../template-gallery/frontend/js/features/template-gallery/components/template-gallery-root'
    )
)
const TemplateBundles = lazy(
  () =>
    import(
      '../../../../template-gallery/frontend/js/features/template-bundles/template-bundles'
    )
)

function TemplatesSection() {
  const { t } = useTranslation()
  const [showManage, setShowManage] = React.useState(false)
  const user =
    (document.querySelector('meta[name=ol-user]') as HTMLMetaElement | null)
      ?.content || 'null'
  let isTemplateAdmin = false
  try {
    isTemplateAdmin = !!(
      JSON.parse(user).ace?.permissions?.templatesAdmin ||
      JSON.parse(user).ace?.permissions?.adminAccess
    )
  } catch {
    isTemplateAdmin = false
  }

  return (
    <div>
      {isTemplateAdmin && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <span className="text-sm text-muted-foreground">
            {t('Template gallery administration (bundle save / import).')}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm">{t('Manage')}</span>
            <Switch checked={showManage} onCheckedChange={setShowManage} />
          </div>
        </div>
      )}
      {showManage && isTemplateAdmin ? (
        <div className="p-5">
          <Suspense fallback={<div className="p-4 text-muted-foreground">Loading…</div>}>
            <TemplateBundles compact />
          </Suspense>
        </div>
      ) : (
        <GallerySectionContent />
      )}
    </div>
  )
}

function GallerySectionContent() {
  return (
    <div className="p-5">
      <GallerySection />
    </div>
  )
}

export default function WorkspaceHubRoot() {
  const { t } = useTranslation()
  const { isReady } = useWaitForI18n()
  if (!isReady) return null

  const TemplatesSectionLazy = lazy(() =>
    Promise.resolve({ default: TemplatesSection })
  )

  const sections = [
    {
      id: 'projects',
      label: t('Projects'),
      icon: LayoutList,
      content: ProjectsSection,
    },
    {
      id: 'library',
      label: t('Library'),
      icon: Library,
      content: LibrarySection,
    },
    {
      id: 'templates',
      label: t('Templates'),
      icon: LayoutTemplate,
      content: TemplatesSectionLazy as React.LazyExoticComponent<
        () => React.ReactNode
      >,
    },
  ]

  return (
    <HubShell
      title={t('OlliTeX Workspace')}
      icon={LayoutGrid}
      sections={sections}
      defaultSection="projects"
      homeLabel={t('Home')}
    />
  )
}
