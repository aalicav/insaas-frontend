export type OrgUnitKind = 'team' | 'cost_center';
export type OrgUnitStatus = 'active' | 'inactive';

export interface UpdateOrgViewsRequest {
  primaryView: OrgUnitKind;
  secondaryView?: OrgUnitKind | null;
}

export interface OrgViews {
  organizationId: string;
  primaryView: OrgUnitKind;
  secondaryView: OrgUnitKind | null;
  updatedAt: string;
}

export interface CreateOrgUnitRequest {
  kind: OrgUnitKind;
  name: string;
  code?: string;
  ownerPersonId?: string | null;
}

export interface UpdateOrgUnitRequest {
  name?: string;
  code?: string | null;
  status?: OrgUnitStatus;
  ownerPersonId?: string | null;
}

export interface BulkCreateOrgUnitsRequest {
  units: CreateOrgUnitRequest[];
}

export interface BulkMapAssignment {
  personIds?: string[];
  departmentKey?: string;
  teamUnitId?: string | null;
  costCenterUnitId?: string | null;
}

export interface BulkMapPeopleRequest {
  mappings: BulkMapAssignment[];
  dryRun?: boolean;
  createMissingTeams?: boolean;
}

export interface OrgUnit {
  id: string;
  organizationId: string;
  kind: OrgUnitKind;
  name: string;
  key: string;
  code: string | null;
  status: OrgUnitStatus;
  ownerPersonId: string | null;
  memberCount: number;
  ownerPerson: { id: string; email: string; displayName: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnitListParams {
  kind?: OrgUnitKind;
  status?: OrgUnitStatus;
  q?: string;
}

export interface OrgUnitMembersResponse {
  unit: {
    id: string;
    kind: string;
    name: string;
    key: string;
    code: string | null;
  };
  members: Array<{
    id: string;
    email: string;
    displayName: string | null;
    status: string;
    departmentFromIdp: string | null;
    teamUnitId: string | null;
    costCenterUnitId: string | null;
  }>;
}

export interface MappingSuggestionsResponse {
  suggestions: Array<{
    departmentFromIdp: string;
    key: string;
    count: number;
    personIds: string[];
    suggestedTeamUnitId: string | null;
    suggestedTeamName: string | null;
    needsNewTeam: boolean;
  }>;
  unassignedNoDepartment: number;
  activeTeams: number;
}

export interface BulkMapResponse {
  dryRun: boolean;
  updated: number;
  teamsCreated: number;
  details: unknown[];
}

export interface BulkCreateUnitsResponse {
  created: OrgUnit[];
  errors: Array<{ name: string; error: string }>;
}

export interface OwnerReportsRunResponse {
  scanned: number;
  notified: number;
  skippedNoUser: number;
  monthKey: string;
}
