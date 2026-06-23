export const overviewFixture = {
  registryCount: 6,
  policyStatus: 'WARN' as const,
  ghostFindingCount: 3,
  lastDeletionProof: {
    userId: 'user_8821',
    timestamp: '2026-06-23T09:14:03Z',
    status: 'CERTIFIED' as const,
  },
}

export type RegistryStatus = 'declared' | 'ghost' | 'policy_warning'
export type Classification = 'HIGH' | 'MEDIUM' | 'LOW'
export type DeletionStrategy = 'key_destroy' | 'row_delete' | 'saas_wipe'

export interface RegistryResource {
  resourceId: string
  system: string
  displayName: string
  piiColumns: { name: string; classification: string }[]
  deletionStrategy: DeletionStrategy
  classification: Classification
  status: RegistryStatus
  scanEnabled: boolean
  ownerConnector: string
}

export const registryFixtures: RegistryResource[] = [
  {
    resourceId: 'bigquery:chameleon-dev.chameleon_dev.stg_users',
    system: 'bigquery',
    displayName: 'stg_users',
    piiColumns: [
      { name: 'email', classification: 'EMAIL' },
      { name: 'phone_number', classification: 'PHONE' },
      { name: 'first_name', classification: 'NAME' },
      { name: 'last_name', classification: 'NAME' },
    ],
    deletionStrategy: 'key_destroy',
    classification: 'HIGH',
    status: 'declared',
    scanEnabled: true,
    ownerConnector: 'dbt',
  },
  {
    resourceId: 'bigquery:chameleon-dev.chameleon_dev.stg_orders',
    system: 'bigquery',
    displayName: 'stg_orders',
    piiColumns: [
      { name: 'billing_address', classification: 'ADDRESS' },
      { name: 'shipping_address', classification: 'ADDRESS' },
    ],
    deletionStrategy: 'row_delete',
    classification: 'MEDIUM',
    status: 'declared',
    scanEnabled: true,
    ownerConnector: 'dbt',
  },
  {
    resourceId: 'bigquery:chameleon-dev.chameleon_dev.analytics_sessions',
    system: 'bigquery',
    displayName: 'analytics_sessions',
    piiColumns: [
      { name: 'ip_address', classification: 'IP_ADDRESS' },
    ],
    deletionStrategy: 'row_delete',
    classification: 'LOW',
    status: 'declared',
    scanEnabled: true,
    ownerConnector: 'pipelines',
  },
  {
    resourceId: 'bigquery:chameleon-dev.chameleon_dev.marketing_events',
    system: 'bigquery',
    displayName: 'marketing_events',
    piiColumns: [
      { name: 'session_id', classification: 'IDENTIFIER' },
    ],
    deletionStrategy: 'row_delete',
    classification: 'MEDIUM',
    status: 'policy_warning',
    scanEnabled: true,
    ownerConnector: 'pipelines',
  },
  {
    resourceId: 'salesforce:contact',
    system: 'salesforce',
    displayName: 'Contact',
    piiColumns: [
      { name: 'Email', classification: 'EMAIL' },
      { name: 'Phone', classification: 'PHONE' },
      { name: 'FirstName', classification: 'NAME' },
      { name: 'LastName', classification: 'NAME' },
      { name: 'MailingStreet', classification: 'ADDRESS' },
    ],
    deletionStrategy: 'saas_wipe',
    classification: 'HIGH',
    status: 'declared',
    scanEnabled: false,
    ownerConnector: 'pipelines',
  },
  {
    resourceId: 'hubspot:contact',
    system: 'hubspot',
    displayName: 'Contact',
    piiColumns: [
      { name: 'email', classification: 'EMAIL' },
      { name: 'firstname', classification: 'NAME' },
      { name: 'lastname', classification: 'NAME' },
      { name: 'phone', classification: 'PHONE' },
    ],
    deletionStrategy: 'saas_wipe',
    classification: 'HIGH',
    status: 'declared',
    scanEnabled: false,
    ownerConnector: 'pipelines',
  },
]

