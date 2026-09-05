import React, { useEffect } from 'react'
import { useUserSettingsContext } from '@/shared/context/user-settings-context'
import { useCommandRegistry } from '@/features/ide-react/context/command-registry-context'
import {
  keyStringFromKeyboardEvent,
  normalizeKeyBinding,
} from '@/shared/keybinding-actions'

/**
 * 2026-09-09 (owner R9 #4): activates custom key bindings inside the project
 * editor.
 *
 * Each custom binding is `command id → key string` (CodeMirror 6 syntax),
 * stored per user (user.ace.customKeybindings, exposed as
 * ol-userSettings.customKeybindings). A capture-phase window keydown
 * listener matches the pressed key against the user's map (normalized,
 * order-insensitive) and invokes the matching command-registry handler.
 *
 * Capture phase + preventDefault means the user's binding wins over the
 * stock keymaps (default mode, Vim and Emacs emulation all included — the
 * replit plugins consume keys at target level, so a window capture listener
 * running with stopPropagation wins in every mode).
 */
export default function CustomKeybindingsActivator() {
  const { userSettings } = useUserSettingsContext()
  const { registry } = useCommandRegistry()

  const bindings = userSettings?.customKeybindings || {}

  useEffect(() => {
    const active = Object.entries(bindings).filter(
      ([, k]) => typeof k === 'string' && k.length > 0
    )
    if (active.length === 0) return undefined

    const byKey = new Map<string, string>()
    for (const [id, k] of active) {
      const norm = normalizeKeyBinding(k)
      if (norm && !byKey.has(norm)) byKey.set(norm, id)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const target = e.target as HTMLElement | null
      // never hijack keys while typing in a real form control OUTSIDE the
      // source editor (search boxes, chat input, settings inputs …)
      if (
        target &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) &&
        !target.closest('.cm-editor')
      ) {
        return
      }
      const pressed = keyStringFromKeyboardEvent(e)
      if (!pressed) return
      const commandId = byKey.get(pressed)
      if (!commandId) return
      const command = registry.get(commandId)
      if (!command || typeof command.handler !== 'function') return
      e.preventDefault()
      e.stopPropagation()
      try {
        command.handler({ location: 'custom-keybinding' })
      } catch (err) {
        // Binding must never take the editor down — report and move on.
        // eslint-disable-next-line no-console
        console.warn(`custom keybinding "${commandId}" failed`, err)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [bindings, registry])

  // Headless: installs/removes the listener only.
  return null
}
