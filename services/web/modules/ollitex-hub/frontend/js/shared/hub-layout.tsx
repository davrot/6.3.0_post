import React from 'react'
import {
  AppShell,
  Burger,
  Group,
  Stack,
  Text,
  Title,
  Anchor,
  ScrollArea,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import Icon from './icons'

export interface HubNavItem {
  id: string
  label: string
  icon: string
  badge?: string | number
}
export interface HubNavGroup {
  label?: string
  items: HubNavItem[]
}

interface HubLayoutProps {
  brand: string
  tagline?: string
  nav: HubNavGroup[]
  active: string
  onSelect: (id: string) => void
  title: string
  subtitle?: string
  headerActions?: React.ReactNode
  children: React.ReactNode
}

/**
 * Shared chrome for the OlliTeX hubs (/hub/workspace, /hub/admin) —
 * brand-styled Mantine 9 AppShell with a grouped left navigation and a
 * header band. Content sections render inside <AppShell.Main>.
 */
export default function HubLayout({
  brand,
  tagline,
  nav,
  active,
  onSelect,
  title,
  subtitle,
  headerActions,
  children,
}: HubLayoutProps) {
  const [opened, { toggle }] = useDisclosure(true)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <AppShell
      style={{ position: 'relative', minHeight: '100vh', background: 'var(--mantine-color-body)' }}
      padding="md"
      header={{ offset: false }}
      navbar={{
        width: 240,
        collapsedWidth: 0,
        collapsed: !opened,
        breakpoint: 'lg',
      }}
    >
      <AppShell.Header
        style={{
          background: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-border)',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hidden={isMobile ? undefined : undefined} size="md" />
            <Group gap="xs" wrap="nowrap">
              <span
                aria-hidden
                className="material-symbols-rounded"
                style={{ fontSize: 26, color: 'var(--mantine-color-ollitex-6)' }}
              >
                auto_storyboard
              </span>
              <Stack gap={0}>
                <Title order={4} style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {brand}
                </Title>
                {tagline ? (
                  <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
                    {tagline}
                  </Text>
                ) : null}
              </Stack>
            </Group>
          </Group>
          <Group gap="sm" wrap="nowrap" style={{ visibility: headerActions ? 'visible' : 'hidden' }}>
            {headerActions}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar bg="transparent">
        <Stack gap="sm" p="sm" style={{ height: '100%' }}>
          <ScrollArea type="auto" scrollbars="y" style={{ height: '100%' }}>
            <Stack gap="xl" px="xs" py="sm">
              {nav.map((group, gi) => (
                <Stack key={group.label || `g${gi}`} gap="xs">
                  {group.label ? (
                    <Text
                      size="xs"
                      tt="uppercase"
                      fw={700}
                      c="dimmed"
                      style={{ letterSpacing: '0.08em', padding: '0 8px' }}
                    >
                      {group.label}
                    </Text>
                  ) : null}
                  {group.items.map(item => {
                    const isActive = active === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: isActive ? 600 : 500,
                          textAlign: 'left',
                          background: isActive
                            ? 'var(--mantine-color-ollitex-6)'
                            : 'transparent',
                          color: isActive
                            ? 'var(--mantine-color-white)'
                            : 'var(--mantine-color-text)',
                          transition: 'background 120ms ease',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--mantine-color-gray-1)'
                        }}
                        onMouseLeave={e => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                        }}
                      >
                        <span
                          className="material-symbols-rounded"
                          style={{
                            fontSize: 20,
                            color: isActive
                              ? 'var(--mantine-color-white)'
                              : 'var(--mantine-color-gray-6)',
                          }}
                        >
                          {item.icon}
                        </span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '1px 8px',
                              borderRadius: 999,
                              background: isActive
                                ? 'rgba(255,255,255,0.22)'
                                : 'var(--mantine-color-gray-2)',
                              color: isActive ? '#fff' : 'var(--mantine-color-gray-7)',
                            }}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </Stack>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main style={{ padding: 0 }}>
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          {title ? (
            <div style={{ marginBottom: 20 }}>
              <Title order={2} style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                {title}
              </Title>
              {subtitle ? (
                <Text c="dimmed" mt={4} size="sm">
                  {subtitle}
                </Text>
              ) : null}
            </div>
          ) : null}
          {children}
        </div>
      </AppShell.Main>
    </AppShell>
  )
}

export function OpenInAppLink({ href, label }: { href: string; label: string }) {
  return (
    <Anchor
      href={href}
      target="_blank"
      rel="noreferrer"
      size="sm"
      style={{ textDecoration: 'none' }}
    >
      <Group gap={6}>
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
          open_in_new
        </span>
        {label}
      </Group>
    </Anchor>
  )
}
