import {
  WORKFLOW_STEP_TYPES,
  WorkflowDefinition,
  WorkflowDefinitionStep,
  WorkflowStepType,
  WorkflowTriggerNode,
} from '../../core/models/workflows.models';

export interface StepTypeMeta {
  type: WorkflowStepType;
  label: string;
  description: string;
  icon: string;
  accent: string;
}

export const STEP_TYPE_META: StepTypeMeta[] = [
  {
    type: 'suspend_identity',
    label: 'Suspender identidade',
    description: 'Suspende contas no(s) provedor(es) elegíveis.',
    icon: 'pause_circle',
    accent: '#6b2030',
  },
  {
    type: 'create_identity',
    label: 'Criar identidade',
    description: 'Provisiona contas em conexões com createIdentity.',
    icon: 'person_add',
    accent: '#1f7a4d',
  },
  {
    type: 'delete_identity',
    label: 'Excluir identidade',
    description: 'Remove identidades nos provedores filtrados.',
    icon: 'person_remove',
    accent: '#b91c1c',
  },
  {
    type: 'notify',
    label: 'Notificar',
    description: 'Envia aviso in-app ou e-mail.',
    icon: 'notifications',
    accent: '#2563eb',
  },
  {
    type: 'delay',
    label: 'Aguardar',
    description: 'Pausa o fluxo por um intervalo.',
    icon: 'schedule',
    accent: '#b45309',
  },
  {
    type: 'approval',
    label: 'Aprovação',
    description: 'Aguarda aprovação humana para continuar.',
    icon: 'verified_user',
    accent: '#7c3aed',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'Chama um endpoint HTTP externo.',
    icon: 'webhook',
    accent: '#0f766e',
  },
  {
    type: 'condition',
    label: 'Condição',
    description: 'Decide se continua, pula etapa ou encerra.',
    icon: 'alt_route',
    accent: '#475569',
  },
];

export function stepTypeMeta(type: string): StepTypeMeta {
  return (
    STEP_TYPE_META.find((m) => m.type === type) ?? {
      type: type as WorkflowStepType,
      label: type,
      description: '',
      icon: 'tune',
      accent: '#5c5659',
    }
  );
}

export function isWorkflowStepType(value: string): value is WorkflowStepType {
  return (WORKFLOW_STEP_TYPES as readonly string[]).includes(value);
}

export function createDefaultStep(type: WorkflowStepType, key?: string): WorkflowDefinitionStep {
  const base: WorkflowDefinitionStep = {
    key: key ?? `${type}_${Math.random().toString(36).slice(2, 7)}`,
    type,
  };
  switch (type) {
    case 'notify':
      return {
        ...base,
        notify: { channel: 'in_app', template: 'custom', to: 'admins' },
      };
    case 'delay':
      return { ...base, delayMs: 60_000 };
    case 'approval':
      return { ...base, approval: { roleKeys: ['Admin'] } };
    case 'webhook':
      return {
        ...base,
        webhook: { url: 'https://', method: 'POST' },
      };
    case 'condition':
      return {
        ...base,
        condition: { op: 'person_status', equals: 'active', then: 'continue' },
      };
    default:
      return base;
  }
}

export function createEmptyDefinition(triggerType = 'manual'): WorkflowDefinition {
  return {
    trigger: { type: triggerType, config: {} },
    steps: [createDefaultStep('notify', 'notify_admins')],
  };
}

export function parseWorkflowDefinition(raw: unknown): WorkflowDefinition {
  if (!raw || typeof raw !== 'object') {
    return createEmptyDefinition();
  }
  const obj = raw as {
    trigger?: unknown;
    steps?: unknown;
    effects?: WorkflowDefinition['effects'];
  };

  const trigger = parseTrigger(obj.trigger);
  const stepsRaw = Array.isArray(obj.steps) ? obj.steps : [];
  const steps: WorkflowDefinitionStep[] = stepsRaw
    .map((step, index) => normalizeStep(step, index))
    .filter((s): s is WorkflowDefinitionStep => !!s);

  return {
    trigger,
    effects: obj.effects,
    steps: steps.length ? steps : [createDefaultStep('notify', 'notify_admins')],
  };
}

function parseTrigger(raw: unknown): WorkflowTriggerNode {
  if (!raw || typeof raw !== 'object') {
    return { type: 'manual', config: {} };
  }
  const t = raw as Record<string, unknown>;
  const type = String(t['type'] ?? 'manual').trim() || 'manual';
  const configRaw = t['config'];
  const config =
    configRaw && typeof configRaw === 'object' && !Array.isArray(configRaw)
      ? (configRaw as Record<string, unknown>)
      : {};
  return { type, config };
}

