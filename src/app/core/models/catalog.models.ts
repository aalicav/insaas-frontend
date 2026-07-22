export type CatalogIdentityStatus = 'active' | 'suspended' | 'deleted' | 'unknown';

export interface CatalogListParams {
  provider?: string;
  connectionId?: string;
}

export interface CatalogIdentity {
  id: string;
  connectionId: string;
  provider: string;
  externalId: string;
  email: string | null;
  displayName: string | null;
  status: CatalogIdentityStatus | string;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  department: string | null;
  jobTitle: string | null;
  attributes?: unknown;
  syncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogGroup {
  id: string;
  connectionId: string;
  provider: string;
  externalId: string;
  name: string | null;
  email: string | null;
  memberCount: number | null;
  attributes?: unknown;
  syncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogLicense {
  id: string;
  connectionId: string;
  provider: string;
  externalId: string;
  skuId: string | null;
  skuName: string | null;
  seats: number | null;
  assignedCount: number | null;
  attributes?: unknown;
  syncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogApp {
  id: string;
  connectionId: string;
  provider: string;
  externalId: string;
  name: string | null;
  category: string | null;
  attributes?: unknown;
  syncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIdentityRequest {
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  jobTitle?: string;
  password?: string;
}

export interface PublicIdentity {
  id: string;
  connectionId: string;
  provider: string;
  externalId: string;
  status: string;
  email: string | null;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
}

export interface IdentityMutationResponse {
  ok: true;
  action: 'suspendIdentity' | 'deleteIdentity' | 'createIdentity';
  message?: string;
  identity: PublicIdentity;
}
