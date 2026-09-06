import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useNotifications } from '@mantine/notifications'
import { postJSON, getJSON } from '@/infrastructure/fetch-json'
import Icon from '../../shared/icons'
import ConfirmModal from '../../shared/confirm-modal'
import { EmptyState, PageError, PageLoading } from '../../shared/page-state'

type Project = {
  id: string
  name: string
  owner?: { id?: string; email: string; firstName?: string; lastName?: string }
  lastUpdated: string
  accessLevel?: 'owner' | 'readWrite' | 'readOnly' | 'review'
  archived?: boolean
  trashed?: boolean
}

function timeAgo(iso: string): string {
  try {
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return ''
    const s = Math.max(1, Math.floor((Date.now() - t) / 1000))
    if (s < 60) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m} min ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} h ago`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d} d ago`
    const mo = Math.floor(d / 30)
    if (mo < 12) return `${mo} mo ago`
    return `${Math.floor(mo / 12)} y ago`
  } catch {
    return ''
  }
}

function personName(u?: { email: string; firstName?: string; lastName?: string }): string {
  if (!u) return ''
  const n = `${u.firstName || ''} ${u.lastName || ''}`.trim()
  return n || u.email
}

export default function ProjectsSection() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [template, setTemplate] = useState('none')
  const [newName, setNewName] = useState('')
  const [newErr, setNewErr] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)
  const notifications = useNotifications()

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await postJSON('/api/project', {
        body: { sort: { by: 'lastUpdated', order: 'desc' } },
      })
      setProjects(Array.isArray(data?.projects) ? data.projects : [])
    } catch (err: any) {
      setProjects([])
      setError((err?.data?.message as string) || String(err?.message || err))
    }
  }, [])

  useEffect(() => {
    void load()
    void (async () => {
      try {
        const data = await getJSON('/api/templates?by=name&order=asc&category=none')
        const list = Array.isArray(data?.templates) ? data.templates : []
        setTemplates(
          list
            .map((t: any) => ({ id: t?._id || t?.id || '', name: t?.title || t?.name || 'Template' }))
            .filter((t: any) => t.id)
        )
      } catch {
        setTemplates([])
      }
    })()
  }, [load])

  const filtered = useMemo(() => {
    if (!projects) return []
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(p => (p.name || '').toLowerCase().includes(q))
  }, [projects, query])

  const createProject = async () => {
    if (!newName.trim()) {
      setNewErr('Project name is required.')
      return
    }
    setCreating(true)
    setNewErr(null)
    try {
      const data = await postJSON('/project/new', {
        body: { projectName: newName.trim(), template: template === 'none' ? '' : template },
      })
      const id = data?.project_id
      setNewOpen(false)
      setNewName('')
      if (id) {
        window.location.assign(`/project/${id}`)
        return
      }
      load()
    } catch (err: any) {
      setNewErr((err?.data?.message as string) || 'Could not create the project.')
    } finally {
      setCreating(false)
    }
  }

  const doDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await postJSON(`/project/${toDelete.id}/delete`, {}).catch(async () => {
        // some builds expose the hard delete via DELETE /project/:id
        await fetch(`/project/${toDelete.id}`, { method: 'DELETE', credentials: 'same-origin' })
      })
      notifications.show({ message: `Deleted “${toDelete.name}”.`, color: 'gray' })
      setToDelete(null)
      await load()
    } catch (err: any) {
      notifications.show({
        message: (err?.data?.message as string) || 'Delete failed.',
        color: 'red',
      })
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  if (!projects && !error) return <PageLoading label="Loading your projects…" />

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <TextInput
          leftSection={<Icon name="search" size={18} />}
          value={query}
          onChange={e => setQuery(e.currentTarget.value)}
          placeholder="Search projects"
          size="md"
          style={{ maxWidth: 420, width: '100%' }}
        />
        <Group gap="xs">
          <Button
            size="md"
            color="ollitex"
            leftSection={<Icon name="add" size={18} />}
            onClick={() => {
              setNewOpen(true)
              setNewErr(null)
            }}
          >
            New project
          </Button>
        </Group>
      </Group>

      {error ? (
        <PageError label="Couldn’t load projects" detail={error} onRetry={() => void load()} />
      ) : null}

      {projects && filtered.length === 0 ? (
        <EmptyState
          icon={query ? 'search_off' : 'folder'}
          title={query ? 'No projects match your search' : 'No projects yet'}
          hint={
            query
              ? `Nothing matched “${query}”.`
              : 'Create your first project to start writing LaTeX with OlliTeX.'
          }
          action={
            !query ? (
              <Button
                size="sm"
                color="ollitex"
                leftSection={<Icon name="add" size={16} />}
                onClick={() => setNewOpen(true)}
              >
                New project
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {projects && filtered.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
          {filtered.map(p => (
            <Card key={p.id} withBorder paddings="md" radius="lg" miw={300}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text fw={600} size="md" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} truncate>
                  {p.name}
                </Text>
                {p.accessLevel === 'owner' ? (
                  <Badge size="xs" variant="light" color="ollitex" radius="sm">
                    Owner
                  </Badge>
                ) : (
                  <Badge size="xs" variant="subtle" radius="sm">
                    Shared
                  </Badge>
                )}
              </Group>
              <Text size="sm" c="dimmed" mt={6} ellipsis>
                {p.owner ? personName(p.owner) : ''}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Updated {timeAgo(p.lastUpdated)}
              </Text>
              <Card.Section mt="md">
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Button
                    size="sm"
                    component="a"
                    href={`/project/${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    color="ollitex"
                    variant="light"
                    leftSection={<Icon name="open_in_new" size={16} />}
                  >
                    Open
                  </Button>
                  <Menu width={220} position="bottom-end">
                    <Menu.Target>
                      <Button size="sm" variant="subtle" c="dimmed" rightSection={<Icon name="more_vert" size={16} />} />
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        icon={<Icon name="delete" size={16} />}
                        color="red"
                        onClick={() => setToDelete(p)}
                      >
                        Delete project
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Card.Section>
            </Card>
          ))}
        </SimpleGrid>
      ) : null}

      <Modal
        opened={newOpen}
        onClose={() => setNewOpen(false)}
        size="sm"
        title={<Text fw={700}>New project</Text>}
      >
        <Stack gap="md">
          <label style={{ display: 'block' }}>
            <Text size="sm" fw={600} mb={6}>
              Project name
            </Text>
            <TextInput
              leftSection={<Icon name="article" size={18} />}
              value={newName}
              onChange={e => setNewName(e.currentTarget.value)}
              placeholder="e.g. Thesis chapter 1"
              error={newErr && !newName.trim() ? 'required' : undefined}
              style={{ paddingLeft: 0 }}
            />
          </label>
          <label style={{ display: 'block' }}>
            <Text size="sm" fw={600} mb={6}>
              Start from
            </Text>
            <NativeSelect
              value={template}
              onChange={e => setTemplate(e.currentTarget.value)}
              data={[
                { value: 'none', label: 'Blank project' },
                ...templates.map(t => ({ value: t.id, label: t.name })),
              ]}
            />
          </label>
          {newErr && newName.trim() ? <Text size="sm" c="red">{newErr}</Text> : null}
          <Group justify="flex-end" gap="xs" mt="sm">
            <Button variant="default" onClick={() => setNewOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button color="ollitex" loading={creating} onClick={() => void createProject()}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        title="Delete project?"
        body={
          toDelete
            ? `“${toDelete.name}” and all of its documents will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void doDelete()}
      />
    </Stack>
  )
}
