# ext_explain.md — what this 6.3.0 fork adds (LLM-readable)

Audience: any LLM/agent working in this tree. Read §2 (cross-cutting
architecture) before touching anything; §1 is the feature map; §3–§5 are
ops. All paths are relative to the repo root.

---

## 0. What this tree is

Overleaf **Community Edition 6.3.0 base** + the "ext" feature set that used
to live on a 6.2.0 fork (`ext-ce-new` and its feature branches), ported by
intent, adapted to 6.3.0 APIs, live-tested, plus 11 rounds of owner feedback.
Repo: `davrot/6.3.0_post`, branch `ext-6.3.0-port`.
Production: `psintern.neuro.uni-bremen.de` (docker compose at
`/data_1/docker/compose_cep/overleafserver/compose.yaml`, `.env` in the parent
dir — the project dir holds a **symlink** `.env -> ../.env`).

Upstream feature sources (ported in order):
`ext-ce` (CE+ base) → `bib-editor` → `ext-ce-llm` → webdav/dropbox/github
(`nextcloud_webdav_integration2b`) → notifications → symbol_palette_v2 →
equation_editor → transplant-image-plugins (svgedit diagrams + equation AI).

---

## 1. Feature inventory

### 1.1 LLM suite (`modules/llm`, `modules/languagetool`)
- **Rail chat** (editor side panel), **Ask AI on PDF log entries**,
  **LLM compile-fix card** (diagnoses LaTeX errors), **inline completion**.
  Frontend under `modules/llm/frontend/js/`; backend
  `modules/llm/app/src/LLM*Controller.mjs`; LLM seam = `LLMClient.mjs`
  (Vercel AI SDK v6, `provider(modelId)` directly callable).
- **BYO providers**: per-user OpenAI-compatible keys + models, stored on the
  user doc (`llmProviders`, `llmApiKey`, …) **AES-256-GCM encrypted at rest**
  with bootstrap key env `LLM_KEY_SECRET` (chicken-and-egg → stays in compose,
  never in the DB). UI: `/user/llm-settings`
  (`llm-settings-page.tsx` + `llm-user-section.tsx` + `llm-instance-settings.tsx`
  admin card) — token values masked `•••` with copy.
- **LLM grammar check** (`languagetool` module): modes LLM / LLM+LT / LT,
  per-user model pick (`grammar` field), quality caveat text in
  `grammar-settings-section.tsx`.
- **Budgets**: Mongo-backed counters (2 node web workers — never assume
  in-memory state is shared). JSON routes return 429 on budget exhaustion.
- **Admin**: `/admin/llm/settings`
  (`llm-admin-settings-page.tsx`) — instance providers, compliance rubrics
  (`llm-compliance-settings.tsx`), usage meter. LLM section keys live in
  `/admin/site` (`llm` store section) and hydrate to
  `LLM_ENABLED`, `LLM_ALLOW_USER_SETTINGS`, `LLM_USER_RATE_PER_MINUTE`,
  `LLM_ADMIN_RATE_PER_MINUTE`, `LLM_USER_DAILY_TOKENS`.
- **Gates (important)**: module loads only if `LLM_ENABLED` or
  `Settings.llm.enabled`; JSON routes + page gate check
  `process.env.LLM_ALLOW_USER_SETTINGS === 'true'` (read at request time —
  do not "fix" to Settings-only, that re-introduces the freeze bug, §2.1).

### 1.2 Custom key bindings (`frontend/js/features/settings` + `shared/keybinding-actions.ts`)
- `/user/mysettings` → Keybindings card (mode radios: Overleaf/Vim/Emacs/Custom)
  + "Customize key bindings" modal (69 actions = 43 registry + 26 editor-tier).
- Two-tier dispatch (`custom-keybindings-activator.tsx`): window capture-phase
  keydown → registry tier (`registry.get(id).handler()`) or editor tier
  (synthetic `KeyboardEvent` on the active view's `contentDOM`,
  `EditorView.findFromDOM`).
