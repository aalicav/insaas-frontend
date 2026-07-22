import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { WorkflowsApiService } from '../../../core/api/workflows-api.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import {
  OrganizationWorkflow,
  TriggerDescriptor,
  WorkflowDefinition,
  WorkflowDefinitionStep,
  WorkflowStepType,
} from '../../../core/models/workflows.models';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { HelpHints } from '../../../shared/labels/help-hints';
import { WorkflowFlowCanvasComponent } from '../flow/workflow-flow-canvas.component';
import {
  STEP_TYPE_META,
  createDefaultStep,
  createEmptyDefinition,
  layoutDefinition,
  parseWorkflowDefinition,
  stepRequiresProviders,
  stepTypeMeta,
} from '../workflow-meta';
import {
  WorkflowEditorDialogData,
  WorkflowEditorDialogResult,
} from '../open-workflow-editor-dialog';
import { ConnectionsApiService } from '../../../core/api/connections-api.service';
import { IntegrationProvider } from '../../../core/models/connection.models';
import { providerLabel } from '../../../shared/labels/domain-labels';

interface WorkflowTemplateRow {
  id: string;
  key: string;
  name: string;
  trigger: string;
  description: string | null;
  defaultEnabled: boolean;
  definition: Record<string, unknown>;
}

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    WorkflowFlowCanvasComponent,
  ],
  templateUrl: './workflow-editor.component.html',
  styleUrl: './workflow-editor.component.scss',
})
export class WorkflowEditorComponent implements OnInit {
  private readonly api = inject(WorkflowsApiService);
  private readonly connectionsApi = inject(ConnectionsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<WorkflowEditorComponent, WorkflowEditorDialogResult>);
  private readonly data = inject<WorkflowEditorDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  private readonly configDialogTpl = viewChild.required<TemplateRef<unknown>>('configDialog');
  private configDialogRef: MatDialogRef<unknown> | null = null;

  readonly HelpHints = HelpHints;
  readonly stepTypes = STEP_TYPE_META;
  readonly providerLabel = providerLabel;
  readonly stepRequiresProviders = stepRequiresProviders;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly isNew = signal(true);
  readonly workflowId = signal<string | null>(null);
  readonly templates = signal<WorkflowTemplateRow[]>([]);
  readonly triggerTypes = signal<TriggerDescriptor[]>([]);
  readonly providers = signal<IntegrationProvider[]>([]);
  readonly providerSearch = signal('');
  readonly definition = signal<WorkflowDefinition>(createEmptyDefinition());
  readonly selectedNodeId = signal<string | null>(null);
  readonly nodePositions = signal<Map<string, { x: number; y: number }>>(new Map());
  readonly paletteOpen = signal(false);

