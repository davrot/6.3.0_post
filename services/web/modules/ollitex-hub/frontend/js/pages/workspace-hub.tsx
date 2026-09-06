import { createRoot } from 'react-dom/client'
import WorkspaceHubRoot from '../components/workspace-hub-root'

const element = document.getElementById('workspace-hub-root')
if (element) {
  const root = createRoot(element)
  root.render(<WorkspaceHubRoot />)
}
