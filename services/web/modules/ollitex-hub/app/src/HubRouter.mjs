import logger from '@overleaf/logger'
import AuthorizationMiddleware from '../../../../app/src/Features/Authorization/AuthorizationMiddleware.mjs'
import HubController from './HubController.mjs'

export default {
  apply(webRouter) {
    logger.debug({}, 'Init OlliTeX hub router')

    // Option B (owner 2026-09-06): unified admin hub — all admin items on
    // one page (instance, site, users, projects, LLM). Existing /admin/*
    // pages keep working; the hub is the preferred surface (nav bar link).
    webRouter.get(
      '/hub/admin',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      HubController.adminHubPage
    )

    // Workspace hub (owner 2026-09-06): /project, /library, /templates on
    // one page for every logged-in user.
    webRouter.get(
      '/hub/workspace',
      HubController.workspaceHubPage
    )
  },
}