- Stored as `user.ace.customKeybindings` (BSON Map) via `POST /user/settings`
  (zod: **must use two-arg `z.record(keySchema, valueSchema)`** — one-arg form
  crashes zod 4.1.11).
- Modal semantics (owner spec): preset row = Overleaf/Vim/Emacs only;
  "Reset now" applies the selected preset, clears overrides, persists, shows
  inline `✓ Applied…` feedback and keeps the modal open.
- "Custom" account mode = alias of `default` base + the user's own bindings.

### 1.3 bib-editor / Library (`modules/bib-editor`)
- `/library` page, bibtex entry editor panel, bulk actions bar
  (select-all + Delete/Restore), import/export, import-from-Zotero
  (`bib-import-from-library.tsx`), reference-picker integration (`modules/reference-picker`).
- Scoped design system (own CSS custom props + `--bib-panel-color`) —
  documented exception in the UI guideline; do not re-style with global tokens.

### 1.4 File syncing: WebDAV + Dropbox + GitHub sync (`modules/webdav`, `modules/dropbox`, `modules/github-sync`, sidecars `services/githubinterface`, `services/dropboxinterface`)
- Project file trees can sync to Nextcloud WebDAV / Dropbox / Git (PAT-based,
  isomorphic-isomorphic Smart HTTP — no OAuth). Per-project state documents
  (`githubSyncProjectStates`, webdav/dropbox user credential docs).
- Credentials encrypted with `CRYPTO_RANDOM` (bootstrap secret — §2.6).
  **Undecryptable credentials must degrade gracefully** (`{connected:false}`),
  never 500 (`WebdavRouter.mjs` status catch is the reference).
- **GitHub sync workdir contract**: host dir shared by overleafserver AND
  githubinterface; `GITHUBINTERFACE_WORKDIR_ROOT` env on the web container
  (web computes the dir, sidecar validates it). Data dir: `./data/ghif`
  (migrated out of the old location; no compose bind for it).
- `modules/github-sync/index.mjs` self-hydrates its env section before
  reading config (order-safety pattern, §2.1).

### 1.5 Notifications (`modules/notifications` + sidecar `services/notifications`)
- In-app notification rail + `/user/notification-preferences` page.
- Emails: **NO "tracked changes" email to the author**; enqueue delay
  1–10080 min (`misc.projectNotificationDelayMinutes` in site settings),
  fallback 120 s; `server-ce/cron/project-notification-enqueue.sh` provides
  the standalone process env (must source the stable secrets, §2.6).

### 1.6 Editor extras
- **Symbol palette v2** (`modules/symbol-palette` +
  `ide-react/components/editor/symbol-palette-rail-entry.tsx`,
  `stylesheets/modules/symbol-palette.scss`).
- **Equation editor** (math editing flow + equation AI via LLM).
- **Diagrams** (`modules/diagram` + `services/web/…svgedit@7.4.2` — full
  svgedit, reproducing svgedit.netlify.app layout; `visual-editor-provider.js`).
- **Equation/diagram image plugins** (transplant-image-plugins port):
  `toast-image`, `latex-editor`, `diagram` visual editing inside the editor.

### 1.7 Admin & site console (`modules/admin-tools`, `modules/instance-stats`, `modules/page-shells`)
- `/admin/site` = **Manage Extensions** (golden console, red admin chrome):
  tabs Sandboxed compiles / Git integration / GitHub sync / WebDAV / Dropbox /
  LLM(gone — moved to /user/llm-settings) / Templates / Services / Misc /
  Branding / Email. All values persist in Mongo `site_settings` collection,
  section-keyed, and hydrate to process env at boot (§2.1).
- **Site-settings hydration architecture (the load-bearing piece)**:
  `app/src/Features/SiteSettings/EnvHydrator.mjs` reads `site_settings`,
  writes `process.env.*`, then bumps the settings stamp (§2.1).
