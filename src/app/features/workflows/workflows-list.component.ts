import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { WorkflowsApiService } from '../../core/api/workflows-api.service';
import { PeopleApiService } from '../../core/api/people-api.service';
import { extractApiErrorMessage } from '../../core/api/api-error';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { RelativeTimePipe, fullDate } from '../../shared/pipes/relative-time.pipe';
import {
  OrganizationWorkflow,
  TriggerDescriptor,
  TriggerWorkflowRequest,
} from '../../core/models/workflows.models';
import { Person } from '../../core/models/people.models';
import { HelpHints } from '../../shared/labels/help-hints';
import { InfoHintComponent } from '../../shared/components/info-hint/info-hint.component';
import { WorkflowFlowCanvasComponent } from './flow/workflow-flow-canvas.component';
import {
  layoutDefinition,
  parseWorkflowDefinition,
  stepTypeMeta,
  formatJsonTemplate,
  triggerIcon,
  triggerPayloadTemplate,
  triggerRequestTemplate,
} from './workflow-meta';
import { openWorkflowEditorDialog } from './open-workflow-editor-dialog';
import { WorkflowRunsPanelComponent } from './workflow-runs-panel.component';

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
  selector: 'app-workflows-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RelativeTimePipe,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatTooltipModule,
    MatExpansionModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    InfoHintComponent,
    WorkflowFlowCanvasComponent,
    WorkflowRunsPanelComponent,
  ],
  templateUrl: './workflows-list.component.html',
  styleUrl: './workflows-list.component.scss',
})
export class WorkflowsListComponent implements OnInit {
  private readonly api = inject(WorkflowsApiService);
  private readonly peopleApi = inject(PeopleApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly previewDialogTpl = viewChild.required<TemplateRef<unknown>>('previewDialog');
  private previewDialogRef: ReturnType<MatDialog['open']> | null = null;
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly togglingId = signal<string | null>(null);
  readonly triggering = signal(false);
  readonly startingRun = signal(false);
  readonly workflows = signal<OrganizationWorkflow[]>([]);
  readonly templates = signal<WorkflowTemplateRow[]>([]);
  readonly triggerTypes = signal<TriggerDescriptor[]>([]);
  readonly people = signal<Person[]>([]);
  readonly columns = ['preview', 'name', 'trigger', 'templateKey', 'enabled', 'updatedAt'];
  readonly skeletonRows = [1, 2, 3, 4];
  readonly fullDate = fullDate;
  readonly previewId = signal<string | null>(null);
  /** Payload / connection IDs — collapsed by default for common users. */
  readonly advancedOpen = signal(false);
  /** 0=Workflows, 1=Execuções, 2=Modelos, 3=Tipos */
  readonly selectedTab = signal(0);

  readonly triggerForm = this.fb.nonNullable.group({
    type: ['person.offboard', Validators.required],
    personId: [''],
    connectionIds: [''],
    payloadJson: ['{}\n'],
  });

  private lastAppliedPayloadTemplate = '{}\n';

  readonly startRunForm = this.fb.nonNullable.group({
    workflowId: ['', Validators.required],
    personId: ['', Validators.required],
    connectionIds: [''],
  });

  readonly selectedFireTrigger = computed(() => {
    const type = this.triggerForm.controls.type.value;
    return this.triggerTypes().find((t) => t.type === type) ?? null;
  });

  readonly previewGraph = computed(() => {
    const id = this.previewId();
    const wf = this.workflows().find((w) => w.id === id);
    if (!wf) return null;
    return layoutDefinition(parseWorkflowDefinition(wf.definition));
  });

  readonly previewWorkflow = computed(() => {
    const id = this.previewId();
    return this.workflows().find((w) => w.id === id) ?? null;
  });

  canManage = () => this.auth.hasPermission('workflows:manage');
  canTrigger = () => this.auth.hasPermission('lifecycle:write');
  canReadRuns = () => this.auth.hasPermission('lifecycle:read');

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'runs' && this.canReadRuns()) {
      this.selectedTab.set(1);
    } else if (!this.canManage() && this.canReadRuns()) {
      this.selectedTab.set(1);
    }
    this.reload();
    this.triggerForm.controls.type.valueChanges.subscribe((type) => {
      const descriptor = this.triggerTypes().find((t) => t.type === type);
      if (descriptor?.requiresPerson) {
        this.triggerForm.controls.personId.setValidators([Validators.required]);
      } else {
        this.triggerForm.controls.personId.clearValidators();
      }
      this.triggerForm.controls.personId.updateValueAndValidity({ emitEvent: false });
      // Only auto-swap payload when advanced is open and still on previous template / empty.
      if (this.advancedOpen()) {
        this.applyPayloadTemplate(type, false);
      }
    });
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: index === 1 ? { tab: 'runs' } : {},
      replaceUrl: true,
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const emptyWorkflows: OrganizationWorkflow[] = [];
    const emptyTemplates: WorkflowTemplateRow[] = [];
    const emptyTriggers: TriggerDescriptor[] = [];
    const emptyPeople: Person[] = [];

    if (!this.canManage() && this.canReadRuns()) {
      // Runs-only users: skip definition APIs (may 403 without workflows:manage).
      this.workflows.set(emptyWorkflows);
      this.templates.set(emptyTemplates);
      this.triggerTypes.set(emptyTriggers);
      this.people.set(emptyPeople);
      this.loading.set(false);
      return;
    }

