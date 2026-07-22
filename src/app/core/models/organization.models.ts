import type { PermissionKey } from './auth.models';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoKey?: string | null;
  logoUrl?: string | null;
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationTreeNode extends Organization {
  children: OrganizationTreeNode[];
}

export interface CreateOrganizationRequest {
  name: string;
  parentId?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  parentId?: string | null;
}

export interface OrgMember {
  userId: string;
  email: string;
  name: string | null;
  status: 'active' | 'invited' | 'suspended' | string;
  roleId: string;
  roleName: string;
  membershipId?: string;
}

export interface OrgRole {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: PermissionKey[] | string[];
}

export interface InviteMemberRequest {
  email: string;
  roleId: string;
  name?: string;
}

export interface UpdateMemberRequest {
  roleId?: string;
  status?: 'active' | 'suspended';
}

export interface CreateRoleRequest {
  name: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  permissions?: string[];
}