- `/admin/panel` (Manage Site), `/admin/user`, `/admin/project`
  (red chrome), `/admin/instance-stats` (charts in light-pinned cards),
  `/templates/manage`.
- **page-shells** module: shared golden shell (left column section links +
  down-left shared account menu w/ theme toggle) reused by
  llm-settings / llm-admin-settings / notification-prefs / mysettings.

### 1.8 Compile stack
- `clsi` (compile service interface) — `.mjs`-gated config
  (`services/clsi/config/settings.defaults.cjs`).
- **git-bridge** (`services/git-bridge`, Java) built inside the image via
  `server-ce/Makefile` target `build-git-bridge` (builder container) and
  deployed alongside; `modules/git-bridge` web-side glue. Live in production.
- `pandoc` conversions (Word/MD export + New-project import) — gated by
  `enablePandocConversions` (`pandoc` store section → `ENABLE_PANDOC_CONVERSIONS`).

### 1.9 Other
- `full-project-search`, `launchpad`, `orcid-picker`, `sandboxed-compiles`,
  `track-changes`, `toast-image`, `template-gallery` (user + admin),
  `user-activate`, `registration-page`, `authentication` (CE+ auth extras).

---

## 2. Cross-cutting architecture (READ BEFORE CHANGING)

### 2.1 Settings hydration (R11 architecture — do not regress)
- `services/web/config/settings.defaults.js` reads `process.env` at build
  time. It is exported through a **stamp-based lazy proxy**:
  - `buildSettings()` builds the object; `_settings()` caches per stamp.
  - `globalThis.OL_SETTINGS_REBUILD()` (called by `EnvHydrator.applyEntries`
    after stored values land in env) bumps the stamp → next access rebuilds.
  - **`OL_SETTINGS_REAPPLIES`**: every `mergeWith(ext)` registers a
    re-apply; **`OL_SETTINGS_ASSIGNED`**: the proxy SET-trap remembers
    whole-section assignments (`Settings.llm = {...}`). Rebuild re-applies
    both → `/etc/overleaf/settings.js` overrides (sessionSecret) and module
    sections (LLM/webdav/dropbox) survive; env-driven defaults re-read.
  - `mergeWith` returns the **proxy**, never the frozen built object.
- `libraries/settings/Settings.js` uses `mergeWith` when available.
- **Rules**: (a) never assume `Settings` values are stable after boot —
  request-time readers should prefer `process.env` for the same key where
  available; (b) module self-hydration idiom:
  `await ensureEnvForSection('<section>')` right before reading env
  (llm/webdav/dropbox/github-sync index.mjs); (c) if you add a store section,
  extend the `EnvHydrator` section map + `site_settings` admin UI together.
- Container-validated behavior: boot secret ✓, module section ✓, post-hydration
  pandoc ✓ + secrets ✓ (keep this chain in mind when refactoring).

### 2.2 i18n pipeline (CRITICAL — silent breakage otherwise)
- `frontend/translations-loader.js` emits ONLY keys present in
  `frontend/extracted-translations.json`; `locales/en.json` supplies values.
- **Flat-key policy** (no nesting); `t('key', 'Fallback')` two-arg form —
  the fallback renders even when the key isn't listed, but add both files for
  translatability en.json + extracted-translations.json.
- i18next `keySeparator: false`. **NEVER use `{{count}}` interpolation**
  (loader strips it) — build plurals in JS.
- i18next-scanner writes dotted keys nested — flatten when regenerating.

### 2.3 Mongoose / models (systemic)
- `User` schema is **strict: true** — unmodeled paths are stripped on write
  AND read. Module fields (llmProviders, grammar, …) **must** be declared in
  `app/src/models/User.mjs` or they silently vanish.
- Real user collection is **`users`** (plural); `user` (singular) is legacy
  and EMPTY — probes must query `db.users`.
- `Map` values (e.g. `ace.customKeybindings`) serialize to BSON sub-documents.

