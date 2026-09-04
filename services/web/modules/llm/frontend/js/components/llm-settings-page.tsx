import React from 'react'
import { useTranslation } from 'react-i18next'
import getMeta from '@/utils/meta'
import LLMSettingsSection from './llm-settings-section'
import LLMComplianceSettings from './llm-compliance-settings' // overleaf-lab (2026-08-27): user-scoped review rubrics
import LLMUsageMeter from './llm-usage-meter' // overleaf-lab (usage meter)
// overleaf-lab (grammar port): per-user grammar-checking settings (mode/language/
// blocked rules). The per-project picky toggle renders in the project Settings
// modal (it needs a live project context; this user-scoped page has none).
import GrammarSettingsSection from '../../../../languagetool/frontend/js/grammar-settings-section'
import OLPageContentCard from '@/shared/components/ol/ol-page-content-card'
import { UserProvider } from '@/shared/context/user-context'
import useWaitForI18n from '@/shared/hooks/use-wait-for-i18n'
import useScrollToIdOnLoad from '@/shared/hooks/use-scroll-to-id-on-load'
// overleaf-lab: BYO table/editor styles were only imported by the admin page,
// so this page shipped with zero module CSS — import the shared stylesheet here too.
import '../../stylesheets/llm-settings.scss'
// overleaf-lab: shared upstream-AI design tokens (--wf-*) used by the settings chrome
import '../../stylesheets/llm-ui.scss'

export default function LLMSettingsPage() {
    const { t } = useTranslation()
    const { isReady } = useWaitForI18n()
    useScrollToIdOnLoad()
    const user = getMeta('ol-user') || {}

    // 2026-09-04 (R5#2, owner round-5): this component renders CONTENT ONLY.
    // The page chrome — navbar, the golden left column with the section
    // links, the down-left SHARED account menu (Theme toggle) — is the
    // /admin/site golden shell (modules/llm/app/views/llm-settings.pug +
    // page-shells/pages/ds-settings-shell). The old custom 220px sidebar,
    // the in-page DsPageAccountMenu and the OLRow/OLCol centering are gone.
    return (
        isReady ? (
            <UserProvider>
                <OLPageContentCard className="llm-user-settings__content">
                    <div className="page-header">
                        <h1>{t('llm_settings', 'LLM Settings')}</h1>
                    </div>
                    <div id="llm-user-general">
                        <LLMSettingsSection initialSettings={user.llmSettings} />
                    </div>
                    {/* overleaf-lab (grammar port): per-user grammar checking
                        (mode + language + blocked rules). The per-project picky
                        toggle lives in the project Settings modal (Spelling
                        section) — it needs a live project context, which this
                        user-scoped page does not provide. */}
                    <div className="ol-llm-admin-settings__mt-xl" id="llm-user-grammar">
                        <h2>{t('grammar_checking', 'Grammar Checking')}</h2>
                        <GrammarSettingsSection />
                    </div>
                    {/* overleaf-lab (2026-08-27, owner request): the compliance
                        review rubrics are USER-SCOPED and configured here, in
                        every user's own LLM settings — the former global admin
                        section is gone. */}
                    <div className="ol-llm-admin-settings__mt-xl" id="llm-user-compliance">
                        <h2>{t('compliance_review', 'Compliance Review')}</h2>
                        <LLMComplianceSettings />
                    </div>
                    {/* overleaf-lab (usage meter, 2026-08-28, owner request): my own token
                        usage — both the site lane and my personal BYO rows count. */}
                    <div className="ol-llm-admin-settings__mt-xl" id="llm-user-usage">
                        <h2>{t('llm_usage', 'Usage')}</h2>
                        <LLMUsageMeter scope="user" />
                    </div>
                </OLPageContentCard>
            </UserProvider>
        ) : null
    )
}
