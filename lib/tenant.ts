// Single source of truth for this console instance's tenant id. Each
// BYOC/managed-dedicated deployment is single-tenant, so this only exists so
// the identifier lives in one place instead of a literal repeated across the
// codebase. NEXT_PUBLIC_ is required since client components read this too.
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'default-tenant'
