import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { PeopleApiService } from '../../../core/api/people-api.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { RelativeTimePipe, fullDate } from '../../../shared/pipes/relative-time.pipe';
import { Person } from '../../../core/models/people.models';
import { HelpHints } from '../../../shared/labels/help-hints';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';
import { absenceReasonLabel } from '../../../shared/labels/domain-labels';

@Component({
  selector: 'app-people-list',
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
    MatProgressSpinnerModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    InfoHintComponent,
  ],
  templateUrl: './people-list.component.html',
  styleUrl: './people-list.component.scss',
})
export class PeopleListComponent implements OnInit {
  private readonly api = inject(PeopleApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly reconciling = signal(false);
  readonly people = signal<Person[]>([]);
  readonly columns = ['displayName', 'email', 'status', 'team', 'costCenter', 'evidence'];
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly fullDate = fullDate;
  readonly absenceReasonLabel = absenceReasonLabel;

  readonly filters = this.fb.nonNullable.group({
    q: [''],
    status: [''],
    inactiveDays: [''],
    activity: [''],
    onLeave: [''],
    provider: [''],
    connectionId: [''],
    unassignedTeam: [false],
    unassignedCostCenter: [false],
  });

  readonly hasActiveFilters = computed(() => {
    const raw = this.filters.getRawValue();
    return !!(
      raw.q ||
      raw.status ||
      raw.inactiveDays ||
      raw.activity ||
      raw.onLeave ||
      raw.provider ||
      raw.connectionId ||
      raw.unassignedTeam ||
      raw.unassignedCostCenter
    );
  });

  canWrite = () => this.auth.hasPermission('people:write');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const raw = this.filters.getRawValue();
    this.api
      .list({
        q: raw.q || undefined,
        status: (raw.status as 'active' | 'inactive') || undefined,
        inactiveDays: raw.inactiveDays ? Number(raw.inactiveDays) : undefined,
        activity: (raw.activity as 'unknown') || undefined,
        onLeave:
          raw.onLeave === '1' ? true : raw.onLeave === '0' ? false : undefined,
        provider: raw.provider || undefined,
        connectionId: raw.connectionId || undefined,
        unassignedTeam: raw.unassignedTeam || undefined,
        unassignedCostCenter: raw.unassignedCostCenter || undefined,
      })
      .subscribe({
        next: (items) => {
          this.people.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(extractApiErrorMessage(err, 'Falha ao carregar pessoas'));
        },
      });
  }

  clearFilters(): void {
    this.filters.reset({
      q: '',
      status: '',
      inactiveDays: '',
      activity: '',
      onLeave: '',
      provider: '',
      connectionId: '',
      unassignedTeam: false,
      unassignedCostCenter: false,
    });
    this.reload();
  }

  open(row: Person): void {
    void this.router.navigate(['/people', row.id]);
  }

  reconcile(): void {
    this.reconciling.set(true);
    this.api.reconcile().subscribe({
      next: () => {
        this.reconciling.set(false);
        this.feedback.success('Cadastro atualizado');
        this.reload();
      },
      error: (err) => {
        this.reconciling.set(false);
        this.feedback.fromError(err, 'Falha ao atualizar cadastro');
      },
    });
  }
}
