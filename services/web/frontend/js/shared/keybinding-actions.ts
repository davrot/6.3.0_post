/**
 * 2026-09-09 (owner R9 #4): custom key bindings.
 *
 * The rebindable action set for the editor. Every id is a command-registry
 * command id (see frontend/js/features/ide-react/context/command-registry-
 * context.tsx), whose registered handler is what a custom binding triggers.
 *
 * `defaultKey` is the stock Overleaf (default-mode) binding for that action;
 * it is what the manager shows in the "Default" column and what Reset-to-
 * default restores to. Keys use the CodeMirror 6 key syntax (Mod- / Shift- /
 * Alt-), so they are both human-readable and directly dispatchable.
 */
export interface KeybindingAction {
  id: string
  label: string
  // i18n key for the label (falls back to the literal label)
  key: string
  defaultKey: string
}

export const KEYBINDING_ACTIONS: KeybindingAction[] = [
  { id: 'cut', label: 'Cut', key: 'kb_cut', defaultKey: 'Mod-x' },
  { id: 'copy', label: 'Copy', key: 'kb_copy', defaultKey: 'Mod-c' },
  { id: 'paste', label: 'Paste', key: 'kb_paste', defaultKey: 'Mod-v' },
  {
    id: 'paste-special',
    label: 'Paste special',
    key: 'kb_paste_special',
    defaultKey: 'Mod-Shift-V',
  },
  { id: 'undo', label: 'Undo', key: 'kb_undo', defaultKey: 'Mod-z' },
  { id: 'redo', label: 'Redo', key: 'kb_redo', defaultKey: 'Mod-y' },
  { id: 'find', label: 'Find', key: 'kb_find', defaultKey: 'Mod-f' },
  {
    id: 'select-all',
    label: 'Select all',
    key: 'kb_select_all',
    defaultKey: 'Mod-a',
  },
  {
    id: 'insert-comment',
    label: 'Insert comment',
    key: 'kb_insert_comment',
    defaultKey: 'Mod-Shift-C',
  },
  {
    id: 'format-bold',
    label: 'Format: bold',
    key: 'kb_format_bold',
    defaultKey: 'Mod-b',
  },
  {
    id: 'format-italics',
    label: 'Format: italics',
    key: 'kb_format_italics',
    defaultKey: 'Mod-i',
  },
  {
    id: 'toggle-track-changes',
    label: 'Toggle track changes',
    key: 'kb_toggle_track_changes',
    defaultKey: 'Mod-Shift-A',
  },
  {
    id: 'command-palette',
    label: 'Command palette',
    key: 'kb_command_palette',
    defaultKey: 'Mod-p',
  },
  // 2026-09-09 (owner R10 #1: "there are MORE key bindings") — the full
  // command-registry catalog (compile, downloads, layouts, inserts, lists,
  // PDF controls, synctex). defaultKey '∅' = no stock binding.
  { id: 'compile', label: 'Compile (run)', key: 'kb_compile', defaultKey: '∅' },
  { id: 'stop-compile', label: 'Stop compile', key: 'kb_stop_compile', defaultKey: '∅' },
  {
    id: 'recompile-from-scratch',
    label: 'Recompile from scratch',
    key: 'kb_recompile_scratch',
    defaultKey: '∅',
  },
  {
    id: 'open-settings',
    label: 'Open editor settings',
    key: 'kb_open_settings',
    defaultKey: '∅',
  },
  { id: 'insert-symbol', label: 'Insert symbol', key: 'kb_insert_symbol', defaultKey: '∅' },
  {
    id: 'insert-display-math',
    label: 'Insert display math',
    key: 'kb_insert_display_math',
    defaultKey: '∅',
  },
  {
    id: 'insert-inline-math',
    label: 'Insert inline math',
    key: 'kb_insert_inline_math',
    defaultKey: '∅',
  },
  { id: 'insert-citation', label: 'Insert citation', key: 'kb_insert_citation', defaultKey: '∅' },
  {
    id: 'insert-cross-reference',
    label: 'Insert cross-reference',
    key: 'kb_insert_crossref',
    defaultKey: '∅',
  },
  { id: 'insert-link', label: 'Insert link', key: 'kb_insert_link', defaultKey: '∅' },
  { id: 'insert-table', label: 'Insert table', key: 'kb_insert_table', defaultKey: '∅' },
  {
    id: 'format-bullet-list',
    label: 'Format: bullet list',
    key: 'kb_format_bullet_list',
    defaultKey: '∅',
  },
  {
    id: 'format-numbered-list',
    label: 'Format: numbered list',
    key: 'kb_format_numbered_list',
    defaultKey: '∅',
  },
  { id: 'comment', label: 'Comment / uncomment line', key: 'kb_comment_line', defaultKey: '∅' },
  { id: 'close-tab', label: 'Close source tab', key: 'kb_close_tab', defaultKey: '∅' },
  {
    id: 'close-other-tabs',
    label: 'Close other source tabs',
    key: 'kb_close_other_tabs',
    defaultKey: '∅',
  },
  { id: 'download-pdf', label: 'Download PDF', key: 'kb_download_pdf', defaultKey: '∅' },
  {
    id: 'download-as-source-zip',
    label: 'Download as source (zip)',
    key: 'kb_download_zip',
    defaultKey: '∅',
  },
  {
    id: 'change-layout-side-by-side',
    label: 'Layout: side by side',
    key: 'kb_layout_sbs',
    defaultKey: '∅',
  },
  {
    id: 'change-layout-editor-only',
    label: 'Layout: editor only',
    key: 'kb_layout_editor',
    defaultKey: '∅',
  },
  { id: 'change-layout-pdf-only', label: 'Layout: PDF only', key: 'kb_layout_pdf', defaultKey: '∅' },
  {
    id: 'change-layout-focus-mode',
    label: 'Layout: focus mode',
    key: 'kb_layout_focus',
    defaultKey: '∅',
  },
  {
    id: 'change-layout-detached-pdf',
    label: 'Layout: detached PDF',
    key: 'kb_layout_detached',
    defaultKey: '∅',
  },
  { id: 'view-pdf-zoom-in', label: 'PDF: zoom in', key: 'kb_pdf_zoom_in', defaultKey: '∅' },
  {
    id: 'view-pdf-zoom-out',
    label: 'PDF: zoom out',
    key: 'kb_pdf_zoom_out',
    defaultKey: '∅',
  },
  {
    id: 'view-pdf-presentation-mode',
    label: 'PDF: presentation mode',
    key: 'kb_pdf_present',
    defaultKey: '∅',
  },
  {
    id: 'view-pdf-fit-width',
    label: 'PDF: fit width',
    key: 'kb_pdf_fit_width',
    defaultKey: '∅',
  },
  {
    id: 'view-pdf-fit-height',
    label: 'PDF: fit height',
    key: 'kb_pdf_fit_height',
    defaultKey: '∅',
  },
  {
    id: 'synctex-sync-to-pdf',
    label: 'SyncTeX: position in PDF',
    key: 'kb_synctex_pdf',
    defaultKey: '∅',
  },
  {
    id: 'synctex-sync-to-code',
    label: 'SyncTeX: position in code',
    key: 'kb_synctex_code',
    defaultKey: '∅',
  },
]

