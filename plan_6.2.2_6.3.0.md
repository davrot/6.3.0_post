# Handover: 6.3.0_inference (official sharelatex 6.3.0 approximation)

Date: 2026-09-02 — compact of working context

## Goal (user)
Build a fork image **as close as possible to official `sharelatex/sharelatex:6.3.0`** by
iterating: build fork `6.3.0_inference` → `container-diff` vs official → fix deltas → repeat.
Branch: `6.3.0_inference` (NOT pushed; local only).

## Repo state
- `/home/davrot/image_mining/overleaf`, remote `git@github.com:davrot/overleaf-cep.git`
- Branch `6.3.0_inference` at commit `dba961aada` ("Approximate official sharelatex 6.3.0 (iteration 0)", 1803 files):
  - **1421 changed** + **556 added** + **155 deleted** source files copied from official 6.3.0 image (byte-verified with `filecmp`), incl. official `package.json` (yarn@4.18.0, node>=24.18.1), `yarn.lock` (PnP), `.yarnrc.yml` (nodeLinker pnp), `.pnp.register.mjs`, `.yarn/patches` mirrored to official 28-file set, `server-ce/config/settings.js` byte-identical to `/etc/overleaf/settings.js` in the image.
  - **Build recipe port** (official Dockerfile is NOT shipped in the image; reconstructed from `docker history` + container-diff history section):
    - `server-ce/Dockerfile-base`: `REBUILT_AFTER=2026-08-27`, nodesource `node_22.x` → `node_24.x`
    - `server-ce/Dockerfile`: `yarn@4.14.1` → `yarn@4.18.0`; root COPY gains `.pnp.register.mjs`; **`ENV PATH=/overleaf/node_modules/.bin...` REMOVED** (official dropped it); added after compile: `ENV NODE_OPTIONS=--require /overleaf/.pnp.cjs --import /overleaf/.pnp.register.mjs`; added `ENV REQ_VALIDATION_MODE=enforce-log`
