/**
 * Spec-local helpers: per-spec scratch resource ids (deterministic per run,
 * so warm-stack reruns stay idempotent). Fixture identities live in
 * fixtures/credentials.ts — NOT here.
 */
function randomId(): string {
  return Math.random().toString(36).slice(2, 8)
}

/** Unique-ish suffix for spec-owned scratch resources (projects, rows). */
export const RUN_ID = `r${randomId()}`