/**
 * JSON-import / server-side value safety (owner R10 #1): a valid key string
 * is 1+ dash-separated parts, each either a modifier (Mod/Shift/Alt) or a
 * key name (single letter/number, F1-F12, or a known editor key name).
 * Nothing more exotic — so a stored binding can only match real keydowns.
 */
export function isValidKeyString(v: unknown): boolean {
  if (typeof v !== 'string' || !v || v.length > 32) return false
  const NAMED =
    /^(space|enter|backspace|delete|home|end|pageup|pagedown|esc|tab|arrowup|arrowdown|arrowleft|arrowright|f[1-9]|f1[0-2])$/i
  return v
    .split('-')
    .filter(p => p.length > 0)
    .every(p => /^(mod|shift|alt)$/i.test(p) || /^[a-z0-9]$/i.test(p) || NAMED.test(p))
}

/**
 * Normalize a stored/display key string for comparison: modifiers canonical
 * (Mod/Shift/Alt, order-independent), single characters lower-cased,
 * Ctrl/Control/Cmd/Meta all → mod. Returns '' for empty input.
 */
export function normalizeKeyBinding(str: string | null | undefined): string {
  if (!str) return ''
  const parts: string[] = []
  for (const raw of String(str).split('-')) {
    const p = raw.trim()
    if (!p) continue
    if (p.length === 1 && /[a-zA-Z]/.test(p)) parts.push(p.toLowerCase())
    else if (/^(mod|ctrl|control|cmd|meta)$/.test(p.toLowerCase())) parts.push('mod')
    else if (/^shift$/.test(p.toLowerCase())) parts.push('shift')
    else if (/^alt$/.test(p.toLowerCase())) parts.push('alt')
    else parts.push(p)
  }
  // canonical order: mod, shift, alt, key
  const order: Record<string, number> = { mod: 0, shift: 1, alt: 2 }
  parts.sort((a, b) => {
    const oa = order[a.toLowerCase()] ?? 3
    const ob = order[b.toLowerCase()] ?? 3
    return oa - ob || a.localeCompare(b)
  })
  return parts.join('-')
}

/**
 * Render a KeyboardEvent as the canonical key string ("mod-shift-k").
 * Returns '' for modifier-only presses and unbindable keys (F-keys are
 * allowed, dead keys are not).
 */
export function keyStringFromKeyboardEvent(e: KeyboardEvent): string {
  if (!e.key) return ''
  const KEY = e.key
  // ignore modifier-only presses + system keys
  if (
    ['Shift', 'Control', 'Alt', 'Meta', 'Process', 'CapsLock', 'OS', 'NumLock',
      'ScrollLock', 'Help', 'F20', 'F21', 'F22', 'F23', 'Unidentified',
      'Dead', 'AltGraph'].includes(KEY)
  ) {
    return ''
  }
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('mod')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  let key = KEY
  if (key === ' ') key = 'Space'
  if (key === 'Backspace') key = 'Backspace'
  if (key.length === 1 && /[a-zA-Z]/.test(key)) key = key.toLowerCase()
  parts.push(key)
  return parts.join('-')
}