### 2.4 zod 4.1.11 gotcha
- One-arg `z.record(valueType)` is BROKEN (`def.valueType` undefined → any
  non-empty `.parse()`/`.safeParse()` throws). Always
  `z.record(keySchema, valueSchema)`. (`UserController.mjs:416` fixed.)

### 2.5 Frontend rules
- **React #137**: never put `<option>`/children inside
  `OLFormControl type="select"` — use native `<select className="form-select">`.
- `fetch-json.ts` helpers **swallow AbortError** (promise never settles) —
  pass `swallowAbortError: true` or use raw fetch + AbortController.
- Express: **static routes before `:param` routes**; async handlers need
  `expressify` from `@overleaf/promise-utils` (never wrap sync handlers).
- LLM dark-mode contrast: use `--content-primary-themed` (inverts with theme),
  never `--content-primary` (theme-agnostic ink).
- Theme system: `body[data-theme='default' | 'light']`; `-themed` token set
  (`--bg-primary-themed`, `--content-*`, `--border-*`); GOLD cards
  (`.ce-admin-card, .page-content-card`) **pinned light in both themes**
  (dark ink inside) — owner-fixed. Full rulebook:
  `../changes/ui-design-guideline.md` (sibling of the repo).

### 2.6 Secrets & env (bootstrap vs admin-managed)
- **Bootstrap (compose/.env, stable across container recreates):**
  `CRYPTO_RANDOM`, `WEB_API_PASSWORD`, `OT_JWT_AUTH_KEY`,
  `OVERLEAF_SESSION_SECRET` (cookie signing), `LLM_KEY_SECRET` (BYO key
  AES-256-GCM at-rest), `GITHUB_SYNC_CLIENT_ID/SECRET` (PAT-based GitHub sync;
  stored mirrored in `site_settings.github-sync` for admin UI), Mongo/Redis URLs,
  site URL/proxy flags.
  - `server-ce/init_scripts/100_generate_secrets.sh` is **per-file
    idempotent** — env-provided files are NEVER overwritten. Do not "simplify"
    back to the all-or-nothing block (it rotated CRYPTO_RANDOM on every
    recreate and invalidated all stored encrypted credentials).
  - `server-ce/config/env.sh` sources `/etc/container_environment.sh` so runit
    services inherit the boot secrets (proven necessary: runsv env otherwise
    loses them → "No SESSION_SECRET provided" crash).
- **Admin-managed (site_settings store → hydrate to env at boot; /admin/site UI):**
  pandoc, llm, webdav, dropbox, github-sync, languagetool, sandboxed-compiles,
  templates, branding, email, misc, services, linked-file-types.
  Owner rule: don't duplicate managed keys as compose env.
- **Rotation consequence**: credentials encrypted under a rotated key are
  unrecoverable → UX must degrade gracefully (re-link flows), never 500.

### 2.7 Yarn PnP
- Build/dev use PnP (`.pnp.cjs`); in-container node runs with
  `NODE_OPTIONS="--require /overleaf/.pnp.cjs --import /overleaf/.pnp.register.mjs"`.
- Consumer+workspaces rule honored; cross-package requires resolve by issuer
  (settings library uses `createRequire` anchored at the config file for the
  same reason).

---

## 3. Services & sidecars (in-container runit)

Everything runs inside the overleafserver container under runsv/runit
(`server-ce/runit/*-overleaf`). Microservice interfaces (githubinterface,
dropboxinterface, notifications, datamanipulator, history-v1) are reached via
internal URLs from the store/env; they read only `SHARED_SERVICE_TOKEN` + PORT
plus their section env (self-hydrated). `git-bridge` (Java) is a separate
service in the same container, built by `make build-git-bridge`.
Web = 2 node workers (per-process state NOT shared — Mongo for shared state).
External access: nginx :4000 → web :4000; all other ports 127.0.0.1.

---

## 4. Build & deploy (canonical)

