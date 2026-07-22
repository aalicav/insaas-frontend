import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsApiService } from '../../core/api/notifications-api.service';
import { extractApiErrorMessage } from '../../core/api/api-error';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { RelativeTimePipe, fullDate } from '../../shared/pipes/relative-time.pipe';
import { Notification } from '../../core/models/notifications.models';

@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    RelativeTimePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
  ],
  templateUrl: './notifications-list.component.html',
  styleUrl: './notifications-list.component.scss',
})
export class NotificationsListComponent implements OnInit {
  private readonly api = inject(NotificationsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly markingAll = signal(false);
  readonly markingId = signal<string | null>(null);
  readonly items = signal<Notification[]>([]);
  readonly total = signal(0);
  readonly columns = ['severity', 'title', 'category', 'readAt', 'createdAt'];
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly fullDate = fullDate;
  readonly pageSize = 25;

  readonly filters = this.fb.nonNullable.group({
    unread: [''],
  });

  readonly hasActiveFilters = computed(() => !!this.filters.getRawValue().unread);

  canRead = () => this.auth.hasPermission('notifications:read');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const raw = this.filters.getRawValue();
    this.api
      .list({
        unread: raw.unread === 'unread' ? true : raw.unread === 'read' ? false : undefined,
        limit: this.pageSize,
        skip: 0,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(extractApiErrorMessage(err, 'Falha ao carregar notificações'));
        },
      });
  }

  clearFilters(): void {
    this.filters.reset({ unread: '' });
    this.reload();
  }

  markAllRead(): void {
    this.markingAll.set(true);
    this.api.markAllRead().subscribe({
      next: () => {
        this.markingAll.set(false);
        this.feedback.success('Notificações marcadas como lidas');
        this.reload();
      },
      error: (err) => {
        this.markingAll.set(false);
        this.feedback.fromError(err, 'Falha ao marcar notificações');
      },
    });
  }

  open(row: Notification): void {
    if (!row.readAt) {
      this.markingId.set(row.id);
      this.api.markRead(row.id).subscribe({
        next: () => {
          this.markingId.set(null);
          this.items.update((list) =>
            list.map((n) =>
              n.id === row.id ? { ...n, readAt: new Date().toISOString() } : n,
            ),
          );
        },
        error: () => this.markingId.set(null),
      });
    }
    const route = this.resourceRoute(row);
    if (route) void this.router.navigate(route);
  }

  severityLabel(severity: string): string {
    const labels: Record<string, string> = {
      info: 'Info',
      warning: 'Aviso',
      risk: 'Risco',
    };
    return labels[severity] ?? severity;
  }

  categoryLabel(category: string): string {
    const labels: Record<string, string> = {
      risk: 'Risco',
      contract: 'Contrato',
      lifecycle: 'Workflows',
    };
    return labels[category] ?? category;
  }

  private resourceRoute(row: Notification): string[] | null {
    if (row.resourceType === 'workflow_run' && row.resourceId) {
      return ['/workflows/runs', row.resourceId];
    }
    if (row.resourceType === 'person' && row.resourceId) {
      return ['/people', row.resourceId];
    }
    return null;
  }
}
