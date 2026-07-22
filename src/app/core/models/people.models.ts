export type PersonStatus = 'active' | 'inactive';

export type AbsenceReason = 'vacation' | 'absence' | 'sick' | 'recess';

export interface OrgUnitRef {
  id: string;
  name: string;
  kind?: string;
}

export interface PersonAbsence {
  id: string;
  reason: AbsenceReason;
  startsOn: string;
  endsOn: string | null;
  source: string;
  note: string | null;
}

export interface Person {
  id: string;
  email: string;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  status: PersonStatus;
  source?: string;
  teamUnitId?: string | null;
  costCenterUnitId?: string | null;
  teamUnit?: OrgUnitRef | null;
  costCenterUnit?: OrgUnitRef | null;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
  evidenceAt?: string | null;
  onLeave?: boolean;
  currentAbsence?: PersonAbsence | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonIdentity {
  id: string;
  provider: string;
  connectionId: string;
  externalId?: string;
  email?: string | null;
  displayName?: string | null;
  status?: string | null;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
}

export interface PersonLicense {
  id: string;
  provider: string;
  externalId?: string;
  skuId?: string | null;
  skuName?: string | null;
  /** @deprecated use skuName — kept for older payloads */
  name?: string;
  sku?: string;
  seats?: number | null;
  assignedCount?: number | null;
  identityId?: string;
  connectionId?: string;
  assignedAt?: string | null;
}

export interface PersonDetail extends Person {
  identities: PersonIdentity[];
  licenses: PersonLicense[];
  absences: PersonAbsence[];
}

export interface CreatePersonRequest {
  email: string;
  displayName?: string;
  department?: string;
  jobTitle?: string;
  teamUnitId?: string | null;
  costCenterUnitId?: string | null;
  status?: PersonStatus;
}

export interface UpdatePersonRequest {
  displayName?: string;
  department?: string;
  jobTitle?: string;
  teamUnitId?: string | null;
  costCenterUnitId?: string | null;
  status?: PersonStatus;
}

export interface CreatePersonAbsenceRequest {
  reason: AbsenceReason;
  startsOn: string;
  endsOn?: string | null;
  note?: string;
}

export interface UpdatePersonAbsenceRequest {
  reason?: AbsenceReason;
  startsOn?: string;
  endsOn?: string | null;
  note?: string | null;
}

export interface PeopleListParams {
  status?: PersonStatus;
  q?: string;
  inactiveDays?: number;
  activity?: 'unknown';
  provider?: string;
  connectionId?: string;
  teamUnitId?: string;
  costCenterUnitId?: string;
  unassignedTeam?: boolean;
  unassignedCostCenter?: boolean;
  onLeave?: boolean;
}