- Working tree clean. `plan_*.md` excluded from git (`.git/info/exclude`).
- Fork `server-ce/` static inputs (env.sh, crontab*, nginx*, latexmkrc, logrotate, bin/*, runit, init_scripts, genScript.js, services.js, production.json, custom-environment-variables.json) all **byte-identical** to their official-image destinations (verified).
- Fork `server-ce/init_scripts/` has 12 entries vs official image `/etc/my_init.d` 14 — official extras: `00_regen_ssh_host_keys.sh`, `10_syslog-ng.init` (generated at container startup from phusion prepare scripts, not repo files — likely a non-issue).

## Key data locations
- Official diff: `/home/davrot/image_mining/6.2.2-6.3.0/6.2.2-6.3.0.txt` (117k lines); lists: `FINAL-B.txt` (1421), `FINAL-A-new.txt` (556), `FINAL-A-overlap.txt` (38), `FINAL-D-action.txt` (155 `git rm`'d), `FINAL-D-leave.txt` (308 — root/develop/server-ce files the official 6.3.0 image simply doesn't contain; **keep in fork**, not deletable from diff).
- Full official 6.3.0 filesystem extracted at `/6.3.0_temp/` (from `docker export`); `overleaf/` = image `/overleaf`. `apt-final-versions.txt` inside it: 71 packages touched by the single build-time `unattended-upgrade` (no apt pins in Dockerfile ⇒ apt deltas = build-date OS point releases, **no action needed**, REBUILT_AFTER=2026-08-27).
- Official 6.3.0 base = `phusion/baseimage:noble-1.0.3` (**already pulled**, 90a6ee3709ea per user/`docker images`; official `sharelatex-base` intermediate not public).
- Official recipe for reference: 65 history steps at /tmp/off630_steps.txt; fork Dockerfile steps 17–65 mirror it 1:1.
- Skill: `project:overleaf:sharelatex-image-diff-transfer` (project memory) — includes bucket rules + new "infrastructure release" caveats only partly updated; **update the skill at the end** with the `6.3.0_inference` build-and-diff loop.

## Official 6.3.0 recipe (from history, for the record)
```
(base) phusion noble noble-1.0.3 + apt install list + unattended-upgrade + nodesource node_24.x + TexLive
COPY --parents libraries/*/package.json .yarn/patches/ services/*/package.json tools/migrations/ package.json yarn.lock .yarnrc.yml .pnp.register.mjs /overleaf/
COPY server-ce/genScript.js server-ce/services.js /overleaf/
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable && corepack install -g yarn@4.18.0
ENV COREPACK_ENABLE_NETWORK=0
RUN node genScript install | bash            # generates .pnp.cjs/.pnp.loader.mjs (NOT copied into repo)
COPY --parents libraries/ services/ tools/migrations/ /overleaf/
RUN node genScript compile | bash
ENV NODE_OPTIONS=--require /overleaf/.pnp.cjs --import /overleaf/.pnp.register.mjs
ADD/COPY runit, env.sh, nginx*, logrotate, cron, crontab*, init_scripts, settings.js,
production.json/custom-environment-variables.json (history-v1), bin/grunt, bin/flush-history-queues,
bin/force-history-resyncs, latexmkrc, SITE_MAINTENANCE_FILE, OVERLEAF_CONFIG, WEB_API_USER,
ADMIN_PRIVILEGE_AVAILABLE, OVERLEAF_APP_NAME, OPTIMISE_PDF, REQ_VALIDATION_MODE,
KILL_PROCESS_TIMEOUT, KILL_ALL_PROCESSES_TIMEOUT, GRACEFUL_SHUTDOWN_DELAY_SECONDS, NODE_ENV, LOG_LEVEL
EXPOSE 80
ENTRYPOINT ["/sbin/my_init"]
```
Fork Dockerfile = this recipe with BuildKit `--mount=type=cache` additions on the RUN steps (cache layers, semantically equivalent) — acceptable residual delta until build tests it.

## NEXT STEPS (iteration 1 build)
1. **Build base**: in repo, `make -C server-ce build-base` (uses `Dockerfile-base` via fork Makefile; OVERLEAF_BASE_TAG=`sharelatex/sharelatex-base:6.3.0_inference-<rev>`). Needs `--build-arg BUILDKIT_INLINE_CACHE`, buildkit available (worked for 6.2.x builds before).
   - Sanity: resulting `node --version` should be 24.x.
2. **Build app image**: `make -C server-ce build-community` → tag `sharelatex/sharelatex:6.3.0_inference-<rev>` + `:6.3.0_inference`.
   - **Risk 1**: corepack needs network for `yarn@4.18.0` unless cached (`COREPACK_HOME=/opt/corepack` — not cached here; needs network during build, COREPACK_ENABLE_NETWORK=0 is set *after* install in the official order too — fork Dockerfile already matches official order).
   - **Risk 2**: `genScript install` must succeed with the PnP linker + official `yarn.lock` + `pnpZipBackend: js`. Official worked; fork sources == official sources at that step, so should work. Expect long build (yarn install + webpack compile).
   - **Risk 3**: fork `.dockerignore` (copied to repo root by Makefile `build-base`) — check it doesn't now exclude `.pnp.register.mjs` or `tools/migrations/` (official `COPY --parents` needs: `libraries/*/package.json`, `.yarn/patches/`, `services/*/package.json`, `tools/migrations/`, `package.json`, `yarn.lock`, `.yarnrc.yml`, `.pnp.register.mjs`, `server-ce/*` entries).
3. **Diff** `container-diff diff daemon://sharelatex/sharelatex:6.3.0_inference daemon://docker.io/sharelatex/sharelatex:6.3.0 --type=file --type=apt --type=pip --type=history`; categorize:
   - Expected residuals: apt point-release deltas (build date), `REBUILT_AFTER` env, possibly hash-suffixed public/js chunks (webpack output is deterministic per inputs but cache mount can differ), `.yarn/install-state.gz`, `/etc/overleaf` generated secrets.
   - Actionable residuals: any /overleaf source drift ⇒ re-copy from `/6.3.0_temp`; missing ENV ⇒ add to fork Dockerfile.
4. Iterate until only bucket-A/noise deltas remain. Then push branch + write plan doc (replaces this file) + update skill.

## Gotchas learned this session
- `docker run` with the overleaf image: its `my_init` entrypoint kills `sleep` — use `docker create` + `docker export` (that's how `/6.3.0_temp` was made) or `--entrypoint sh`.
- GNU `tar` `-T memberlist` selects members from an existing tar stream (use `--null` + NUL list).
- 6.3.0 official image dropped: `node_modules` (PnP now), `server-ce/`, `develop/`, doc/.github (recipe change), all hotfix `pr_*` patch steps.
- `.pnp.cjs`/`.pnp.loader.mjs` are **generated** during `yarn install` — never git-tracked, never hand-copied.
- 308 "deleted" entries are NOT upstream deletions (official image just doesn't ship root/develop/server-ce) — do NOT `git rm` those.

## Progress log (2026-08-31 night run, user asleep; approved: full loop, commit+push, cycle overleafserver + logs, keep trying until morning)

### Iteration 1a (first `make all`)
- **base build SUCCEEDED** → `sharelatex/sharelatex-base:6.3.0_inference[-dba961aad…]`; sanity: node **v24.20.0** ✓, tlmgr 79639 (TeXLive 2026) ✓, corepack present, REBUILT_AFTER/TEXMFVAR set ✓, `env` matches official base env set.
- **community build FAILED** on Dockerfile syntax: classic `ENV NODE_OPTIONS=--require /overleaf/.pnp.cjs --import /overleaf/.pnp.register.mjs` is invalid (multi-word value) → `Syntax error - can't find = in "/overleaf/.pnp.cjs"`.
  - **Fix**: JSON array form `ENV ["NODE_OPTIONS", "--require /overleaf/.pnp.cjs --import /overleaf/.pnp.register.mjs"]` (official `docker history` shows multi-word value ⇒ official used JSON form). Committed + pushed.
  - Cross-check vs official image config (docker inspect `sharelatex/sharelatex:6.3.0`): all other ENV lines **already byte-identical** in values (COREPACK_*, SITE_MAINTENANCE_FILE, OVERLEAF_CONFIG, WEB_API_USER, ADMIN_PRIVILEGE_AVAILABLE, OVERLEAF_APP_NAME, OPTIMISE_PDF, REQ_VALIDATION_MODE, KILL_* 55/55, GRACEFUL_SHUTDOWN_DELAY_SECONDS=1, NODE_ENV=production, LOG_LEVEL=info).
- **Iteration 1b** (`make build-community`): running, PID log `/tmp/6.3.0_inference-community-iter1b.log`. Expected long stages: corepack yarn@4.18.0 (network), `node genScript install | bash` (PnP install), `node genScript compile | bash` (webpack).

### Verification path (after image exists)
1. container-diff fork vs `daemon://sharelatex/sharelatex:6.3.0` (file/apt/pip/history) → classify.
2. Cycle shared compose overleafserver (already pointed at `docker.io/sharelatex/sharelatex:6.3.0_inference`): `cd /data_1/docker/compose_cep && sh cycle_overleafserver.sh`, wait health `healthy` (start_period 600s), verify image-id match, check logs (`docker logs`, `/var/log/overleaf/web.log`, `web-api.log`). **Backup mongo sharelatex db (mongodump) BEFORE first cycle.**
3. Optional: browser E2E via CDP harness `psintern.neuro.uni-bremen.de` (raw HTTPS FQDN required; testjoe creds per memory).


### Iteration 1c/1d (converged) — 2026-09-02
Fixes applied (all committed + pushed to 6.3.0_inference @ 02328a0d82):
1. NODE_OPTIONS: quoted legacy `ENV NODE_OPTIONS="--require ... --import ..."` — Docker 29.4.2 buildkit frontend mangles the JSON array form into one garbage entry (`[NODE_OPTIONS,=...]`); classic form cannot hold multi-word. Quoted form round-trips byte-identical to official. (Gotcha: Docker JSON-ENV regression!)
2. Pack race: three codemirror git deps (web devDeps) packed in parallel via Yarn-Classic bootstrap race on the shared classic cache → `cm-buildhelper: not found` (127) under buildkit, persistent via the buildkit cache mount. Fix: pre-stage the 3 official zips in `.yarn/cache` (committed; checksums match yarn.lock; they are also in the official image) → cache hit, no pack. Repro/debug: /tmp/Dockerfile.debug630.
3. `git rm` stale 6.2.x-era `features/settings/components/editor-settings/floating-menu-setting.tsx` + `test/frontend/features/settings-modal/settings/floating-menu-setting.test.tsx` (official 6.3.0 has them only under `features/ide-settings/...`).
4. Compile RUN += `--mount=type=cache,target=/overleaf/services/web/.cache,id=server-ce-babel-cache` → babel .cache (1700 files) no longer baked in (official image has no .cache).
5. Base tag follows git HEAD rev — after commits, re-tag: `docker tag sharelatex/sharelatex-base:6.3.0_inference sharelatex/sharelatex-base:6.3.0_inference-$(git rev-parse HEAD)` before `make build-community`.

**Final container-diff (daemon://sharelatex/sharelatex:6.3.0_inference vs daemon://docker.io/sharelatex/sharelatex:6.3.0, types file/apt/pip/history):**
- History: **None / None** (recipe parity — identical normalized step lines both ways)
- Pip: None; Apt: no package-set diffs, 36 version deltas = noble point releases (build date; REBUILT_AFTER=2026-08-27) — bucket-A noise
- File CHANGED (664): all in /usr /var /etc /run /root/.gnupg (apt point releases + texlive build-date) + **1x /overleaf: .yarn/install-state.gz** (install-generated; expected residual)
- File ADDED official-only (4): /root/.cache/rosetta (2), /tmp/node-compile-cache/v24.20.0-x64-3e691adf-0 (+e6c21f44) — their CI build residue
- File DELETED fork-only (2): /tmp/node-compile-cache/v24.20.0-x64-964aae3f-0 (+e6c21f44) — our build residue; hash dir is machine-dependent, cannot match bytes
=> Only bucket-A/built-artifact noise remains. CONVERGED per plan definition.
**Gotcha:** container-diff caches image extractions in `$HOME/.container-diff` (6.7GB) and REUSES STALE extractions across runs → delete /root/.container-diff (or --no-cache) after any image rebuild before re-diffing!!!

### Live verification on shared overleafserver (user-mandated, 2026-09-02 07:50 UTC)
Safety: DB backed up first: /data_1/docker/compose_cep/overleafserver/data/backups/sharelatex-pre630.archive (12MB gzip).
Cycle: `cd /data_1/docker/compose_cep && sh cycle_overleafserver.sh` (compose file already pinned to sharelatex/sharelatex:6.3.0_inference by user).
- Image-id match: container 6fb8c1c9802f = build sha256:6fb8c1c9802f... (tag sharelatex/sharelatex:6.3.0_inference) ✓
- Health: healthy within ~45s; migrations: "Nothing to migrate / Finished migrations" ✓
- All 14 runit services running: chat, clsi, cron, docstore, document-updater, filestore, history-v1, nginx, notifications, project-history, real-time, sshd, web-api, web
- docker logs: no fatal/error; web.log: only healthcheck traffic; web-api.log heartbeats normal
- HTTP :4000: / = 302 (redirect to login), /login = 200 ✓
- NOTE: shared server now runs 6.3.0_inference instead of bib-editor (user flipped compose.yaml themselves).
