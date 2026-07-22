import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../core/auth/auth.service';
import { AuditApiService } from '../../core/api/audit-api.service';
import { extractApiErrorMessage } from '../../core/api/api-error';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { RelativeTimePipe, fullDate } from '../../shared/pipes/relative-time.pipe';
import { AuditEvent } from '../../core/models/audit.models';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RelativeTimePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
  ],
  templateUrl: './audit-list.component.html',
  styleUrl: './audit-list.component.scss',
})
export class AuditListComponent implements OnInit {
  private readonly api = inject(AuditApiService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<AuditEvent[]>([]);
  readonly total = signal(0);
  readonly columns = ['createdAt', 'action', 'actorEmail', 'resourceType', 'outcome'];
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];
  readonly fullDate = fullDate;
  readonly pageSize = 50;

  readonly filters = this.fb.nonNullable.group({
    from: [''],
    to: [''],
    action: [''],
    resourceType: [''],
  });

  readonly hasActiveFilters = computed(() => {
    const raw = this.filters.getRawValue();
    return !!(raw.from || raw.to || raw.action || raw.resourceType);
  });

  canRead = () => this.auth.hasPermission('audit:read');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const raw = this.filters.getRawValue();
    this.api
      .list({
        from: raw.from || undefined,
        to: raw.to || undefined,
        action: raw.action || undefined,
        resourceType: raw.resourceType || undefined,
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
          this.error.set(extractApiErrorMessage(err, 'Falha ao carregar auditoria'));
        },
      });
  }

  clearFilters(): void {
    this.filters.reset({ from: '', to: '', action: '', resourceType: '' });
    this.reload();
  }

  outcomeLabel(outcome: string): string {
    const labels: Record<string, string> = {
      success: 'Sucesso',
      failure: 'Falha',
      denied: 'Negado',
    };
    return labels[outcome] ?? outcome;
  }
}
