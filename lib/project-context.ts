import { cookies } from "next/headers";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "./session";
import { listProjects, getProjectConnection, type ProjectConnection } from "./onboarding-client";
import { TENANT_ID } from "./tenant";

const SELECTED_PROJECT_COOKIE = "selected_project_id";

// The break-glass/operator fallback: this deployment's own Terraform-wired
// single-project config (console.tf), exactly what every console used
// exclusively before the multi-project account system existed. Reachable
// only via the console_auth password cookie (see proxy.ts) -- a real
// customer session always resolves through onboarding's per-project
// registry instead. Deliberately not scoped to any customerId: this is
// "the one project this specific deployment has always pointed at",
// independent of the account system entirely.
const STATIC_VAULT_BASE_URL = process.env.VAULT_BASE_URL;
const STATIC_VAULT_API_TOKEN = process.env.VAULT_API_TOKEN;
const STATIC_VAULT_REGISTRY_WRITE_TOKEN = process.env.VAULT_REGISTRY_WRITE_TOKEN;
const CONSOLE_PASSWORD = process.env.CONSOLE_PASSWORD;

export interface ActiveProjectContext {
  projectId: string | null; // null for the static/break-glass fallback
  vaultBaseUrl: string;
  tenantId: string;
  vaultApiToken: string | undefined;
  vaultRegistryWriteToken: string | undefined;
}

export interface ActiveSession {
  customerId: string;
  email: string;
}

/** The signed-in human, if any -- independent of which project is selected. */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const cookieStore = await cookies();
  const session = await verifySessionCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;
  return { customerId: session.customerId, email: session.email };
}

function staticContext(): ActiveProjectContext | null {
  if (!STATIC_VAULT_BASE_URL) return null;
  return {
    projectId: null,
    vaultBaseUrl: STATIC_VAULT_BASE_URL,
    tenantId: TENANT_ID,
    vaultApiToken: STATIC_VAULT_API_TOKEN,
    vaultRegistryWriteToken: STATIC_VAULT_REGISTRY_WRITE_TOKEN,
  };
}

/**
 * Resolves which Key Vault backend the current request should talk to.
 * proxy.ts already gates every route to require either a real session or
 * the operator password cookie -- this is the second half of that: given
 * one of those two, decide *which* project's connection details apply.
 *
 * A real customer session always wins when present (an operator with a
 * stale console_auth cookie sitting alongside an expired session should
 * still get their own account's projects, not the deployment default).
 * Falls back to the static Terraform-wired config only for genuine
 * break-glass access (console_auth cookie, no session) or for deployments
 * that were never registered into the account system at all.
 */
export async function getActiveProjectContext(): Promise<ActiveProjectContext | null> {
  const session = await getActiveSession();

  if (session) {
    const cookieStore = await cookies();
    let projectId = cookieStore.get(SELECTED_PROJECT_COOKIE)?.value;

    if (!projectId) {
      const projects = await listProjects();
      const first = projects[0];
      if (!first) return staticContext();
      projectId = first.id;
    }

    const connection = await getProjectConnection(projectId);
    if (!connection) return staticContext();
    return {
      projectId,
      vaultBaseUrl: connection.vaultBaseUrl,
      tenantId: connection.tenantId,
      vaultApiToken: connection.vaultApiToken,
      vaultRegistryWriteToken: connection.vaultRegistryWriteToken ?? undefined,
    };
  }

  // No session -- only reachable here at all if proxy.ts's break-glass
  // password check already passed.
  if (!CONSOLE_PASSWORD) return staticContext();
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("console_auth");
  if (authCookie?.value !== CONSOLE_PASSWORD) return null;
  return staticContext();
}

export { SELECTED_PROJECT_COOKIE };
export type { ProjectConnection };
