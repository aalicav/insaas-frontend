import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { ShadowItApiService } from '../../core/api/shadow-it-api.service';
import { InventoryApiService } from '../../core/api/inventory-api.service';
import { extractApiErrorMessage } from '../../core/api/api-error';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { providerLabel } from '../../shared/labels/domain-labels';
import { HelpHints } from '../../shared/labels/help-hints';
import { ShadowApp, ShadowItSummary } from '../../core/models/shadow-it.models';

@Component({
  selector: 'app-shadow-it',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
  ],
  templateUrl: './shadow-it.component.html',
  styleUrl: './shadow-it.component.scss',
})
export class ShadowItComponent implements OnInit {
  private readonly api = inject(ShadowItApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;
  readonly providerLabel = providerLabel;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly apps = signal<ShadowApp[]>([]);
  readonly summary = signal<ShadowItSummary | null>(null);
  readonly actingId = signal<string | null>(null);

  readonly columns = [
    'name',
    'provider',
    'consents',
    'scopes',
    'status',
    'actions',
  ];
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly filters = this.fb.nonNullable.group({
    q: [''],
    includeIgnored: [false],
  });

  readonly canWrite = computed(() => this.auth.hasPermission('inventory:write'));

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const { q, includeIgnored } = this.filters.getRawValue();

    this.api.summary().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summary.set(null),
    });

    this.api.list({ q, includeIgnored }).subscribe({
      next: (rows) => {
        this.apps.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  ignore(app: ShadowApp): void {
    this.actingId.set(app.id);
    this.api.ignore(app.id).subscribe({
      next: () => {
        this.feedback.success(`${app.name} ignorado`);
        this.actingId.set(null);
        this.reload();
      },
      error: (err) => {
        this.feedback.error(extractApiErrorMessage(err));
        this.actingId.set(null);
      },
    });
  }

  reopen(app: ShadowApp): void {
    this.actingId.set(app.id);
    this.api.reopen(app.id).subscribe({
      next: () => {
        this.feedback.success(`${app.name} reaberto`);
        this.actingId.set(null);
        this.reload();
      },
      error: (err) => {
        this.feedback.error(extractApiErrorMessage(err));
        this.actingId.set(null);
      },
    });
  }

  sanction(app: ShadowApp): void {
    const ownerUserId = this.auth.me()?.id ?? null;
    if (!ownerUserId) {
      this.feedback.error('Sessão inválida — faça login novamente');
      return;
    }
    this.actingId.set(app.id);
    this.inventoryApi
      .updateApp(app.id, {
        status: 'sanctioned',
        ownerUserId,
      })
      .subscribe({
        next: () => {
          this.feedback.success(`${app.name} autorizado no inventário`);
          this.actingId.set(null);
          this.reload();
        },
        error: (err) => {
          this.feedback.error(extractApiErrorMessage(err));
          this.actingId.set(null);
        },
      });
  }

  scopePreview(scopes: string[]): string {
    if (!scopes.length) return '—';
    const shown = scopes.slice(0, 3).join(', ');
    return scopes.length > 3 ? `${shown} +${scopes.length - 3}` : shown;
  }
}
