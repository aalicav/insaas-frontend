import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JsonPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subscription, switchMap, timer, takeWhile } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ConnectionsApiService } from '../../../core/api/connections-api.service';
import { IdentitiesApiService } from '../../../core/api/identities-api.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { authTypeLabel, knownStatEntries, providerLabel } from '../../../shared/labels/domain-labels';
import { HelpHints } from '../../../shared/labels/help-hints';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';
import { RelativeTimePipe, fullDate } from '../../../shared/pipes/relative-time.pipe';
import { Connection, SyncStatusResponse } from '../../../core/models/connection.models';

type SyncJobSnapshot = NonNullable<SyncStatusResponse['latest']> & {
  durationMs?: number | null;
};

@Component({
  selector: 'app-connection-detail',
  standalone: true,
  imports: [
    RouterLink,
    RelativeTimePipe,
    JsonPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    BreadcrumbComponent,
    InfoHintComponent,
  ],
  templateUrl: './connection-detail.component.html',
  styleUrl: './connection-detail.component.scss',
})
export class ConnectionDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ConnectionsApiService);
  private readonly identitiesApi = inject(IdentitiesApiService);
  private readonly feedback = inject(FeedbackService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly syncing = signal(false);
  readonly creatingIdentity = signal(false);
  readonly syncStatusError = signal<string | null>(null);
  readonly connection = signal<Connection | null>(null);
  readonly syncStatus = signal<SyncStatusResponse | null>(null);
  readonly recentJobs = signal<SyncJobSnapshot[]>([]);
  private pollSub?: Subscription;
  private connectionId: string | null = null;

  readonly identityForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: [''],
  });

  readonly authTypeLabel = authTypeLabel;
  readonly providerLabel = providerLabel;
  readonly fullDate = fullDate;
  readonly knownStatEntries = knownStatEntries;
  readonly statEntries = computed(() => knownStatEntries(this.syncStatus()?.latest?.stats));

  canSync = () => this.auth.hasPermission('sync:run');
  canLifecycle = () => this.auth.hasPermission('lifecycle:write');

  ngOnInit(): void {
    this.connectionId = this.route.snapshot.paramMap.get('id');
    if (!this.connectionId) {
      this.loading.set(false);
      this.error.set('Conexão não encontrada');
      return;
    }
    this.reload();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  reload(): void {
    const id = this.connectionId ?? this.connection()?.id;
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.getConnection(id).subscribe({
      next: (connection) => {
        this.connection.set(connection);
        this.loading.set(false);
        this.refreshSync(id);
      },
      error: (err) => {
        this.loading.set(false);
        this.connection.set(null);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar conexão'));
      },
    });
  }

  refreshSync(id = this.connection()?.id): void {
    if (!id) return;
    this.syncStatusError.set(null);
    this.api.syncStatus(id).subscribe({
      next: (status) => {
        this.syncStatus.set(status);
        this.rememberJob(status.latest);
      },
      error: (err) => {
        this.syncStatusError.set(extractApiErrorMessage(err, 'Falha ao carregar status do sync'));
      },
    });
  }

  startSync(): void {
    const id = this.connection()?.id;
    if (!id) return;
    this.syncing.set(true);
    this.api.startSync(id).subscribe({
      next: () => {
        this.feedback.success('Sincronização enfileirada');
        this.pollSync(id);
      },
      error: (err) => {
        this.syncing.set(false);
        this.feedback.fromError(err, 'Falha ao iniciar sincronização');
      },
    });
  }

  formatDuration(job: SyncJobSnapshot): string {
    const ms = job.durationMs ?? durationBetween(job.startedAt, job.finishedAt);
    if (ms == null) return '—';
    if (ms < 1000) return `${ms} ms`;
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec} s`;
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem ? `${min} min ${rem} s` : `${min} min`;
  }

  private pollSync(id: string): void {
    this.pollSub?.unsubscribe();
    this.pollSub = timer(0, 2000)
      .pipe(
        switchMap(() => this.api.syncStatus(id)),
        takeWhile((status) => {
          const current = status.latest?.status;
          return current === 'queued' || current === 'running' || !current;
        }, true),
      )
      .subscribe({
        next: (status) => {
          this.syncStatus.set(status);
          this.rememberJob(status.latest);
          const current = status.latest?.status;
          if (current === 'success' || current === 'failed') {
            this.syncing.set(false);
            if (current === 'success') this.feedback.success('Sincronização concluída');
            if (current === 'failed') this.feedback.error(status.latest?.error || 'Sincronização falhou');
            this.reload();
          }
        },
        error: (err) => {
          this.syncing.set(false);
          this.feedback.fromError(err, 'Falha ao acompanhar sincronização');
        },
      });
  }

  private rememberJob(latest: SyncStatusResponse['latest']): void {
    if (!latest?.id) return;
    const snapshot: SyncJobSnapshot = {
      ...latest,
      durationMs: durationBetween(latest.startedAt, latest.finishedAt),
    };
    this.recentJobs.update((jobs) => {
      const without = jobs.filter((j) => j.id !== snapshot.id);
      return [snapshot, ...without].slice(0, 8);
    });
  }

  createIdentity(): void {
    if (!this.connectionId || this.identityForm.invalid) {
      this.identityForm.markAllAsTouched();
      return;
    }
    const raw = this.identityForm.getRawValue();
    this.creatingIdentity.set(true);
    this.identitiesApi
      .createOnConnection(this.connectionId, {
        email: raw.email,
        displayName: raw.displayName || undefined,
      })
      .subscribe({
        next: () => {
          this.creatingIdentity.set(false);
          this.identityForm.reset({ email: '', displayName: '' });
          this.feedback.success('Identidade criada no provider');
        },
        error: (err) => {
          this.creatingIdentity.set(false);
          this.feedback.fromError(err, 'Falha ao criar identidade');
        },
      });
  }
}

function durationBetween(
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined,
): number | null {
  if (!startedAt || !finishedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return end - start;
}