function normalizeStep(raw: unknown, index: number): WorkflowDefinitionStep | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const type = String(s['type'] ?? '').trim();
  if (!isWorkflowStepType(type)) return null;
  const key = String(s['key'] ?? '').trim() || `step_${index + 1}`;
  return {
    key,
    type,
    providerFilter: Array.isArray(s['providerFilter'])
      ? (s['providerFilter'] as unknown[]).map(String)
      : undefined,
    connectionIds: Array.isArray(s['connectionIds'])
      ? (s['connectionIds'] as unknown[]).map(String)
      : undefined,
    delayMs: typeof s['delayMs'] === 'number' ? s['delayMs'] : undefined,
    notify: s['notify'] as WorkflowDefinitionStep['notify'],
    approval: s['approval'] as WorkflowDefinitionStep['approval'],
    webhook: s['webhook'] as WorkflowDefinitionStep['webhook'],
    condition: s['condition'] as WorkflowDefinitionStep['condition'],
  };
}

export interface WorkflowFlowNode {
  id: string;
  kind: 'trigger' | 'step';
  position: { x: number; y: number };
  trigger?: WorkflowTriggerNode;
  step?: WorkflowDefinitionStep;
  status?: string | null;
  error?: string | null;
  /** Missing required config — show warning on canvas. */
  configWarning?: string | null;
}

const IDENTITY_STEP_TYPES: ReadonlySet<WorkflowStepType> = new Set([
  'suspend_identity',
  'create_identity',
  'delete_identity',
]);

export function stepRequiresProviders(type: WorkflowStepType): boolean {
  return IDENTITY_STEP_TYPES.has(type);
}

/** Returns a short reason when the step is missing required configuration. */
export function stepConfigWarning(step: WorkflowDefinitionStep): string | null {
  if (!step.key?.trim()) return 'Chave obrigatória';

  if (stepRequiresProviders(step.type)) {
    if (!step.providerFilter?.length && !step.connectionIds?.length) {
      return 'Selecione ao menos um provider';
    }
  }

  switch (step.type) {
    case 'notify':
      if (!step.notify?.template?.trim()) return 'Template obrigatório';
      if (!step.notify?.channel) return 'Canal obrigatório';
      if (!step.notify?.to) return 'Destinatário obrigatório';
      break;
    case 'delay':
      if (!step.delayMs || step.delayMs <= 0) return 'Informe o atraso';
      break;
    case 'approval':
      if (!step.approval?.roleKeys?.length) return 'Informe ao menos uma role';
      break;
    case 'webhook': {
      const url = step.webhook?.url?.trim() ?? '';
      if (!url || url === 'https://' || url === 'http://') {
        return 'URL do webhook obrigatória';
      }
      if (!/^https?:\/\/.+/i.test(url)) {
        return 'URL do webhook inválida';
      }
      break;
    }
    case 'condition': {
      const op = step.condition?.op;
      if (!op) return 'Operação obrigatória';
      if (op === 'has_identity_on_provider' && !step.condition?.provider?.trim()) {
        return 'Provider obrigatório';
      }
      if (op === 'person_status' && !step.condition?.equals?.trim()) {
        return 'Valor equals obrigatório';
      }
      if (op === 'person_in_unit' && !step.condition?.orgUnitId?.trim()) {
        return 'Org unit obrigatória';
      }
      break;
    }
  }
  return null;
}

export function triggerConfigWarning(
  trigger: WorkflowTriggerNode,
  descriptors: Array<{ type: string; configFields: Array<{ name: string; optional?: boolean }> }>,
): string | null {
  if (!trigger.type?.trim()) return 'Tipo de gatilho obrigatório';
  const descriptor = descriptors.find((d) => d.type === trigger.type);
  if (!descriptor) return null;
  for (const field of descriptor.configFields) {
    if (field.optional) continue;
    const value = trigger.config?.[field.name];
    if (value == null || value === '') return `Campo obrigatório: ${field.name}`;
    if (Array.isArray(value) && value.length === 0) return `Campo obrigatório: ${field.name}`;
  }
  return null;
}

export interface WorkflowFlowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  /** Logical node ids (not connector ids) — used to insert between nodes. */
  sourceNodeId: string;
  targetNodeId: string;
}

/** Safe id for SVG marker / connector attributes (no ':' / '>' / spaces). */
export function flowSafeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function connectorOutId(nodeId: string): string {
  return `${flowSafeId(nodeId)}-out`;
}

export function connectorInId(nodeId: string): string {
  return `${flowSafeId(nodeId)}-in`;
}

export type WorkflowLayoutDirection = 'horizontal' | 'vertical';

const NODE_START_X = 48;
const NODE_START_Y = 80;
const NODE_GAP_X = 320;
const NODE_GAP_Y = 168;
const NODE_CENTER_Y = 120;
const NODE_CENTER_X = 200;