```
cd server-ce
make build-community OVERLEAF_BASE_TAG=sharelatex/sharelatex-base:ext-6.3.0-port-16a93ea66a74bf03885b8502fb93d9d766b36795
# → docker.io/sharelatex/sharelatex:ext-6.3.0-port-<gitsha> (also tags :ext-6.3.0-port)
cd /data_1/docker/compose_cep/overleafserver
docker compose down overleafserver && docker compose up -d overleafserver
curl -sk -o /dev/null -w "%{http_code}\n" https://psintern.neuro.uni-bremen.de/login   # expect 200
```
- **Webpack must be GREEN (0 `ERROR in`) after every frontend change.**
- **Never `docker add` blindly**: skip `.yarn/cache`, `node_modules`, `.pnp.*`,
  `dist`, `build`, `artifacts`.
- Container recreate is routine but resets the writable layer — anything
  hot-patched via `docker cp` is LOST on recreate; bake into the image instead.
- **Never start/stop containers while another agent works a different overleaf
  tree on this host** (owner rule; shared ports).

---

## 5. Testing

- Live verify scripts: `/tmp/oltest/*.mjs` (Playwright, headless, TLS
  ignoreHTTPSErrors). `r11_verify.mjs` = 19-check Round-11 battery.
  Login: `#email`/`#password`, post-login `/project`; CSRF via
  `X-CSRF-TOKEN: meta[name=ol-csrfToken]` on POST.
- E2E gotchas: hit the real domain (127.0.0.1:4000 may differ); login POST
  needs `X-Forwarded-Proto: https` (csurf) when using curl; CSRF token
  rotates after login (re-GET before POST); undici rejects Secure cookies on
  non-TLS (use browser context).
- In-repo tests: `services/web/test/unit/*` (vitest); LLM frontend
  `vitest.llm-frontend.config.js` (needs `globalThis.React` shim).
- **Regression suites (in-repo, pinned 2026-09)** — owner queue items, all GREEN:
  - BYO save: `modules/llm/test/unit/src/LLMCrypto.regression.test.mjs`
    (encrypt→decrypt round-trip, `enc:v1:` format, GCM tamper → fail-closed `''`,
    legacy migration, graceful degradation without LLM_KEY_SECRET)
    + `modules/llm/test/unit/src/LLMByoSave.regression.test.mjs`
    (`POST /user/llm-providers`: ciphertext at rest, masked response, 400/403 gates).
  - Zotero schema: `test/unit/src/User/UserExtSchema.regression.test.mjs`
    (strict-mode survival of `refProviders.{zotero,mendeley,papers}` Mixed bag,
    `ace.zotero.*` modeled fields, `ace.customKeybindings` Map, `llmProviders` rows).
  - Compile DockerRunner: `services/clsi/test/unit/js/DockerRunner.regression.test.js`
    (image allow-list gate = no docker call, `$COMPILE_DIR`→`/compile` rewrite,
    `texliveImageNameOveride` registry re-tag, env/CapDrop/SecurityOpt passthrough).
  All use dummy keys only (owner rule: repo files never contain real keys).
  Run: cd services/web && yarn vitest run <file> --config vitest.config.js ;
  cd services/clsi && yarn vitest run --config ./vitest.config.unit.cjs <file>.

---

## 6. Known limitations / open items

1. WebDAV/Dropbox credentials encrypted under pre-stabilization rotated keys
   are unrecoverable (owner re-links; status degrades gracefully).
2. LLM small-model quality caveat is surfaced in the UI (grammar section) —
   by design, not a bug.
3. UI design system is documented in `changes/ui-design-guideline.md`
   (sibling dir) — keep the two files consistent when design rules change.
4. Schema duality in `User.mjs` (both are live-tested): top-level
   `refProviders.{zotero,mendeley,papers}` = Mixed free-form bag (live zotero
   TokenManager path) vs `ace.zotero.*` = fully modeled typed fields. Don't
   "merge" these without checking both the zotero TokenManager and the
   frontend refProvider writers — pinned by UserExtSchema.regression test.
