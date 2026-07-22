export const WORKFLOW_STEP_TYPES = [
  'suspend_identity',
  'create_identity',
  'delete_identity',
  'notify',
  'delay',
  'approval',
  'webhook',
  'condition',
] as const;

export type WorkflowStepType = (typeof WORKFLOW_STEP_TYPES)[number];

export interface WorkflowTriggerNode {
  type: string;
  config: Record<string, unknown>;
}

export interface WorkflowDefinitionStep {
  key: string;
  type: WorkflowStepType;
  providerFilter?: string[];
  connectionIds?: string[];
  delayMs?: number;
  notify?: {
    channel: 'email' | 'in_app';
    template: string;
    to: 'person' | 'admins' | 'unit_owner';
  };
  approval?: {
    roleKeys?: string[];
    timeoutMs?: number;
  };
  webhook?: {
    url: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
    bodyTemplate?: string;
  };
  condition?: {
    op: 'has_identity_on_provider' | 'person_status' | 'person_in_unit';
    provider?: string;
    equals?: string;
    orgUnitId?: string;
    unitKind?: 'team' | 'cost_center';
    then: 'continue' | 'skip_rest' | 'skip_step';
  };
}

export interface WorkflowDefinition {
  trigger: WorkflowTriggerNode;
  effects?: {
    onSuccessPersonStatus?: 'active' | 'inactive';
  };
  steps: WorkflowDefinitionStep[];
}

export interface CreateOrganizationWorkflowRequest {
  name: string;
  enabled?: boolean;
  definition: WorkflowDefinition | Record<string, unknown>;
}

export interface UpdateOrganizationWorkflowRequest {
  name?: string;
  enabled?: boolean;
  definition?: WorkflowDefinition | Record<string, unknown>;
}

export interface TriggerWorkflowRequest {
  type: string;
  personId?: string;
  connectionIds?: string[];
  payload?: Record<string, unknown>;
}

export interface StartWorkflowRunRequest {
  personId: string;
  connectionIds?: string[];
}

export interface OffboardPersonRequest {
  connectionIds?: string[];
}

export interface OnboardPersonRequest {
  connectionIds?: string[];
  password?: string;
}

export interface OrganizationWorkflow {
  id: string;
  organizationId: string;
  templateKey: string | null;
  name: string;
  trigger: string;
  enabled: boolean;
  definition: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunStep {
  id: string;
  runId: string;
  order: number;
  stepKey: string;
  type: string;
  status: string;
  config: unknown | null;
  connectionId: string | null;
  identityId: string | null;
  provider: string | null;
  externalId: string | null;
  error: string | null;
  approvedByUserId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  organizationId: string;
  organizationWorkflowId: string;
  personId: string;
  trigger: string;
  status: string;
  triggeredByUserId: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowRunStep[];
  person: { id: string; email: string; displayName: string | null; status: string };
  workflow: { id: string; name: string; templateKey: string | null; trigger: string };
}

export interface WorkflowRunsParams {
  personId?: string;
  trigger?: string;
  kind?: 'offboarding' | 'onboarding' | string;
}

export interface TriggerDescriptor {
  type: string;
  displayName: string;
  description?: string;
  requiresPerson: boolean;
  configFields: Array<{
    name: string;
    label: string;
    type: 'string' | 'boolean' | 'string[]' | 'select' | 'cron';
    optional?: boolean;
    secret?: boolean;
    description?: string;
    options?: Array<{ value: string; label: string }>;
  }>;
}

export type TriggerResult = WorkflowRun | { type: string; runs: WorkflowRun[] };