/** Positions nodes in pipeline order (trigger → steps). Horizontal by default (n8n-like). */
export function layoutNodesInOrder(
  nodes: WorkflowFlowNode[],
  direction: WorkflowLayoutDirection = 'horizontal',
): Array<{ id: string; position: { x: number; y: number } }> {
  return nodes.map((node, index) => {
    if (direction === 'vertical') {
      return {
        id: node.id,
        position: {
          x: NODE_CENTER_X,
          y: NODE_START_Y + index * NODE_GAP_Y,
        },
      };
    }
    return {
      id: node.id,
      position: {
        x: NODE_START_X + index * NODE_GAP_X,
        y: NODE_CENTER_Y,
      },
    };
  });
}

export function layoutDefinition(
  definition: WorkflowDefinition,
  statusByStepKey?: Map<string, { status: string; error?: string | null }>,
  direction: WorkflowLayoutDirection = 'horizontal',
  options?: {
    triggerDescriptors?: Array<{
      type: string;
      configFields: Array<{ name: string; optional?: boolean }>;
    }>;
  },
): { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] } {
  const nodes: WorkflowFlowNode[] = [
    {
      id: 'trigger',
      kind: 'trigger',
      position: { x: 0, y: 0 },
      trigger: definition.trigger,
      configWarning: triggerConfigWarning(
        definition.trigger,
        options?.triggerDescriptors ?? [],
      ),
    },
  ];

  definition.steps.forEach((step) => {
    const status = statusByStepKey?.get(step.key);
    nodes.push({
      id: `step:${step.key}`,
      kind: 'step',
      position: { x: 0, y: 0 },
      step,
      status: status?.status ?? null,
      error: status?.error ?? null,
      configWarning: stepConfigWarning(step),
    });
  });

  const positions = layoutNodesInOrder(nodes, direction);
  const positioned = nodes.map((node, index) => ({
    ...node,
    position: positions[index].position,
  }));

  const edges: WorkflowFlowEdge[] = [];
  for (let i = 0; i < positioned.length - 1; i++) {
    const from = positioned[i];
    const to = positioned[i + 1];
    edges.push({
      // Keep SVG-safe ids (no ':' / '>') — marker url(#...) breaks otherwise.
      id: `edge-${i}`,
      sourceId: connectorOutId(from.id),
      targetId: connectorInId(to.id),
      sourceNodeId: from.id,
      targetNodeId: to.id,
    });
  }

  return { nodes: positioned, edges };
}

export function stepSummary(step: WorkflowDefinitionStep): string {
  switch (step.type) {
    case 'notify':
      return `${step.notify?.channel ?? 'in_app'} → ${step.notify?.to ?? 'admins'}`;
    case 'delay':
      return step.delayMs ? `${Math.round(step.delayMs / 1000)}s` : '—';
    case 'approval':
      return step.approval?.roleKeys?.join(', ') || 'Aprovação';
    case 'webhook':
      return step.webhook?.method ?? 'POST';
    case 'condition':
      return step.condition?.op ?? 'condição';
    default:
      return step.providerFilter?.length
        ? step.providerFilter.join(', ')
        : 'Todos os provedores';
  }
}

/** Example `payload` object for POST /workflows/trigger by trigger type. */
export function triggerPayloadTemplate(type: string): Record<string, unknown> {
  switch (type) {
    case 'manual':
      return {
        reason: 'manual_test',
        note: 'Disparo de teste pela UI',
      };
    case 'person.offboard':
      return {
        reason: 'termination',
        effectiveDate: '2026-07-18',
      };
    case 'person.onboard':
      return {
        password: 'ChangeMe123!',
        department: 'Engineering',
      };
    case 'access.review':
      return {
        campaign: 'Q3-2026',
        scope: 'all_identities',
      };
    case 'webhook':
      return {
        email: 'pessoa@empresa.com',
        source: 'external-system',
      };
    case 'schedule':
      return {
        tick: true,
      };
    default:
      return {};
  }
}

/** Full request body example for documentation / copy. */
export function triggerRequestTemplate(
  type: string,
  options?: { requiresPerson?: boolean },
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type,
    connectionIds: [] as string[],
    payload: triggerPayloadTemplate(type),
  };
  if (options?.requiresPerson !== false) {
    body['personId'] = '<uuid-da-pessoa>';
  }
  if (type === 'webhook') {
    delete body['personId'];
    body['payload'] = {
      personId: '<uuid-ou-omitir>',
      email: 'pessoa@empresa.com',
    };
  }
  return body;
}

export function formatJsonTemplate(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function triggerIcon(type: string): string {
  switch (type) {
    case 'manual':
      return 'touch_app';
    case 'person.offboard':
      return 'person_off';
    case 'person.onboard':
      return 'person_add';
    case 'access.review':
      return 'policy';
    case 'webhook':
      return 'webhook';
    case 'schedule':
      return 'schedule';
    default:
      return 'bolt';
  }
}
