import { createRoot } from 'react-dom/client'
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
