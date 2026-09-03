# Plan: transfer docker image diff 6.2.1 → 6.2.2 into overleaf-cep

Input: `../6.2.1-6.2.2/6.2.1-6.2.2.txt` —
`container-diff diff daemon://docker.io/sharelatex/sharelatex:6.2.1 daemon://docker.io/sharelatex/sharelatex:6.2.2 --type=file --type=apt --type=pip --type=history`

Method (per user): **copy the 6.2.2 file over the repo file** — the new image file is
definitive. No 3-way merge.

**Authoritative bucket B list:** every `/overleaf` entry in the diff *after* excluding
build noise:

```
cat 6.2.1-6.2.2.txt | grep "/overleaf" | grep -v node_modules | grep -v ".yarn/cache" \
  | grep -v "/overleaf/.yarn/install-state.gz" | grep -v "/overleaf/yarn.lock.orig" \
  | grep -v "/overleaf/services/web/public/js/" | grep -v "/overleaf/services/web/.cache"
```

Note: even this grep still lets through `*.patch.orig` yarn backups and
`services/web/public/manifest.json` — those are **still bucket C** (not tracked in this repo).
Everything else it prints IS bucket B.

---

## Bucket A — apt / base-image (no action for this repo)

| Signal | Detail |
|---|---|
| "Packages only in 6.2.1" / "only in 6.2.2" | **None** |
| "Version differences" | ~37 packages (openssl, ca-certificates, nginx, curl, python3.12, linux-libc-dev, perl, vim, ...) |
| pip | **None** |
| docker history | **No history lines differ** between the two images → identical build recipe |

**Answer to "ubuntu upgrade vs changed Makefile/Dockerfile?" — it's the former, and NOT a
build-recipe change:**
1. Empty history diff ⇒ both images were built with the same Dockerfile recipe.
2. `server-ce/Dockerfile`/`Dockerfile-base` pin **no** apt package versions (name-only
   `apt-get install`, plus `unattended-upgrade` in the base) and the server-ce Makefiles
   contain no apt logic — so apt point releases are picked up automatically on rebuild.
3. The version diffs are ordinary Ubuntu noble updates between build dates (6.2.1 built
   2026-07-02, 6.2.2 built 2026-07-20), e.g. tzdata 2026a→2026b, ca-certificates
   20240203→20260601, linux-libc-dev 6.8.0-124→134.

> No transfer required for bucket A. Nothing to edit by hand.

---

## Bucket B — source files transferred (13)

| # | Repo path | Notes |
|---|---|---|
| 1 | `services/web/app/src/Features/Project/ProjectController.mjs` | feature flag list (+`group-link-sharing`) |
| 2 | `services/web/app/src/Features/Email/EmailSender.mjs` | `@aws-sdk/client-ses` → SES v2 |
| 3 | `services/web/app/src/Features/Collaborators/CollaboratorsInviteHelper.mjs` | drop debug logging of invite-encryptor options |
| 4 | `services/web/frontend/js/features/share-project-modal/components/project-access.tsx` | `group-link-sharing` feature flag |
| 5 | `services/web/frontend/js/features/share-project-modal/components/share-project-modal.tsx` | `sharing-updates` feature flag; `handleShow` early return |
| 6 | `services/document-updater/app/js/ProjectFlusher.js` | export `_getKeys` (used by new script) |
| 7 | `server-ce/config/settings.js` | `module.exports` → `settings.projectInviteEncryptorOptions` |
| 8 | `package.json` (root) | overrides: form-data 2.5.6, protobufjs 7.6.3, multer patch 2.2.0, ... |
| 9 | `services/web/package.json` | `@aws-sdk/client-ses` → `@aws-sdk/client-sesv2` (exact 3.994.0), `multer` 2.2.0 |
| 10 | `services/clsi/package.json` | `multer` 2.2.0 |
| 11 | `yarn.lock` | full lock update |
| 12 | `.yarn/patches/multer-npm-2.2.0-4ed181c78f.patch` (added; old `multer-npm-2.1.1.patch` removed) | yarn patch rotation |
| 13 | `services/document-updater/scripts/flush_docs_with_pending_updates.js` (**added in 6.2.2**) | new ops script: flush docs stuck in PendingUpdates queue after project flush/hard-delete. Dep (`minimist`) already present. |

All 13 files copied from the 6.2.2 image and byte-verified (`cmp`) against the image.
Commits: `812e43d62a` (transfer) + `21fc50b6d9` (the missed new script).

**Fork divergence (expected, not a defect):** this fork's `yarn.lock`, `package.json` and
several `.mjs`/`.tsx` sources differ from the *official* images of the same version
(fork own pins: `ws 8.21.0`, `vite 7.3.5`, `qs 6.15.2`, `wiki-algolia` workspace, plus
fork feature code). Per the "copy is definitive" decision, the copies carry the official
6.2.2 content; fork-only deltas visible in `git diff 42990788db..21fc50b6d9` are the ones
to re-apply deliberately if they are wanted back.

---

## Bucket C — docker build / runtime artifacts (filtered, no repo action)

| Image path | Why generated |
|---|---|
| `node_modules/**`, `.yarn/cache/**`, `.yarn/install-state.gz` | yarn install cache |
| `.yarn/patches/*.patch.orig` | **yarn patch-apply backups** (docker build byproducts) |
| `services/web/.cache/**`, `public/manifest.json`, `public/js/*-<hash>.js(.map)`, `public/css/**` | webpack/babel build output (manifest.json is **not** git-tracked in this repo) |
| `/root/.cache/**` (Cypress, node-gyp, rosetta), `/tmp/**` | tool/runtime caches |
| `/usr/**`, `/etc/ssl/certs/*`, `/etc/ssh/*`, `/var/**` | apt point-release upgrades (bucket A) |

---

## Execution (this branch `6.2.2`)

```bash
git switch -c 6.2.2
docker run -d --name tmpB sharelatex/sharelatex:6.2.2 sleep 1
#   docker cp tmpB:/overleaf/<each bucket B file> ../extract/622x/<same path>  (mkdir -p first)
docker stop tmpB && docker rm tmpB
# cp over repo files, cmp-verify, git add, commit
```

### Out of scope (explicitly)
- apt upgrades (bucket A) — no Makefile/Dockerfile pins to change
- all bucket C paths above
