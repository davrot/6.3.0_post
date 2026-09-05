# External-service credentials (local only)

Everything in this folder that is **not** `config.json.example`, `external.ts`,
or this README contains **real secrets and is git-ignored**. Nothing here ever
leaves your machine.

## Layout

| Path                        | Purpose                                                        | Committed? |
|-----------------------------|----------------------------------------------------------------|------------|
| `config.json.example`       | template — the required fields per service                      | yes        |
| `config.json`               | YOUR local values (cp from example)                             | **no**     |
| `external.ts`               | typed loader + token-cache helpers used by the specs            | yes        |
| `.auth/<service>.json`      | cached short-lived tokens (0600) with `expiresAt`               | **no**     |

## Setup

```sh
cd tests/e2e
cp credentials/config.json.example credentials/config.json
$EDITOR credentials/config.json        # fill in + flip "enabled": true
npx playwright test specs/external-probe.test.e2e.ts   # live-check only the enabled services
```

No `config.json` → every external spec **skips** and the rest of the suite runs
unchanged. Nothing in the suite breaks when a service is absent or disabled.

## What goes where (the "dynamic key" question)

**Stable secrets** (passwords, personal-access tokens — valid until revoked):
→ `config.json`. Examples: GitHub/Gitea/Forgejo/GitLab PATs, a WebDAV app
password, a Zotero API key, a persistent LLM provider API key.

**Ephemeral keys** (issued *after* a one-time login, valid "for some hours",
e.g. Dropbox OAuth tokens, Nextcloud login tokens):
→ do **not** paste them into `config.json`. Two supported paths:

1. **Preferred — mint per run:** keep the *stable* credentials in `config.json`
   and let the test mint a fresh token at run time (a `fetch` login against the
   service's token endpoint). Nothing time-limited is ever stored. Add the
   login endpoint to the service block if needed.
2. **OAuth-only services:** run the one-time capture ONCE:
   ```sh
   node scripts/auth-capture.mjs --service dropbox \
        --url "https://www.dropbox.com/oauth2/authorize?client_id=<id>" \
        --token-response "https://api.dropboxapi.com" --ttl 4h
   ```
   Finish the login in the headed browser; the token is caught from the page
   (`--token-selector`) or from the token API response (`--token-response`)
   and cached to `credentials/.auth/dropbox.json` (0600) with an expiry.
   Specs read it via `getServiceToken('dropbox')`, which **throws
   `TokenExpiredError`** (with the exact re-capture command) when the cache
   entry is stale — it can never read silently-expired tokens.

Helpers (imported by specs):

```ts
import { externalEnabled, getExternal, getServiceToken, TokenExpiredError } from '../credentials/external'

test('github sync flow', async ({ page }) => {
  test.skip(!externalEnabled('github'), 'github not configured — see tests/e2e/credentials/README.md')
  const gh = getExternal('github')!
  // gh.baseUrl, gh.username, gh.pat — real values, local only
})

const tok = getServiceToken('dropbox')   // null | {token, obtainedAt, expiresAt}
```

## Rules

- `config.json` + `.auth/` are git-ignored (see `credentials/.gitignore` and the
  tree-level `.gitignore` backup entry). If `git status` ever shows them, stop
  and check — that would be a secret leak.
- `chmod 600 credentials/config.json` is recommended (the loader does not
  depend on it; the token cache is written 0600 by construction).
- Rotate any secret you've shared; a pasted value that was ever on screen in a
  shared session should be treated as burned.
