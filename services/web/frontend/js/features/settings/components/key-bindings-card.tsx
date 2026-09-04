import { useTranslation } from 'react-i18next'
import {
  UserSettingsProvider,
  useUserSettingsContext,
} from '@/shared/context/user-settings-context'
import { saveUserSettings } from '@/features/ide-settings/utils/api'
import { UserSettings } from '../../../../../types/user-settings'

const OPTIONS: {
  value: UserSettings['mode']
  label: string
  desc: string
}[] = [
  {
    value: 'default',
    label: 'Default (Overleaf)',
    desc: 'The current standard editor keybindings (Ctrl/Cmd + …).',
  },
  {
    value: 'vim',
    label: 'Vim',
    desc: 'Vim emulation mode (i, Esc, h/j/k/l, dw, gg, G, / …).',
  },
  {
    value: 'emacs',
    label: 'Emacs',
    desc: 'Emacs emulation mode (C-a, C-e, C-f/C-b, C-k, C-w, M-f …).',
  },
]

function KeyBindingsInner() {
  const { userSettings, setUserSettings } = useUserSettingsContext()
  const { t } = useTranslation()
  const mode = userSettings.mode || 'default'

  const change = (value: UserSettings['mode']) => {
    setUserSettings({ ...userSettings, mode: value })
    saveUserSettings('mode', value)
  }

  return (
    <div className="kb-card">
      <p className="form-text mb-3">{t('keybindings_help')}</p>
      {OPTIONS.map(option => (
        <div className="form-check mb-2" key={option.value}>
          <input
            className="form-check-input"
            type="radio"
            id={`kb-mode-${option.value}`}
            name="kb-mode"
            value={option.value}
            checked={mode === option.value}
            onChange={() => change(option.value)}
          />
          <label
            className="form-check-label ms-2"
            htmlFor={`kb-mode-${option.value}`}
          >
            <strong>{option.label}</strong>{' '}
            <span className="form-text d-block ms-0">
              {option.value === 'default'
                ? t('keybindings_default_desc')
                : option.value === 'vim'
                  ? t('keybindings_vim_desc')
                  : t('keybindings_emacs_desc')}
            </span>
          </label>
        </div>
      ))}
      <p className="form-text mt-3 mb-0">{t('keybindings_applied_note')}<br />{t('keybindings_sublime_note')}</p>
    </div>
  )
}

/**
 * Per-user key bindings (owner request 2026-09-06, live-07 #5): wraps the
 * shared user-settings context (the /user/mysettings page already embeds the
 * `ol-userSettings` meta, and the project list page uses the same pattern),
 * and persists the choice through the standard `saveUserSettings('mode', …)`
 * endpoint. The source editor applies `userSettings.mode` via
 * `setKeybindings()` (use-codemirror-scope.ts) — the same store the project
 * settings "Key bindings" dropdown writes to, so both stay in sync.
 */
export default function KeyBindingsCard() {
  return (
    <UserSettingsProvider>
      <KeyBindingsInner />
    </UserSettingsProvider>
  )
}
