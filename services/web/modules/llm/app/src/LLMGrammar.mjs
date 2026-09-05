/**
 * 2026-09-09 (R10 #2, live): salvage a possibly TRUNCATED JSON array of
 * flat objects (the model hit its max-output budget mid-array). Tries
 * closing the array at each of the last complete-element boundaries.
 * Returns an array, or null when nothing salvages.
 */
function salvageTruncatedJsonArray (raw) {
    if (!raw || raw.length < 3) return null
    const inner = raw.slice(1) // drop the opening bracket
    // A trailing ']' (present in some truncation shapes) is harmless: the
    // scan closes the array at element boundaries anyway.
    for (let i = inner.length - 1; i >= 0; i -= 1) {
        const ch = inner[i]
        if (ch !== '}' ) continue
        const candidate = '[' + inner.slice(0, i + 1).replace(/,\s*$/, '') + ']'
        try {
            const parsed = JSON.parse(candidate)
            if (Array.isArray(parsed) && parsed.length > 0) return parsed
        } catch (err) {
            /* keep scanning left */
        }
    }
    return null
}

/*
 * LLMGrammar - pure helpers for the editor grammar-checking feature
 * (the LLM lane), shared by LLMChatController (POST /project/:id/llm/grammar)
 * and LLMSettingsController (per-user mode/model/language preferences).
 *
 * Ported from the `llm` branch feature (davrot/overleaf-cep old tree,
 * commit 1df1fc44 "Integrate LanguageTool + LLM grammar checking"). Kept
 * free of app imports so the unit tests can load it in isolation (see
 * app/test/llm-grammar.test.mjs) and the frontend helper
 * (modules/languagetool/frontend/js/utils/grammar-helpers.ts) can mirror
 * the exact degrade/merge rules.
 *
 * Rules (keep in sync with the frontend mirror):
 *   GRAMMAR_MODES          'default' | 'lt' | 'llm' | 'lt+llm'
 *   degradeGrammarMode     a stored mode degrades to the closest feasible
 *                          mode; it is NEVER auto-upgraded
 *   sanitizeGrammarSpans   hard caps so an autonomous (debounced) check can
 *                          never drive unbounded model cost
 *   parseGrammarSuggestions lenient parse of the LLM's JSON reply; suggestions
 *                          are validated against the (possibly truncated)
 *                          span list that was actually sent to the model
 */

import logger from '@overleaf/logger'

export const GRAMMAR_MODES = ['default', 'lt', 'llm', 'lt+llm']

// Hard caps so an automatic (2 s debounced) editor check stays bounded.
export const GRAMMAR_MAX_SPANS = 50
export const GRAMMAR_MAX_TOTAL_CHARS = 15_000

export const GRAMMAR_SYSTEM_PROMPT = [
    'You are a grammar and style corrector for short prose excerpts taken from a LaTeX document.',
    'You only fix grammar, spelling and wording problems. You never change meaning, LaTeX commands, math, formatting, terminology, or tone.',
    'You MUST reply with a single JSON array and nothing else. Each element is an object:',
    '{"id": <span id>, "start": <start offset, inclusive>, "end": <end offset, exclusive>, "original": <exact substring being replaced>, "message": <short explanation>, "suggestion": <corrected replacement for the range start..end>}',
    'Offsets are zero-based character offsets into the raw span text. The "original" field is REQUIRED (it locates the fix when offsets are approximate). Only include spans that actually contain an error. Reply with "[]" when there are no errors.',
].join('\n')

/**
 * Validate a stored mode against availability and degrade to the next best
 * feasible mode (never silently picks a more expensive mode).
 */
export function degradeGrammarMode(mode, availability) {
    const a = availability || {}
    if (!GRAMMAR_MODES.includes(mode)) return 'default'
    if (mode === 'lt+llm') {
        if (a.ltAvailable && a.llmAvailableForUser) return 'lt+llm'
        if (a.ltAvailable) return 'lt'
        if (a.llmAvailableForUser) return 'llm'
        return 'default'
    }
    if (mode === 'lt') return a.ltAvailable ? 'lt' : 'default'
    if (mode === 'llm') return a.llmAvailableForUser ? 'llm' : 'default'
    return 'default'
}

/**
 * Normalize + cap the editor's span list.
 * Returns { spans, totalChars, truncated } or null when `spans` is not an
 * array. Each span becomes { spanId, text }; missing span ids are synthesized
 * (s0, s1, ...) so the reply can always be mapped back by id.
 */
