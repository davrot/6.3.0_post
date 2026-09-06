import React from 'react'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { ollitexTheme } from './ollitex-theme'
import { useOllitexColorScheme } from './use-ollitex-color-scheme'

/**
 * Shared Mantine 9.6.0 shell for OlliTeX pages (hubs, settings, admin).
 * - brand tokens (ollitex theme: deep blue H217, Noto Sans, 8px radius)
 * - dark/light bridged live to our body[data-theme] (OL theme pickers keep working)
 * - Mantine notifications baked in for all pages using this provider
 */
export default function OlliTProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useOllitexColorScheme()

  return (
    <MantineProvider theme={ollitexTheme} defaultColorScheme={colorScheme}>
      <Notifications value={{ position: 'bottom-right', autoClose: true, duration: 4000, zIndex: 1200 }} />
      {children}
    </MantineProvider>
  )
}
