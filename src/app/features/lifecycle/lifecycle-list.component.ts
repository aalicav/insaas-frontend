import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { WorkflowsApiService } from '../../core/api/workflows-api.service';
import { extractApiErrorMessage } from '../../core/api/api-error';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { RelativeTimePipe, fullDate } from '../../shared/pipes/relative-time.pipe';
import { WorkflowRun } from '../../core/models/workflows.models';
import { HelpHints } from '../../shared/labels/help-hints';
import { InfoHintComponent } from '../../shared/components/info-hint/info-hint.component';

@Component({
  selector: 'app-lifecycle-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    RelativeTimePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    InfoHintComponent,
  ],
  templateUrl: './lifecycle-list.component.html',
  styleUrl: './lifecycle-list.component.scss',
})
export class LifecycleListComponent implements OnInit {
  private readonly api = inject(WorkflowsApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly runs = signal<WorkflowRun[]>([]);
  readonly columns = ['person', 'workflow', 'trigger', 'status', 'startedAt'];
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly fullDate = fullDate;

  readonly filters = this.fb.nonNullable.group({
    kind: [''],
    trigger: [''],
    personId: [''],
  });

  readonly hasActiveFilters = computed(() => {
    const raw = this.filters.getRawValue();
    return !!(raw.kind || raw.trigger || raw.personId);
  });

  canRead = () => this.auth.hasPermission('lifecycle:read');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const raw = this.filters.getRawValue();
    this.api
      .listLifecycleRuns({
        kind: raw.kind || undefined,
        trigger: raw.trigger || undefined,
        personId: raw.personId || undefined,
      })
      .subscribe({
        next: (items) => {
          this.runs.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(extractApiErrorMessage(err, 'Falha ao carregar execuções'));
        },
      });
  }

  clearFilters(): void {
    this.filters.reset({ kind: '', trigger: '', personId: '' });
    this.reload();
  }

  open(row: WorkflowRun): void {
    void this.router.navigate(['/lifecycle', row.id]);
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      waiting_approval: 'Aguardando aprovação',
      waiting: 'Aguardando',
      running: 'Em execução',
      success: 'Concluído',
      failed: 'Falhou',
      cancelled: 'Cancelado',
      pending: 'Pendente',
    };
    return labels[status] ?? status;
  }
}