  readonly metaForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    enabled: [true],
    templateKey: [''],
  });

  readonly triggerTypeControl = this.fb.nonNullable.control('manual', Validators.required);
  readonly triggerConfigControls = signal<Record<string, FormControl<string>>>({});

  readonly stepForm = this.fb.nonNullable.group({
    key: ['', Validators.required],
    type: ['notify' as WorkflowStepType, Validators.required],
    providerFilter: [[] as string[]],
    connectionIds: [''],
    delayMs: [60],
    notifyChannel: ['in_app' as 'email' | 'in_app'],
    notifyTemplate: ['custom'],
    notifyTo: ['admins' as 'person' | 'admins' | 'unit_owner'],
    approvalRoles: ['Admin'],
    approvalTimeoutSec: [0],
    webhookUrl: ['https://'],
    webhookMethod: ['POST' as 'POST' | 'PUT'],
    webhookBody: [''],
    conditionOp: ['person_status' as 'has_identity_on_provider' | 'person_status' | 'person_in_unit'],
    conditionEquals: [''],
    conditionProvider: [''],
    conditionOrgUnitId: [''],
    conditionThen: ['continue' as 'continue' | 'skip_rest' | 'skip_step'],
    effectsPersonStatus: ['' as '' | 'active' | 'inactive'],
  });

  readonly graph = computed(() => {
    const laid = layoutDefinition(this.definition(), undefined, 'horizontal', {
      triggerDescriptors: this.triggerTypes(),
    });
    const positions = this.nodePositions();
    const nodes = laid.nodes.map((n) => {
      const pos = positions.get(n.id);
      return pos ? { ...n, position: pos } : n;
    });
    return { nodes, edges: laid.edges };
  });

  readonly filteredProviders = computed(() => {
    const q = this.providerSearch().trim().toLowerCase();
    const selected = new Set(this.stepForm.controls.providerFilter.value ?? []);
    return this.providers().filter((p) => {
      if (selected.has(p.key)) return true;
      if (!q) return true;
      return (
        p.displayName.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        providerLabel(p.key).toLowerCase().includes(q)
      );
    });
  });

  providerTriggerLabel(): string {
    const keys = this.stepForm.controls.providerFilter.value ?? [];
    if (!keys.length) return 'Nenhum provider selecionado';
    const byKey = new Map(this.providers().map((p) => [p.key, p.displayName]));
    const labels = keys.map((k) => byKey.get(k) || providerLabel(k));
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }

  onProviderSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.providerSearch.set(value);
  }

  clearProviderSearch(): void {
    this.providerSearch.set('');
  }

  readonly selectedTrigger = computed(() => {
    const type = this.triggerTypeControl.value;
    return this.triggerTypes().find((t) => t.type === type) ?? null;
  });

  readonly selectedStep = computed(() => {
    const id = this.selectedNodeId();
    if (!id?.startsWith('step:')) return null;
    const key = id.slice(5);
    return this.definition().steps.find((s) => s.key === key) ?? null;
  });

  readonly pageTitle = computed(() =>
    this.isNew() ? 'Novo workflow' : this.metaForm.controls.name.value || 'Editar workflow',
  );

  ngOnInit(): void {
    const id = this.data.workflowId ?? null;
    const templateKey = this.data.templateKey ?? null;
    this.isNew.set(!id);
    this.workflowId.set(id);

    this.triggerTypeControl.valueChanges.subscribe((type) => {
      this.syncTriggerConfigFields(type);
      this.definition.update((def) => ({
        ...def,
        trigger: { type, config: this.readTriggerConfig() },
      }));
    });

    this.stepForm.valueChanges.subscribe(() => {
      if (!this.configDialogRef || !this.selectedStep()) return;
      this.commitSelectedStep();
    });

    this.loading.set(true);
    forkJoin({
      workflows: this.api.listWorkflows(),
      templates: this.api.listTemplates(),
      triggerTypes: this.api.listTriggerTypes(),
      providers: this.connectionsApi.listIntegrations(true),
    }).subscribe({
      next: ({ workflows, templates, triggerTypes, providers }) => {
        this.templates.set(templates as unknown as WorkflowTemplateRow[]);
        this.triggerTypes.set(triggerTypes);
        this.providers.set(
          [...providers].sort((a, b) =>
            a.displayName.localeCompare(b.displayName, 'pt-BR'),
          ),
        );

        if (this.isNew()) {
          if (templateKey) {
            this.applyTemplate(templateKey, false);
          } else {
            this.resetDefinition(createEmptyDefinition());
            this.metaForm.patchValue({ name: 'Novo workflow', enabled: true });
          }
        } else {
          const wf = workflows.find((w) => w.id === id);
          if (!wf) {
            this.error.set('Workflow não encontrado');
            this.loading.set(false);
            return;
          }
          this.loadWorkflow(wf);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar editor'));
      },
    });
  }

  private savedDuringSession = false;

  close(): void {
    this.closeConfigDialog();
    this.closePalette();
    this.dialogRef.close({
      saved: this.savedDuringSession,
      workflowId: this.workflowId() ?? undefined,
    });
  }

  applyTemplate(key: string, overwriteName = true): void {
    if (!key) return;
    const template = this.templates().find((t) => t.key === key);
    if (!template) return;
    const def = parseWorkflowDefinition(template.definition);
    this.resetDefinition(def);
    this.metaForm.patchValue({
      name: overwriteName ? template.name : this.metaForm.controls.name.value || template.name,
      enabled: template.defaultEnabled,
      templateKey: template.key,
    });
    this.triggerTypeControl.setValue(def.trigger.type, { emitEvent: false });
    this.syncTriggerConfigFields(def.trigger.type, def.trigger.config);
    this.selectedNodeId.set('trigger');
  }

  private loadWorkflow(wf: OrganizationWorkflow): void {
    const def = parseWorkflowDefinition(wf.definition);
    this.resetDefinition(def);
    this.metaForm.patchValue({
      name: wf.name,
      enabled: wf.enabled,
      templateKey: wf.templateKey ?? '',
    });
    this.triggerTypeControl.setValue(def.trigger.type, { emitEvent: false });
    this.syncTriggerConfigFields(def.trigger.type, def.trigger.config);
    this.selectedNodeId.set('trigger');
  }

  private resetDefinition(def: WorkflowDefinition): void {
    this.definition.set(def);
    this.nodePositions.set(new Map());
    this.patchEffects(def);
  }

  private patchEffects(def: WorkflowDefinition): void {
    this.stepForm.patchValue({
      effectsPersonStatus: def.effects?.onSuccessPersonStatus ?? '',
    });
  }

  syncTriggerConfigFields(
    type: string,
    existing?: Record<string, unknown>,
  ): void {
    const descriptor = this.triggerTypes().find((t) => t.type === type);
    const controls: Record<string, FormControl<string>> = {};
    for (const field of descriptor?.configFields ?? []) {
      const raw = existing?.[field.name];
      let value = '';
      if (typeof raw === 'boolean') value = String(raw);
      else if (Array.isArray(raw)) value = raw.join(', ');
      else if (raw != null) value = String(raw);
      controls[field.name] = new FormControl(value, { nonNullable: true });
    }
    this.triggerConfigControls.set(controls);''
  }

  selectNode(id: string): void {
    this.commitSelectedStep();
    this.commitTriggerConfig();
    this.closePalette();
    this.selectedNodeId.set(id);

    if (id !== 'trigger') {
      const step = this.definition().steps.find((s) => `step:${s.key}` === id);
      if (!step) return;
      this.stepForm.patchValue({
        key: step.key,
        type: step.type,
        providerFilter: [...(step.providerFilter ?? [])],
        connectionIds: (step.connectionIds ?? []).join(', '),
        delayMs: Math.round((step.delayMs ?? 60_000) / 1000),
        notifyChannel: step.notify?.channel ?? 'in_app',
        notifyTemplate: step.notify?.template ?? 'custom',
        notifyTo: step.notify?.to ?? 'admins',
        approvalRoles: (step.approval?.roleKeys ?? ['Admin']).join(', '),
        approvalTimeoutSec: step.approval?.timeoutMs
          ? Math.round(step.approval.timeoutMs / 1000)
          : 0,
        webhookUrl: step.webhook?.url ?? 'https://',
        webhookMethod: step.webhook?.method ?? 'POST',
        webhookBody: step.webhook?.bodyTemplate ?? '',
        conditionOp: step.condition?.op ?? 'person_status',
        conditionEquals: step.condition?.equals ?? '',
        conditionProvider: step.condition?.provider ?? '',
        conditionOrgUnitId: step.condition?.orgUnitId ?? '',
        conditionThen: step.condition?.then ?? 'continue',
      });
      this.providerSearch.set('');
    }

    this.openConfigDialog();
  }

  togglePalette(): void {
    this.closeConfigDialog();
    this.paletteOpen.update((open) => !open);
  }

  closePalette(): void {
    this.paletteOpen.set(false);
  }

  openConfigDialog(): void {
    if (this.configDialogRef) return;
    this.configDialogRef = this.dialog.open(this.configDialogTpl(), {
      width: '720px',
      maxWidth: '96vw',
      maxHeight: '88vh',
      autoFocus: 'dialog',
      restoreFocus: true,
      panelClass: 'wf-node-config-dialog',
    });
    this.configDialogRef.afterClosed().subscribe(() => {
      this.configDialogRef = null;
      this.commitSelectedStep();
      this.commitTriggerConfig();
      this.commitEffects();
    });
  }

  closeConfigDialog(): void {
    this.configDialogRef?.close();
    this.configDialogRef = null;
  }

  addStep(type: WorkflowStepType): void {
    this.commitSelectedStep();
    const step = createDefaultStep(type);
    this.definition.update((def) => ({
      ...def,
      steps: [...def.steps, step],
    }));
    this.closePalette();
    this.selectNode(`step:${step.key}`);
  }

  /** Inserts a new step right after the given node (trigger or step). */
  insertStepBetween(event: { afterNodeId: string; type: WorkflowStepType }): void {
    this.commitSelectedStep();
    const step = createDefaultStep(event.type);
    const afterId = event.afterNodeId;

    this.definition.update((def) => {
      const steps = [...def.steps];
      if (afterId === 'trigger') {
        return { ...def, steps: [step, ...steps] };
      }
      const afterKey = afterId.startsWith('step:') ? afterId.slice(5) : null;
      if (!afterKey) {
        return { ...def, steps: [...steps, step] };
      }
      const idx = steps.findIndex((s) => s.key === afterKey);
      if (idx < 0) {
        return { ...def, steps: [...steps, step] };
      }
      steps.splice(idx + 1, 0, step);
      return { ...def, steps };
    });

    this.nodePositions.set(new Map());
    this.selectNode(`step:${step.key}`);
  }

  removeSelectedStep(): void {
    const step = this.selectedStep();
    if (!step) return;
    if (this.definition().steps.length <= 1) {
      this.feedback.error('O fluxo precisa de pelo menos uma etapa');
      return;
    }
    this.definition.update((def) => ({
      ...def,
      steps: def.steps.filter((s) => s.key !== step.key),
    }));
    this.selectedNodeId.set(null);
    this.closeConfigDialog();
  }

  moveSelected(delta: -1 | 1): void {
    const step = this.selectedStep();
    if (!step) return;
    this.commitSelectedStep();
    this.definition.update((def) => {
      const steps = [...def.steps];
      const index = steps.findIndex((s) => s.key === step.key);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= steps.length) return def;
      const [item] = steps.splice(index, 1);
      steps.splice(next, 0, item);
      return { ...def, steps };
    });
    this.nodePositions.set(new Map());
  }

  onPositionsChange(moved: Array<{ id: string; position: { x: number; y: number } }>): void {
    this.nodePositions.update((map) => {
      const next = new Map(map);
      for (const item of moved) next.set(item.id, item.position);
      return next;
    });
  }

  /** Reorders steps so target comes right after source (linear workflow). */
  onConnectNodes(event: { sourceNodeId: string; targetNodeId: string }): void {
    this.commitSelectedStep();
    const { sourceNodeId, targetNodeId } = event;
    if (sourceNodeId === targetNodeId || targetNodeId === 'trigger') return;

    const targetKey = targetNodeId.startsWith('step:') ? targetNodeId.slice(5) : null;
    if (!targetKey) return;

    this.definition.update((def) => {
      const steps = [...def.steps];
      const targetIdx = steps.findIndex((s) => s.key === targetKey);
      if (targetIdx < 0) return def;
      const [target] = steps.splice(targetIdx, 1);

      if (sourceNodeId === 'trigger') {
        return { ...def, steps: [target, ...steps] };
      }

      const sourceKey = sourceNodeId.startsWith('step:') ? sourceNodeId.slice(5) : null;
      if (!sourceKey) {
        return { ...def, steps: [...steps, target] };
      }

      const sourceIdx = steps.findIndex((s) => s.key === sourceKey);
      if (sourceIdx < 0) {
        return { ...def, steps: [...steps, target] };
      }
      steps.splice(sourceIdx + 1, 0, target);
      return { ...def, steps };
    });

    this.nodePositions.set(new Map());
    this.selectedNodeId.set(targetNodeId);
  }

  save(): void {
    this.commitSelectedStep();
    this.commitTriggerConfig();
    this.commitEffects();

    if (this.metaForm.invalid) {
      this.metaForm.markAllAsTouched();
      this.feedback.error('Informe um nome válido');
      return;
    }
    if (!this.definition().steps.length) {
      this.feedback.error('Adicione ao menos uma etapa ao fluxo');
      return;
    }

    const body = {
      name: this.metaForm.controls.name.value.trim(),
      enabled: this.metaForm.controls.enabled.value,
      definition: this.definition(),
    };

    this.saving.set(true);
    const req$ = this.isNew()
      ? this.api.createWorkflow(body)
      : this.api.updateWorkflow(this.workflowId()!, body);

    req$.subscribe({
      next: (wf) => {
        this.saving.set(false);
        this.feedback.success(this.isNew() ? 'Workflow criado' : 'Workflow salvo');
        this.isNew.set(false);
        this.workflowId.set(wf.id);
        this.savedDuringSession = true;
        this.loadWorkflow(wf);
      },
      error: (err) => {
        this.saving.set(false);
        this.feedback.fromError(err, 'Falha ao salvar workflow');
      },
    });
  }

  stepMeta = stepTypeMeta;

  private commitTriggerConfig(): void {
    const type = this.triggerTypeControl.value;
    const config = this.readTriggerConfig();
    this.definition.update((def) => ({
      ...def,
      trigger: { type, config },
    }));
  }

  private readTriggerConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    const descriptor = this.selectedTrigger();
    const controls = this.triggerConfigControls();
    for (const field of descriptor?.configFields ?? []) {
      const raw = controls[field.name]?.value?.trim();
      if (!raw) continue;
      if (field.type === 'boolean') config[field.name] = raw === 'true';
      else if (field.type === 'string[]') {
        config[field.name] = raw.split(',').map((v) => v.trim()).filter(Boolean);
      } else config[field.name] = raw;
    }
    return config;
  }

  private commitEffects(): void {
    const status = this.stepForm.controls.effectsPersonStatus.value;
    this.definition.update((def) => ({
      ...def,
      effects: status
        ? { onSuccessPersonStatus: status }
        : undefined,
    }));
  }

  private commitSelectedStep(): void {
    const current = this.selectedStep();
    if (!current) return;
    const raw = this.stepForm.getRawValue();
    const nextKey = raw.key.trim() || current.key;
    const updated = this.buildStepFromForm(nextKey, raw.type);

    this.definition.update((def) => {
      const steps = def.steps.map((s) => (s.key === current.key ? updated : s));
      return { ...def, steps };
    });

    if (nextKey !== current.key) {
      this.selectedNodeId.set(`step:${nextKey}`);
    }
  }

  private buildStepFromForm(key: string, type: WorkflowStepType): WorkflowDefinitionStep {
    const raw = this.stepForm.getRawValue();
    const providerFilter = stepRequiresProviders(type)
      ? raw.providerFilter.filter(Boolean)
      : [];
    const connectionIds = raw.connectionIds
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    const step: WorkflowDefinitionStep = {
      key,
      type,
      providerFilter: providerFilter.length ? providerFilter : undefined,
      connectionIds: connectionIds.length ? connectionIds : undefined,
    };

    switch (type) {
      case 'delay':
        step.delayMs = Math.max(1, raw.delayMs) * 1000;
        break;
      case 'notify':
        step.notify = {
          channel: raw.notifyChannel,
          template: raw.notifyTemplate.trim() || 'custom',
          to: raw.notifyTo,
        };
        break;
      case 'approval':
        step.approval = {
          roleKeys: raw.approvalRoles
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          timeoutMs: raw.approvalTimeoutSec > 0 ? raw.approvalTimeoutSec * 1000 : undefined,
        };
        break;
      case 'webhook':
        step.webhook = {
          url: raw.webhookUrl.trim(),
          method: raw.webhookMethod,
          bodyTemplate: raw.webhookBody.trim() || undefined,
        };
        break;
      case 'condition':
        step.condition = {
          op: raw.conditionOp,
          equals: raw.conditionEquals.trim() || undefined,
          provider: raw.conditionProvider.trim() || undefined,
          orgUnitId: raw.conditionOrgUnitId.trim() || undefined,
          then: raw.conditionThen,
        };
        break;
    }
    return step;
  }
}
