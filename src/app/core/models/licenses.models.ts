export type LicenseAssignmentAction = 'revoke';

export interface LicenseAssignmentActionsResponse {
  assignmentId: string;
  provider: string;
  actions: LicenseAssignmentAction[];
}

export interface LicenseAssignmentMutationResponse {
  ok: boolean;
  action: LicenseAssignmentAction;
  message?: string;
  assignmentId: string;
}
