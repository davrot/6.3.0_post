import Path from 'path'
import { fileURLToPath } from 'node:url'
import { expressify } from '@overleaf/promise-utils'
import Settings from '@overleaf/settings'
import SessionManager from '../../../../app/src/Features/Authentication/SessionManager.mjs'
import { User } from '../../../../app/src/models/User.mjs'
import UserSettingsHelper from '../../../../app/src/Features/Project/UserSettingsHelper.mjs'

const __dirname = Path.dirname(fileURLToPath(import.meta.url))

// Same derivation as admin-tools UserListController (the Users manager's
// new-user form reads these at module level and crashes without them).
const externalAuth = process.env.EXTERNAL_AUTH
  ? process.env.EXTERNAL_AUTH.split(/\s+/).filter(m => m && m !== 'none')
  : []
const availableAuthMethods = ['local', ...externalAuth]
const userIsAdminUpdatedOnLogin = Object.fromEntries(
  availableAuthMethods.map(m => [
    m,
    Boolean(Settings[m]?.attAdmin) && Boolean(Settings[m]?.valAdmin),
  ])
)
const userDetailsUpdatedOnLogin = Object.fromEntries(
  availableAuthMethods.map(m => [
    m,
    Boolean(Settings[m]?.updateUserDetailsOnLogin),
  ])
)

/**
 * OlliTeX hub (Option B, owner 2026-09-06): two unified pages.
 *   /hub/admin      — all admin items on one page
 *   /hub/workspace  — /project + /library + /templates on one page
 * Existing standalone pages keep working; the hubs are the preferred
 * surface (linked from the nav bar).
 */
async function buildLocals(req, res) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  const user = userId ? await User.findById(userId, 'ace') : null
  const userSettings = user
    ? await UserSettingsHelper.buildUserSettings(req, res, user)
    : {}
  return {
    userSettings,
    availableAuthMethods,
    userIsAdminUpdatedOnLogin,
    userDetailsUpdatedOnLogin,
  }
}

export default {
  adminHubPage: expressify(async (req, res) => {
    const locals = await buildLocals(req, res)
    res.render(
      Path.resolve(__dirname, '../views/admin-hub'),
      {
        title: 'OlliTeX Admin',
        ...locals,
      }
    )
  }),

  workspaceHubPage: expressify(async (req, res) => {
    const locals = await buildLocals(req, res)
    res.render(
      Path.resolve(__dirname, '../views/workspace-hub'),
      {
        title: 'OlliTeX Workspace',
        ...locals,
      }
    )
  }),
}
