import { createRoot } from 'react-dom/client'
import AdminHubRoot from '../components/admin-hub-root'

const element = document.getElementById('admin-hub-root')
if (element) {
  const root = createRoot(element)
  root.render(<AdminHubRoot />)
}
