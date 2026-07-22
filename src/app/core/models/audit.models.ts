export interface AuditEvent {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  outcome: string;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown | null;
  createdAt: string;
}

export interface AuditListParams {
  from?: string;
  to?: string;
  action?: string;
  actorUserId?: string;
  resourceType?: string;
  limit?: number;
  skip?: number;
}

export interface AuditListResponse {
  items: AuditEvent[];
  total: number;
  limit: number;
  skip: number;
}