export function sanitizeGrammarSpans(spans) {
    if (!Array.isArray(spans)) return null
    const out = spans.slice(0, GRAMMAR_MAX_SPANS).map((s, i) => {
        const src = s && typeof s === 'object' ? s : {}
        const id = src.spanId ?? src.id
        return {
            spanId: typeof id === 'string' && id ? id : `s${i}`,
            text: typeof src.text === 'string' ? src.text : '',
        }
    })
    let totalChars = out.reduce((n, s) => n + s.text.length, 0)
    let truncated = false
    if (totalChars > GRAMMAR_MAX_TOTAL_CHARS) {
        truncated = true
        const scale = GRAMMAR_MAX_TOTAL_CHARS / totalChars
        for (const s of out) {
            s.text = s.text.slice(0, Math.ceil(s.text.length * scale))
        }
        totalChars = out.reduce((n, s) => n + s.text.length, 0)
    }
    return { spans: out, totalChars, truncated }
}

/**
 * Build the exact [system, user] message pair for a grammar check.
 */
export function buildGrammarMessages(spans) {
    const userPrompt = [
        'Check the following numbered text excerpts for grammar errors. For each excerpt, respond with entries referencing its id.',
        ...spans.map(s => `\n--- id: ${s.spanId} ---\n${s.text}`),
        '',
        'Respond with the JSON array exactly as described.',
    ].join('\n')
    return [
        { role: 'system', content: GRAMMAR_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
    ]
}

/**
 * Parse the strict JSON the grammar LLM is instructed to return. Be lenient:
 * strip code fences and any leading prose, find the first balanced JSON
 * array, and validate every suggestion against the source span bounds.
 */
export function parseGrammarSuggestions(content, spans) {
    const spansById = new Map((spans || []).map(s => [s.spanId, s]))

    const cleaned = (content || '')
        .replace(/```[a-z]*\n?/g, '')
        .trim()
    const start = cleaned.indexOf('[')
    const end = cleaned.lastIndexOf(']')
    if (start === -1) {
        return []
    }
    // 2026-09-09 (R10 #2, live): the reply is often TRUNCATED by the model's
    // max-output budget mid-array — sometimes even without the closing ']'.
    // Candidate = from the first '[' to the last ']' (or end of text when
    // the closing bracket is missing).
    const candidate = end > start
        ? cleaned.slice(start, end + 1)
        : cleaned.slice(start)

    let items
    try {
        items = JSON.parse(candidate)
    } catch (err) {
        // Salvage: close the array at the last complete element boundary.
        items = salvageTruncatedJsonArray(candidate)
        if (items === null) {
            logger.debug(
                { content: String(content || '').slice(0, 500) },
                '[GRAMMAR] Could not parse LLM JSON response'
            )
            return []
        }
    }

    if (!Array.isArray(items)) return []

    const suggestions = []
    for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const span = spansById.get(item.id)
        if (!span) continue
        let start = item.start
        let end = item.end
        let valid =
            typeof start === 'number' && typeof end === 'number' &&
            start >= 0 && end <= span.text.length && end > start
        // 2026-09-09 (R10 #2, live): small models often return slightly-off
        // or missing offsets. Fallbacks: (1) locate the item's `original`
        // substring inside the span text; (2) clamp small offset drift into
        // the legal range. The suggestion stays usable instead of being
        // dropped wholesale.
        if (!valid) {
            const orig = typeof item.original === 'string' ? item.original
                : typeof item.text === 'string' ? item.text : ''
            let found = -1
            if (orig && orig.trim()) {
                const hay = span.text.toLowerCase()
                found = hay.indexOf(orig.toLowerCase())
                if (found === -1) {
                    const words = orig.trim().split(/\s+/)
                    for (let w = Math.min(words.length, 4); w >= 2 && found === -1; w -= 1) {
                        const head = words.slice(0, w).join(' ')
                        if (head.length >= 6) found = hay.indexOf(head.toLowerCase())
                    }
                }
                if (found !== -1) {
                    start = found
                    end = found + orig.length
                    valid = true
                }
            }
        }
        if (!valid) {
            if (typeof start !== 'number' || typeof end !== 'number') continue
            start = Math.max(0, Math.min(Math.round(start), span.text.length - 1))
            end = Math.min(span.text.length, Math.max(Math.round(end), start + 1))
        }
        suggestions.push({
            spanId: item.id,
            start: start,
            end: end,
            message: typeof item.message === 'string' ? item.message : '',
            suggestion: typeof item.suggestion === 'string' ? item.suggestion : '',
        })
    }
    return suggestions
}

export default {
    GRAMMAR_MODES,
    GRAMMAR_MAX_SPANS,
    GRAMMAR_MAX_TOTAL_CHARS,
    GRAMMAR_SYSTEM_PROMPT,
    degradeGrammarMode,
    sanitizeGrammarSpans,
    buildGrammarMessages,
    parseGrammarSuggestions,
}