export const ghostDataFixtures = [
  {
    id: 'ghost-001',
    resource: 'bigquery:chameleon-dev.chameleon_dev.marketing_events',
    displayName: 'marketing_events',
    column: 'user_email',
    pattern: 'EMAIL_PATTERN',
    count: 14832,
    recommendedAction: 'register_column' as const,
  },
  {
    id: 'ghost-002',
    resource: 'bigquery:chameleon-dev.chameleon_dev.analytics_sessions',
    displayName: 'analytics_sessions',
    column: 'raw_user_agent',
    pattern: 'DEVICE_ID_PATTERN',
    count: 891441,
    recommendedAction: 'remove_source_data' as const,
  },
  {
    id: 'ghost-003',
    resource: 'bigquery:chameleon-dev.chameleon_dev.int_customer_metrics',
    displayName: 'int_customer_metrics',
    column: 'raw_email',
    pattern: 'EMAIL_PATTERN',
    count: 2901,
    recommendedAction: 'register_column' as const,
  },
]

export type RuleStatus = 'PASS' | 'WARN' | 'FAIL'
export type PolicyStatus = 'PASS' | 'WARN' | 'FAIL'

export const policyFixture = {
  status: 'WARN' as PolicyStatus,
  evaluatedAt: '2026-06-23T10:00:00Z',
  rules: [
    {
      id: 'all_pii_columns_declared',
      name: 'All PII columns declared',
      status: 'WARN' as RuleStatus,
      message: '3 ghost PII columns detected across 2 resources that are not declared in the registry.',
    },
    {
      id: 'deletion_strategy_required',
      name: 'Deletion strategy required',
      status: 'PASS' as RuleStatus,
      message: 'All 6 registered resources have a deletion strategy defined.',
    },
    {
      id: 'scan_coverage',
      name: 'Scan coverage',
      status: 'PASS' as RuleStatus,
      message: 'All BigQuery resources have automated scanning enabled.',
    },
    {
      id: 'key_vault_sync',
      name: 'Key vault sync',
      status: 'PASS' as RuleStatus,
      message: 'All encryption keys are active and synchronized with Key Vault.',
    },
  ],
}

export const deletionFixture = {
  userId: 'user_8821',
  requestId: 'del-req-a1b2c3d4e5f6',
  requestedAt: '2026-06-23T09:12:00Z',
  completedAt: '2026-06-23T09:14:03Z',
  status: 'COMPLETED' as const,
  steps: [
    {
      step: 1,
      action: 'Encryption key destroyed',
      system: 'Key Vault',
      status: 'COMPLETED' as const,
      timestamp: '2026-06-23T09:12:01Z',
      durationMs: 87,
    },
    {
      step: 2,
      action: 'BigQuery rows crypto-shredded',
      system: 'BigQuery',
      status: 'COMPLETED' as const,
      timestamp: '2026-06-23T09:12:02Z',
      durationMs: 1203,
    },
    {
      step: 3,
      action: 'Salesforce contact wiped',
      system: 'Salesforce',
      status: 'COMPLETED' as const,
      timestamp: '2026-06-23T09:12:04Z',
      durationMs: 2140,
    },
    {
      step: 4,
      action: 'HubSpot contact wiped',
      system: 'HubSpot',
      status: 'COMPLETED' as const,
      timestamp: '2026-06-23T09:12:07Z',
      durationMs: 2891,
    },
    {
      step: 5,
      action: 'Certificate of destruction issued',
      system: 'Key Vault',
      status: 'COMPLETED' as const,
      timestamp: '2026-06-23T09:12:10Z',
      durationMs: 312,
    },
  ],
}

