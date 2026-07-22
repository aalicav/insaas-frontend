import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { WorkflowsApiService } from '../../core/api/workflows-api.service';
import { extractApiErrorMessage } from '../../core/api/api-error';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { RelativeTimePipe, fullDate } from '../../shared/pipes/relative-time.pipe';
import { providerLabel } from '../../shared/labels/domain-labels';
import { HelpHints } from '../../shared/labels/help-hints';
import { WorkflowRun, WorkflowRunStep } from '../../core/models/workflows.models';
import { WorkflowFlowCanvasComponent } from '../workflows/flow/workflow-flow-canvas.component';
import { layoutDefinition, parseWorkflowDefinition } from '../workflows/workflow-meta';
import { openWorkflowEditorDialog } from '../workflows/open-workflow-editor-dialog';

@Component({
  selector: 'app-lifecycle-detail',
  standalone: true,
  imports: [
    RouterLink,
    RelativeTimePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    BreadcrumbComponent,
    WorkflowFlowCanvasComponent,
  ],
  templateUrl: './lifecycle-detail.component.html',
  styleUrl: './lifecycle-detail.component.scss',
})
export class LifecycleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(WorkflowsApiService);
  private readonly feedback = inject(FeedbackService);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly run = signal<WorkflowRun | null>(null);
  readonly actingStepId = signal<string | null>(null);
  readonly selectedStepId = signal<string | null>(null);
  readonly providerLabel = providerLabel;
  readonly fullDate = fullDate;
  private runId: string | null = null;

  readonly flowGraph = computed(() => {
    const r = this.run();
    if (!r) return null;
    const def = parseWorkflowDefinition({
      trigger: { type: r.trigger, config: {} },
      steps: r.steps
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          key: s.stepKey,
          type: s.type,
          ...(typeof s.config === 'object' && s.config ? s.config : {}),
        })),
    });
    const statusByStepKey = new Map(
      r.steps.map((s) => [s.stepKey, { status: s.status, error: s.error }]),
    );
    return layoutDefinition(def, statusByStepKey);
  });

  readonly selectedStep = computed(() => {
    const id = this.selectedStepId();
    const r = this.run();
    if (!id || !r || !id.startsWith('step:')) return null;
    const key = id.slice(5);
    return r.steps.find((s) => s.stepKey === key) ?? null;
  });

  canWrite = () => this.auth.hasPermission('lifecycle:write');

  ngOnInit(): void {
    this.runId = this.route.snapshot.paramMap.get('id');
    if (!this.runId) {
      this.loading.set(false);
      this.error.set('Execução não encontrada');
      return;
    }
    this.reload();
  }

  reload(): void {
    if (!this.runId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.getRun(this.runId).subscribe({
      next: (run) => this.applyRun(run),
      error: (err) => {
        this.api.getLifecycleRun(this.runId!).subscribe({
          next: (run) => this.applyRun(run),
          error: (err2) => {
            this.loading.set(false);
            this.run.set(null);
            this.error.set(
              extractApiErrorMessage(
                err2,
                extractApiErrorMessage(err, 'Falha ao carregar execução'),
              ),
            );
          },
        });
      },
    });
  }

  private applyRun(run: WorkflowRun): void {
    this.run.set(run);
    this.loading.set(false);
    const waiting = run.steps.find((s) => s.status === 'waiting');
    this.selectedStepId.set(
      waiting
        ? `step:${waiting.stepKey}`
        : run.steps[0]
          ? `step:${run.steps[0].stepKey}`
          : null,
    );
  }

  selectNode(id: string): void {
    this.selectedStepId.set(id);
  }

  openWorkflowEditor(): void {
    const workflowId = this.run()?.organizationWorkflowId;
    if (!workflowId) return;
    openWorkflowEditorDialog(this.dialog, { workflowId });
  }

  canActOnStep(step: WorkflowRunStep): boolean {
    return (
      this.canWrite() &&
      step.type === 'approval' &&
      step.status === 'waiting' &&
      this.run()?.status === 'waiting_approval'
    );
  }

  approveStep(step: WorkflowRunStep): void {
    if (!this.runId || !this.canActOnStep(step)) return;
    this.actingStepId.set(step.id);
    this.api.approveStep(this.runId, step.id).subscribe({
      next: (updated) => {
        this.actingStepId.set(null);
        this.run.set(updated);
        this.feedback.success('Etapa aprovada');
      },
      error: (err) => {
        this.actingStepId.set(null);
        this.feedback.fromError(err, 'Falha ao aprovar etapa');
      },
    });
  }

  rejectStep(step: WorkflowRunStep): void {
    if (!this.runId || !this.canActOnStep(step)) return;
    this.actingStepId.set(step.id);
    this.api.rejectStep(this.runId, step.id).subscribe({
      next: (updated) => {
        this.actingStepId.set(null);
        this.run.set(updated);
        this.feedback.success('Etapa rejeitada');
      },
      error: (err) => {
        this.actingStepId.set(null);
        this.feedback.fromError(err, 'Falha ao rejeitar etapa');
      },
    });
  }

  stepTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      approval: 'Aprovação',
      suspend_identity: 'Suspender identidade',
      create_identity: 'Criar identidade',
      delete_identity: 'Excluir identidade',
      notify: 'Notificação',
      delay: 'Aguardar',
      webhook: 'Webhook',
      condition: 'Condição',
    };
    return labels[type] ?? type;
  }

  stepStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      waiting: 'Aguardando',
      running: 'Em execução',
      success: 'Concluído',
      succeeded: 'Concluído',
      failed: 'Falhou',
      skipped: 'Ignorado',
      pending: 'Pendente',
    };
    return labels[status] ?? status;
  }

  runStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      waiting_approval: 'Aguardando aprovação',
      running: 'Em execução',
      success: 'Concluído',
      succeeded: 'Concluído',
      failed: 'Falhou',
      cancelled: 'Cancelado',
      pending: 'Pendente',
      queued: 'Na fila',
      partial: 'Parcial',
    };
    return labels[status] ?? status;
  }
}
