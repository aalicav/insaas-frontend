export type ConnectionStatus =
  | 'pending'
  | 'connected'
  | 'error'
  | 'disconnected';

export interface Connection {
  id: string;
  organizationId: string;
  provider: string;
  authType: string;
  status: ConnectionStatus;
  displayName: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CredentialFieldType = 'text' | 'url' | 'email' | 'textarea';

export interface CredentialField {
  name: string;
  label: string;
  secret?: boolean;
  optional?: boolean;
  type?: CredentialFieldType;
  hint?: string;
  placeholder?: string;
  pattern?: string;
}

export interface SetupGuideStep {
  title: string;
  body: string;
  link?: { label: string; url: string };
}

export interface SetupGuide {
  summary: string;
  prerequisites?: string[];
  docsUrl?: string;
  steps: SetupGuideStep[];
}

export type ConnectionNext =
  | { kind: 'redirect'; url: string }
  | {
      kind: 'credentials_form';
      fields: CredentialField[];
      requireOneOf?: string[][];
    };

export interface CreateConnectionResponse {
  connection: Pick<
    Connection,
    'id' | 'organizationId' | 'provider' | 'authType' | 'status'
  >;
  next: ConnectionNext;
}

export interface CreateConnectionRequest {
  provider: string;
  authType?: string;
  displayName?: string;
}

export interface SubmitCredentialsResponse {
  connectionId: string;
  status: string;
  health: { ok: boolean; message?: string };
}

export type SyncJobStatus = 'queued' | 'running' | 'success' | 'failed';

export interface SyncStatusResponse {
  connectionId: string;
  latest: {
    id: string;
    status: SyncJobStatus;
    startedAt: string | null;
    finishedAt: string | null;
    error: string | null;
    stats: Record<string, number> | null;
  } | null;
}

export interface IntegrationProvider {
  key: string;
  displayName: string;
  category?: string | null;
  enabled: boolean;
  connectable: boolean;
  hasRuntimeAdapter?: boolean;
  setupGuide?: SetupGuide | null;
  auth?: {
    defaultType?: string;
    supportedTypes?: string[];
  };
  capabilities?: Record<string, unknown>;
  sortOrder?: number;
}

export interface PatchIntegrationRequest {
  displayName?: string;
  category?: string | null;
  enabled?: boolean;
  connectable?: boolean;
  auth?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
  setupGuide?: SetupGuide | Record<string, unknown> | null;
  sortOrder?: number;
}