    forkJoin({
      workflows: this.api.listWorkflows(),
      templates: this.api.listTemplates(),
      triggerTypes: this.api.listTriggerTypes(),
      people: this.peopleApi.list({ status: 'active' }),
    }).subscribe({
      next: ({ workflows, templates, triggerTypes, people }) => {
        this.workflows.set(workflows);
        this.templates.set(templates as unknown as WorkflowTemplateRow[]);
        this.triggerTypes.set(triggerTypes);
        this.people.set(people);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar workflows'));
      },
    });
  }

  openEditor(id?: string): void {
    openWorkflowEditorDialog(this.dialog, { workflowId: id ?? null })
      .afterClosed()
      .subscribe((result) => {
        if (result?.saved) {
          this.reload();
          if (result.workflowId) this.previewId.set(result.workflowId);
        }
      });
  }

  useTemplate(template: WorkflowTemplateRow): void {
    openWorkflowEditorDialog(this.dialog, { templateKey: template.key })
      .afterClosed()
      .subscribe((result) => {
        if (result?.saved) {
          this.reload();
          if (result.workflowId) this.previewId.set(result.workflowId);
        }
      });
  }

  openPreview(row: OrganizationWorkflow): void {
    this.previewId.set(row.id);
    this.previewDialogRef = this.dialog.open(this.previewDialogTpl(), {
      width: '960px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'wf-preview-dialog',
    });
    this.previewDialogRef.afterClosed().subscribe(() => {
      this.previewDialogRef = null;
    });
  }

  editFromPreview(): void {
    const id = this.previewId();
    this.previewDialogRef?.close();
    if (id) this.openEditor(id);
  }

  stepCount(definition: unknown): number {
    return parseWorkflowDefinition(definition).steps.length;
  }

  parseSteps(definition: unknown) {
    return parseWorkflowDefinition(definition).steps;
  }

  toggleEnabled(row: OrganizationWorkflow, enabled: boolean): void {
    this.togglingId.set(row.id);
    this.api.updateWorkflow(row.id, { enabled }).subscribe({
      next: (updated) => {
        this.togglingId.set(null);
        this.workflows.update((items) =>
          items.map((w) => (w.id === updated.id ? updated : w)),
        );
        this.feedback.success(enabled ? 'Workflow ativado' : 'Workflow desativado');
      },
      error: (err) => {
        this.togglingId.set(null);
        this.feedback.fromError(err, 'Falha ao atualizar workflow');
      },
    });
  }

  fireTrigger(): void {
    if (this.triggerForm.invalid) {
      this.triggerForm.markAllAsTouched();
      return;
    }
    const raw = this.triggerForm.getRawValue();
    let payload: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(raw.payloadJson || '{}') as unknown;
      payload =
        typeof parsed === 'object' && parsed !== null
          ? (parsed as Record<string, unknown>)
          : {};
    } catch {
      this.advancedOpen.set(true);
      this.feedback.error('Payload JSON inválido — revise em Configurações avançadas');
      return;
    }

    const body: TriggerWorkflowRequest = {
      type: raw.type,
      personId: raw.personId || undefined,
      connectionIds: this.parseUuidList(raw.connectionIds),
      payload,
    };

    this.triggering.set(true);
    this.api.trigger(body).subscribe({
      next: () => {
        this.triggering.set(false);
        this.feedback.success('Gatilho disparado');
      },
      error: (err) => {
        this.triggering.set(false);
        this.feedback.fromError(err, 'Falha ao disparar gatilho');
      },
    });
  }

  startRun(): void {
    if (this.startRunForm.invalid) {
      this.startRunForm.markAllAsTouched();
      return;
    }
    const raw = this.startRunForm.getRawValue();
    this.startingRun.set(true);
    this.api
      .startRun(raw.workflowId, {
        personId: raw.personId,
        connectionIds: this.parseUuidList(raw.connectionIds),
      })
      .subscribe({
        next: () => {
          this.startingRun.set(false);
          this.feedback.success('Execução iniciada');
        },
        error: (err) => {
          this.startingRun.set(false);
          this.feedback.fromError(err, 'Falha ao iniciar execução');
        },
      });
  }

  triggerLabel(type: string): string {
    return this.triggerTypes().find((t) => t.type === type)?.displayName ?? type;
  }

  stepIcon(type: string): string {
    return stepTypeMeta(type).icon;
  }

  triggerTypeIcon(type: string): string {
    return triggerIcon(type);
  }

  triggerJsonExample(trigger: TriggerDescriptor): string {
    return formatJsonTemplate(
      triggerRequestTemplate(trigger.type, { requiresPerson: trigger.requiresPerson }),
    );
  }

  applyPayloadTemplate(type?: string, force = true): void {
    const triggerType = type ?? this.triggerForm.controls.type.value;
    const next = formatJsonTemplate(triggerPayloadTemplate(triggerType));
    const current = this.triggerForm.controls.payloadJson.value;
    if (
      force ||
      !current.trim() ||
      current.trim() === '{}' ||
      current === this.lastAppliedPayloadTemplate
    ) {
      this.triggerForm.controls.payloadJson.setValue(next, { emitEvent: false });
      this.lastAppliedPayloadTemplate = next;
    }
  }

  copyJson(text: string): void {
    void navigator.clipboard.writeText(text).then(
      () => this.feedback.success('JSON copiado'),
      () => this.feedback.error('Não foi possível copiar'),
    );
  }

  useTriggerInFireForm(trigger: TriggerDescriptor): void {
    this.triggerForm.controls.type.setValue(trigger.type);
    this.applyPayloadTemplate(trigger.type, true);
    this.advancedOpen.set(true);
    document.getElementById('fire-trigger')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private parseUuidList(raw: string): string[] | undefined {
    const ids = raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return ids.length ? ids : undefined;
  }
}
