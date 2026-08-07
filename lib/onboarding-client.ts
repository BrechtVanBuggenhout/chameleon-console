// Replaces the direct-Firestore-access design (lib/gcp-client.ts,
// lib/secrets.ts, both removed): this console never touches Firestore or
// Secret Manager itself. Every call to chameleon-onboarding's
// /api/console-auth/* API carries this deployment's own
// CONSOLE_SERVICE_CREDENTIAL as a bearer token -- onboarding derives
// customerId from *which* credential was presented, never from a
// client-supplied value, so this console can only ever act as its own
// customer account. See chameleon-onboarding/lib/customer-accounts.ts.
const ONBOARDING_SERVICE_URL = process.env.ONBOARDING_SERVICE_URL;
const CONSOLE_SERVICE_CREDENTIAL = process.env.CONSOLE_SERVICE_CREDENTIAL;

export class OnboardingNotConfiguredError extends Error {
  constructor() {
    super("ONBOARDING_SERVICE_URL or CONSOLE_SERVICE_CREDENTIAL is not configured");
  }
}

async function callOnboarding<T>(path: string, init?: RequestInit): Promise<T> {
  if (!ONBOARDING_SERVICE_URL || !CONSOLE_SERVICE_CREDENTIAL) {
    throw new OnboardingNotConfiguredError();
  }

  const res = await fetch(`${ONBOARDING_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONSOLE_SERVICE_CREDENTIAL}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : `onboarding API error ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

/** Requests a magic-link login email for this console's own account. */
export async function requestLogin(email: string, consoleUrl: string): Promise<void> {
  await callOnboarding("/api/console-auth/login", {
    method: "POST",
    body: JSON.stringify({ email, consoleUrl }),
  });
}

export type ClaimResult =
  | { ok: true; email: string; customerId: string }
  | { ok: false; reason: string };

/** Redeems a magic-link token. One-time use -- see onboarding's claimLogin. */
export async function claimLoginToken(token: string): Promise<ClaimResult> {
  return callOnboarding<ClaimResult>("/api/console-auth/claim", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export interface CustomerProjectSummary {
  id: string;
  label: string;
  environment: "dev" | "prod";
  gcpProjectId: string | null;
  region: string | null;
  createdAt: string;
}

export async function listProjects(): Promise<CustomerProjectSummary[]> {
  const { projects } = await callOnboarding<{ projects: CustomerProjectSummary[] }>(
    "/api/console-auth/projects"
  );
  return projects;
}

export interface AddProjectInput {
  label: string;
  environment: "dev" | "prod";
  gcpProjectId?: string;
  region?: string;
  vaultBaseUrl: string;
  tenantId: string;
  vaultApiToken: string;
  vaultRegistryWriteToken?: string;
}

export async function addProject(input: AddProjectInput): Promise<CustomerProjectSummary> {
  return callOnboarding<CustomerProjectSummary>("/api/console-auth/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface ProjectConnection {
  vaultBaseUrl: string;
  tenantId: string;
  vaultApiToken: string;
  vaultRegistryWriteToken: string | null;
}

export async function getProjectConnection(projectId: string): Promise<ProjectConnection | null> {
  try {
    return await callOnboarding<ProjectConnection>(
      `/api/console-auth/project-connection?projectId=${encodeURIComponent(projectId)}`
    );
  } catch {
    return null;
  }
}
