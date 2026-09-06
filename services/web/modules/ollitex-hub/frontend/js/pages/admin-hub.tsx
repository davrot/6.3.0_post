import { createRoot } from 'react-dom/client'
import OlliTProvider from '../../../../../frontend/js/shared/mantine/provider'
import AdminHubRoot from '../components/admin-hub-root'

const element = document.getElementById('admin-hub-root')
if (element) {
  const root = createRoot(element)
  root.render(
    <OlliTProvider>
      <AdminHubRoot />
    </OlliTProvider>
  )
}
