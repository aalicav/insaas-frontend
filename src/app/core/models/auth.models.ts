export type PermissionKey =
  | 'connections:read'
  | 'connections:write'
  | 'sync:run'
  | 'people:read'
  | 'people:write'
  | 'catalog:read'
  | 'members:manage'
  | 'roles:manage'
  | 'org:settings'
  | 'org:logo'
  | 'orgs:manage_children'
  | 'audit:read'
  | 'inventory:read'
  | 'inventory:write'
  | 'contracts:read'
  | 'contracts:write'
  | 'spend:read'
  | 'spend:write'
  | 'lifecycle:read'
  | 'lifecycle:write'
  | 'workflows:manage'
  | 'notifications:read'
  | 'integrations:manage';

export interface AuthTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  orgId: string;
  membershipId: string;
  viaOrgId: string | null;
  permissions: PermissionKey[];
}

export interface LoginRequest {
  email: string;
  password: string;
  organizationId?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password?: string;
  name?: string;
}

export interface MembershipSummary {
  id: string;
  organizationId: string;
  orgName: string;
  orgSlug: string;
  logoKey: string | null;
  role: string;
  status: string;
}

export interface AuthMeResponse {
  id: string;
  email: string;
  name: string | null;
  status: string;
  activeOrganization: {
    id: string;
    name: string;
    slug: string;
    logoKey: string | null;
    viaOrgId: string | null;
  } | null;
  permissions: PermissionKey[];
  memberships: MembershipSummary[];
}
