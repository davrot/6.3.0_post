// Material Symbols icon font (icon glyphs in the hub chrome/sections).
import '../../../../../frontend/fonts/material-symbols/material-symbols.css'

import { createRoot } from 'react-dom/client'
// Side-effect import: initialise this bundle's i18next instance (shared
// frontend i18n module) so useTranslation() in the hub sections — including
// the wrapped legacy admin-tools components — resolves real strings instead
// of raw keys.
import '@/i18n'
import OlliTProvider from '../../../../../frontend/js/shared/mantine/provider'
import WorkspaceHubRoot from '../components/workspace-hub-root'

const element = document.getElementById('workspace-hub-root')
if (element) {
  const root = createRoot(element)
  root.render(
    <OlliTProvider>
      <WorkspaceHubRoot />
    </OlliTProvider>
  )
}
