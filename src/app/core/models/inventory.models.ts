export type ManagedAppStatus = 'unmanaged' | 'sanctioned' | 'ignored';
export type ManagedAppCriticality = 'low' | 'medium' | 'high' | 'critical';

export interface ManagedAppListParams {
  status?: ManagedAppStatus;
  criticality?: ManagedAppCriticality;
  tag?: string;
  q?: string;
}

export interface CreateManagedAppRequest {
  name: string;
  status?: ManagedAppStatus;
  criticality?: ManagedAppCriticality;
  description?: string;
  ownerUserId?: string | null;
  ownerPersonId?: string | null;
  tags?: string[];
}

export interface UpdateManagedAppRequest {
  name?: string;
  status?: ManagedAppStatus;
  criticality?: ManagedAppCriticality;
  description?: string | null;
  ownerUserId?: string | null;
  ownerPersonId?: string | null;
  tags?: string[];
}

export interface PromoteManagedAppRequest {
  sourceAppId: string;
  name?: string;
  criticality?: ManagedAppCriticality;
  description?: string;
  ownerUserId?: string | null;
  ownerPersonId?: string | null;
  tags?: string[];
}

export interface ManagedApp {
  id: string;
  organizationId: string;
  name: string;
  status: ManagedAppStatus;
  criticality: ManagedAppCriticality;
  description: string | null;
  ownerUserId: string | null;
  ownerPersonId: string | null;
  sourceAppId: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  ownerUser: { id: string; email: string; name: string | null } | null;
  ownerPerson: { id: string; email: string; displayName: string | null } | null;
  sourceApp: {
    id: string;
    provider: string;
    externalId: string;
    name: string | null;
    category: string | null;
    connectionId: string;
  } | null;
}

export interface InventoryTag {
  id: string;
  name: string;
  createdAt: string;
}
