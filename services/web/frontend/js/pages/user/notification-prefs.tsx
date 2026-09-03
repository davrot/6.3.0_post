// 2026-09-03 (S+P, owner): /user/notification-preferences joins the
// user-settings family. This is the page's (intentionally small) JS entry:
// it mounts the SHARED down-left account menu (same component as the golden
// /admin/site sidebar footer) into #notif-prefs-account-root — the navbar
// account pill is hidden by CSS and the menu lives in the down-left corner.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DsPageAccountMenuWithProviders } from '@/shared/components/navbar/ds-page-account-menu';

(() => {
  const el =
    (document.getElementById('notif-prefs-account-root') as HTMLElement | null) ||
    null;
  if (!el) {
    return;
  }
  const root = createRoot(el);
  root.render(
    <DsPageAccountMenuWithProviders rootId="notif-prefs-account-menu" />
  );
})();
