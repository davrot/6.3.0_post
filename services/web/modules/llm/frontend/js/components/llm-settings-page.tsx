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
                {/* 2026-09-04 (live-06 #6): golden /admin/site layout — one
                    card per settings block (badge pill + title header, muted
                    description, fields in the body), instead of one large
                    flat card. Pinned light surface via llm-settings.scss. */}
                <div className="llm-user-settings">
                    <div className="llm-settings-header">
                        <h1 className="llm-settings-header-title">
                            {t('llm_settings', 'LLM Settings')}
                        </h1>
                        <p className="llm-settings-header-desc">
                            {t(
                                'llm_user_settings_desc',
                                'Your personal AI assistant settings: your own API providers, grammar checking, review rubrics and token usage.'
                            )}
                        </p>
                    </div>

                    <div
                        id="llm-user-general"
                        className="card page-content-card settings-sub-card mb-4"
                    >
                        <div className="card-header">
                            <strong>{t('general_settings', 'General')}</strong>
                        </div>
                        <div className="card-body">
                            <p className="text-muted settings-card-desc">
                                {t(
                                    'llm_general_desc',
                                    'Your own LLM providers and model selection (BYO key). Leave everything off to use the instance configuration only.'
                                )}
                            </p>
                            {/* compact: the General card already carries the title +
                                description — the inner "My LLM providers" header would
                                duplicate it (owner #6b, 2026-09-04). */}
                            <LLMSettingsSection compact initialSettings={user.llmSettings} />
                        </div>
                    </div>

                    {/* overleaf-lab (grammar port): per-user grammar checking
                        (mode + language + blocked rules). The per-project picky
                        toggle lives in the project Settings modal (Spelling
                        section) — it needs a live project context, which this
                        user-scoped page does not provide. */}
                    <div
                        id="llm-user-grammar"
                        className="card page-content-card settings-sub-card mb-4"
                    >
                        <div className="card-header">
                            <strong>{t('grammar_checking', 'Grammar Checking')}</strong>
                        </div>
                        <div className="card-body">
                            <p className="text-muted settings-card-desc">
                                {t(
                                    'grammar_checking_desc',
                                    'Language and grammar feedback while you write. The per-project toggle lives in the project Settings modal.'
                                )}
                            </p>
                            <GrammarSettingsSection />
                        </div>
                    </div>

                    {/* overleaf-lab (2026-08-27, owner request): the compliance
                        review rubrics are USER-SCOPED and configured here, in
                        every user's own LLM settings — the former global admin
                        section is gone. */}
                    <div
                        id="llm-user-compliance"
                        className="card page-content-card settings-sub-card mb-4"
                    >
                        <div className="card-header">
                            <strong>{t('compliance_review', 'Compliance Review')}</strong>
                        </div>
                        <div className="card-body">
                            <p className="text-muted settings-card-desc">
                                {t(
                                    'compliance_review_desc',
                                    'Review rubrics applied by the whole-document AI review ("Run review" in the AI Assistant rail).'
                                )}
                            </p>
                            <LLMComplianceSettings />
                        </div>
                    </div>

                    {/* overleaf-lab (usage meter, 2026-08-28, owner request): my own token
                        usage — both the site lane and my personal BYO rows count. */}
                    <div
                        id="llm-user-usage"
                        className="card page-content-card settings-sub-card mb-4"
                    >
                        <div className="card-header">
                            <strong>{t('llm_usage', 'Usage')}</strong>
                        </div>
                        <div className="card-body">
                            <p className="text-muted settings-card-desc">
                                {t(
                                    'llm_usage_desc',
                                    'Your token usage across the shared instance and your own BYO providers.'
                                )}
                            </p>
                            <LLMUsageMeter scope="user" />
                        </div>
                    </div>
                </div>
            </UserProvider>
        ) : null
    )
}
