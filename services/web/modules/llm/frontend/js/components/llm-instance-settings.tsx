import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import getMeta from '@/utils/meta'
import {
  FetchError,
  getJSON,
  getUserFacingMessage,
  putJSON,
} from '@/infrastructure/fetch-json'

/**
 * 2026-09-09 (owner R11 #11): the LLM *instance* settings live on the
 * /user/llm-settings page, together with all the other LLM settings
 * (BYO providers, grammar, rubrics, usage).
 *
 * Values come from the same admin-managed `llm` section as the old
 * /admin/site tab (GET/PUT /admin/site-settings[/llm]); admins see this
 * card, other users never do. Checkboxes use the /admin/site
 * form-check style (owner rule).
 */
type LlmSection = {
  enabled?: boolean
  allowUserSettings?: boolean
  userRatePerMinute?: number
  adminRatePerMinute?: number
  userDailyTokens?: number
  [key: string]: unknown
}

export default function LLMInstanceSettings () {
  const { t } = useTranslation()
  const [values, setValues] = useState<LlmSection | null>(null)
  const [flash, setFlash] = useState(
    { saving: false, saved: false, error: null } as {
      saving: boolean
      saved: boolean
      error: string | null
    }
  )

  useEffect(() => {
    let cancelled = false
    getJSON<Record<string, LlmSection>>('/admin/site-settings')
      .then(data => {
        if (!cancelled) setValues(data && data.llm ? data.llm : {})
      })
      .catch(() => {
        if (!cancelled) setValues(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!values) return null

  const enabled = values.enabled !== false
  const allowUser = values.allowUserSettings !== false
  const userRate = String(values.userRatePerMinute ?? 10)
  const adminRate = String(values.adminRatePerMinute ?? 0)
  const userDaily = String(values.userDailyTokens ?? 0)

  const set = (patch: LlmSection) => setValues({ ...values, ...patch })

  const save = async () => {
    setFlash({ saving: true, saved: false, error: null })
    try {
      await putJSON('/admin/site-settings/llm', {
        body: {
          enabled,
          allowUserSettings: allowUser,
          userRatePerMinute: parseInt(userRate, 10) || 0,
          adminRatePerMinute: parseInt(adminRate, 10) || 0,
          userDailyTokens: parseInt(userDaily, 10) || 0,
        },
      })
      setFlash({ saving: false, saved: true, error: null })
    } catch (err) {
      setFlash({
        saving: false,
        saved: false,
        error:
          err instanceof FetchError
            ? getUserFacingMessage(err)
            : 'Saving instance LLM settings failed',
      })
    }
  }

  return (
    <div
      id="llm-instance-settings"
      className="card page-content-card settings-sub-card mb-4"
      style={{ background: '#faf6ee' }}
    >
      <div className="card-header">
        <strong>{t('llm_instance_title', 'Instance LLM settings (admin)')}</strong>
      </div>
      <div className="card-body">
        <p className="form-text mb-3">
          {t(
            'llm_instance_desc',
            'Instance-wide LLM flags (was the /admin/site "LLM (instance)" tab). The master switch is read when the web service starts; rate limits and the BYO flag apply to new calls right away.'
          )}
        </p>

        <div className="form-check mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            id="llm-instance-enabled"
            checked={enabled}
            onChange={e => set({ enabled: e.currentTarget.checked })}
          />
          <label className="form-check-label" htmlFor="llm-instance-enabled">
            {t('llm_instance_enabled', 'LLM features enabled (Ask AI, LLM grammar, review)')}
          </label>
        </div>
        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="llm-instance-allowuser"
            checked={allowUser}
            onChange={e => set({ allowUserSettings: e.currentTarget.checked })}
          />
          <label className="form-check-label" htmlFor="llm-instance-allowuser">
            {t(
              'llm_instance_allowuser',
              'Allow users to bring their own API provider (BYO keys)'
            )}
          </label>
        </div>

        <div className="row mb-3">
          <div className="col-md-4">
            <label className="form-label" htmlFor="llm-instance-user-rate">
              {t('llm_instance_user_rate', 'User request rate (per minute)')}
            </label>
            <input
              id="llm-instance-user-rate"
              className="form-control"
              type="number"
              min="0"
              value={userRate}
              placeholder="10"
              onChange={e => set({ userRatePerMinute: parseInt(e.currentTarget.value, 10) || 0 })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="llm-instance-admin-rate">
              {t('llm_instance_admin_rate', 'Admin request rate (0 = unlimited)')}
            </label>
            <input
              id="llm-instance-admin-rate"
              className="form-control"
              type="number"
              min="0"
              value={adminRate}
              placeholder="0 (unlimited)"
              onChange={e => set({ adminRatePerMinute: parseInt(e.currentTarget.value, 10) || 0 })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="llm-instance-daily">
              {t('llm_instance_daily', 'User daily token budget (0 = unlimited)')}
            </label>
            <input
              id="llm-instance-daily"
              className="form-control"
              type="number"
              min="0"
              value={userDaily}
              placeholder="0 (unlimited)"
              onChange={e => set({ userDailyTokens: parseInt(e.currentTarget.value, 10) || 0 })}
            />
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={flash.saving}
            onClick={() => void save()}
          >
            {t('save', 'Save')}
          </button>
          {flash.saved && (
            <span className="text-success" role="status">
              {t('llm_instance_saved', 'Saved')}
            </span>
          )}
          {flash.error && (
            <span className="text-danger" role="alert">
              {flash.error}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