export const proofFixture = {
  userId: 'user_8821',
  deletionRequestId: 'del-req-a1b2c3d4e5f6',
  affectedSystems: ['BigQuery', 'Salesforce', 'HubSpot'],
  certificate: {
    issuer: 'Chameleon Key Vault',
    issuedAt: '2026-06-23T09:12:10Z',
    status: 'CERTIFIED' as const,
    keyFingerprint: 'sha256:a1b2c3d4e5f678901234567890abcdef1234567890abcdef123456789012abcd',
    shredDate: '2026-06-23T09:12:01Z',
    jwt: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzg4MjEiLCJzaHJlZERhdGUiOiIyMDI2LTA2LTIzVDA5OjEyOjAxWiIsImtleUZpbmdlcnByaW50IjoiYTFiMmMzZDRlNWY2NzM5MCIsImVyYXNlZFN5c3RlbXMiOlsiYmlncXVlcnkiLCJodWJzcG90Iiwic2FsZXNmb3JjZSJdfQ.REDACTED_SIGNATURE',
  },
  auditTrail: [
    {
      timestamp: '2026-06-23T09:12:00Z',
      event: 'DELETION_REQUESTED',
      actor: 'api:console',
      details: 'Deletion lifecycle initiated for user_8821',
    },
    {
      timestamp: '2026-06-23T09:12:01Z',
      event: 'KEY_SHREDDED',
      actor: 'key-vault',
      details: 'DEK destroyed via Cloud KMS. Fingerprint: sha256:a1b2c3d4...',
    },
    {
      timestamp: '2026-06-23T09:12:02Z',
      event: 'WIPE_REQUEST_QUEUED',
      actor: 'janitor',
      details: 'Janitor wipe requests queued for 3 destinations',
    },
    {
      timestamp: '2026-06-23T09:12:02Z',
      event: 'SAAS_WIPE_SUCCEEDED',
      actor: 'janitor:bigquery',
      details: 'Crypto-shredded 1 row in stg_users — data is mathematically unrecoverable',
    },
    {
      timestamp: '2026-06-23T09:12:04Z',
      event: 'SAAS_WIPE_SUCCEEDED',
      actor: 'janitor:salesforce',
      details: 'Contact deleted (ID: 003Ab000004Wl5QIAS)',
    },
    {
      timestamp: '2026-06-23T09:12:07Z',
      event: 'SAAS_WIPE_SUCCEEDED',
      actor: 'janitor:hubspot',
      details: 'Contact deleted (VID: 94821)',
    },
    {
      timestamp: '2026-06-23T09:12:10Z',
      event: 'CERTIFICATE_ISSUED',
      actor: 'key-vault',
      details: 'Signed certificate of destruction stored. ID: del-req-a1b2c3d4e5f6',
    },
  ],
}

export type IntegrationStatus = 'connected' | 'warning' | 'disconnected'

export interface Integration {
  name: string
  system: string
  status: IntegrationStatus
  resourceCount: number
  lastSync: string
  details: string
}

export const integrationsFixture: Integration[] = [
  {
    name: 'BigQuery',
    system: 'bigquery',
    status: 'connected',
    resourceCount: 4,
    lastSync: '2026-06-23T08:15:00Z',
    details: 'chameleon-dev-496718.chameleon_dev',
  },
  {
    name: 'dbt',
    system: 'dbt',
    status: 'connected',
    resourceCount: 4,
    lastSync: '2026-06-23T07:00:00Z',
    details: '6 models with PII metadata declared',
  },
  {
    name: 'Salesforce',
    system: 'salesforce',
    status: 'connected',
    resourceCount: 1,
    lastSync: '2026-06-23T09:30:00Z',
    details: 'Sandbox: chameleon.sandbox.salesforce.com',
  },
  {
    name: 'HubSpot',
    system: 'hubspot',
    status: 'warning',
    resourceCount: 1,
    lastSync: '2026-06-22T15:00:00Z',
    details: 'Auth token expires in 3 days — re-authenticate to maintain wipe access',
  },
]
