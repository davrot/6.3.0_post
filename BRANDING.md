# OlliTeX branding — owner handoff (2026-09-05)

Fork product name: **OlliTeX**. Replaces all user-visible Overleaf /
ShareLaTeX branding while keeping AGPLv3 provenance intact (per the AGPL
fork-branding checklist).

## What is done (in this repo)
| Surface | Change |
| --- | --- |
| Product name (titles, navbar, emails, i18n) | `overleaf/config/env.sh` exports `OVERLEAF_APP_NAME`/`APP_NAME` = `OlliTeX` (settings.appName flows into page titles, navbar aria/label, email sender, `__appName__` i18n templates). Prod compose also sets it explicitly. |
| Site footer | `thin-footer.tsx` + `thin-footer.pug`: "Powered by Overleaf" → **© 2026 OlliTeX — a fork of Overleaf Community Edition (open source, AGPLv3)** with source links (fork repo → `davrot/6.3.0_post`, upstream → `overleaf/overleaf`); AGPL "AS IS" attribution kept. |
| Fat footer (admin layouts) | `fat-footer-base.pug` copyright line → OlliTeX + fork attribution. |
| Screen-reader logo label | `_mixins/ciam_mixins.pug` "Overleaf" → "OlliTeX". |
| Unsupported-browser page | "Overleaf officially supports…" → "OlliTeX…" (×2). |
| High-visibility i18n strings (en) | `locales/en.json`: welcome/workspace, institutional-login, terms-of-service checkbox, admin email-from hint, linked-file-types hint. (SaaS-only strings — AI Assist, subscriptions, marketing — intentionally left; they never render in CE and rebranding them would fabricate OlliTeX SaaS claims.) |
| PWA manifest | `web.sitemanifest.json` name → "OlliTeX". |
| Root package.json | `name: "overleaf"` → `"ollitex"` (verified: nothing depends on the root package by name). |
| Logo + favicon set | **Placeholder ink monogram** (see Asset swap below). Files: `frontend/js/shared/svgs/overleaf{,-black,-green,-white,-logo,-a-ds-solution-mallard{,-dark}}.svg`, `public/overleaf-logo.svg`, `public/favicon{.svg,-16x16.png,-32x32.png,.ico,-compiled.svg,-compiling.svg,-error.svg}`, `public/mask-favicon.svg`, `public/apple-touch-icon.png`, `public/ol-brand/overleaf-o-dark.svg` + `overleaf_og_logo.png`. |

## Asset swap — drop your final art here (same paths)
Keep the file names (zero code changes needed) or update the imports in:
- `frontend/js/shared/components/navbar/default-navbar.tsx` (white/green)
- `frontend/js/shared/components/interstitial.tsx` (green)
- `frontend/js/features/project-list/components/project-list-ds-nav.tsx` (mallard ± dark)
- `frontend/js/features/share-project/invite.tsx` + `invite-not-valid.tsx` (logo)
- `app/views/user/setPassword.pug` + `passwordReset.pug` (`ol-brand/overleaf-o-dark.svg`)
- `app/views/_metadata.pug` (og logo → `ol-brand/overleaf_og_logo.png`)
Suggested specs: favicon 16/32/48 (`.ico` + PNG), apple-touch 180×180,
mask icon ≥ 700×700 single-color, og card 1200×630.

## What is intentionally NOT renamed (and why)
- `LICENSE` (AGPLv3 text) and all upstream copyright headers — **required to keep**.
- `@overleaf/*` internal package names — import graph; no user-visible effect;
  renaming is high-risk low-value for a fork.
- Mongo DB name `sharelatex` + `OVERLEAF_*` env-var names — internal plumbing;
  renaming risks live-data breakage.
- Upstream attribution in the footer — **kept on purpose**: honest provenance
  (AGPL §7c) + the fork disclaimer is the compliance-positive form.
- SaaS marketing pages (quotes, plans, labs) — not reachable in CE.

## AGPL compliance status
- [x] AGPLv3 kept, upstream headers untouched
- [x] Source link in UI (footer → this fork's repo)
- [x] "fork of Overleaf Community Edition, … by Overleaf" stated visibly (footers)
- [x] AS-IS disclaimer carried forward
- [x] Not implying Overleaf endorsement/support (old "Powered by Overleaf" removed)
- [ ] (owner) trademark search for "OlliTeX" in target markets (external)

## Verify after final logo drop
Rebuild image → `bash tests/e2e/scripts/stack-up.sh` → open
`http://127.0.0.1:7420` (login page favicon/navbar/footer) → login →
project list → confirm title/brand, then `npx playwright test`.
