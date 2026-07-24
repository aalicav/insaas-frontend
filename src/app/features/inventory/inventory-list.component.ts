import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
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
import { InfoHintComponent } from '../../shared/components/info-hint/info-hint.component';
import {
  ManagedApp,
  ManagedAppCriticality,
  ManagedAppStatus,
} from '../../core/models/inventory.models';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.scss',
})
export class InventoryListComponent implements OnInit {
  private readonly api = inject(InventoryApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly creating = signal(false);
  readonly promoting = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly apps = signal<ManagedApp[]>([]);
  readonly tagOptions = signal<string[]>([]);

  readonly columns = ['name', 'status', 'criticality', 'owner', 'source', 'tags', 'actions'];
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly providerLabel = providerLabel;

  readonly filters = this.fb.nonNullable.group({
    q: [''],
    status: ['' as '' | ManagedAppStatus],
    criticality: ['' as '' | ManagedAppCriticality],
    tag: [''],
  });

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    status: ['unmanaged' as ManagedAppStatus],
    criticality: ['medium' as ManagedAppCriticality],
    description: [''],
    tags: [''],
  });

  readonly promoteForm = this.fb.nonNullable.group({
    sourceAppId: ['', Validators.required],
    name: [''],
    criticality: ['medium' as ManagedAppCriticality],
    description: [''],
    tags: [''],
  });

  readonly hasActiveFilters = computed(() => {
    const raw = this.filters.getRawValue();
    return !!(raw.q || raw.status || raw.criticality || raw.tag);
  });

  canWrite = () => this.auth.hasPermission('inventory:write');

  ngOnInit(): void {
    this.api.listTags().subscribe({
      next: (tags) => this.tagOptions.set(tags.map((t) => t.name).sort()),
      error: () => this.tagOptions.set([]),
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const raw = this.filters.getRawValue();
    this.api
      .listApps({
        q: raw.q || undefined,
        status: raw.status || undefined,
        criticality: raw.criticality || undefined,
        tag: raw.tag || undefined,
      })
      .subscribe({
        next: (items) => {
          this.apps.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(extractApiErrorMessage(err, 'Falha ao carregar inventário'));
        },
      });
  }

  clearFilters(): void {
    this.filters.reset({ q: '', status: '', criticality: '', tag: '' });
    this.reload();
  }

  open(row: ManagedApp): void {
    void this.router.navigate(['/inventory', row.id]);
  }

  parseTags(value: string): string[] {
    return value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  criticalityLabel(value: ManagedAppCriticality | string): string {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      critical: 'Crítica',
    };
    return labels[value] ?? value;
  }

  statusLabel(value: ManagedAppStatus | string): string {
    const labels: Record<string, string> = {
      unmanaged: 'Não gerenciado',
      sanctioned: 'Autorizado',
      ignored: 'Ignorado',
    };
    return labels[value] ?? value;
  }

  ownerLabel(row: ManagedApp): string {
    return row.ownerPerson?.displayName || row.ownerUser?.name || row.ownerUser?.email || '—';
  }

  createApp(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    const raw = this.createForm.getRawValue();
    this.api
      .createApp({
        name: raw.name.trim(),
        status: raw.status,
        criticality: raw.criticality,
        description: raw.description.trim() || undefined,
        tags: this.parseTags(raw.tags),
      })
      .subscribe({
        next: (app) => {
          this.creating.set(false);
          this.feedback.success('App adicionado ao inventário');
          this.createForm.reset({
            name: '',
            status: 'unmanaged',
            criticality: 'medium',
            description: '',
            tags: '',
          });
          void this.router.navigate(['/inventory', app.id]);
        },
        error: (err) => {
          this.creating.set(false);
          this.feedback.fromError(err, 'Falha ao criar app');
        },
      });
  }

  promoteApp(): void {
    if (this.promoteForm.invalid) {
      this.promoteForm.markAllAsTouched();
      return;
    }
    this.promoting.set(true);
    const raw = this.promoteForm.getRawValue();
    this.api
      .promote({
        sourceAppId: raw.sourceAppId.trim(),
        name: raw.name.trim() || undefined,
        criticality: raw.criticality,
        description: raw.description.trim() || undefined,
        tags: this.parseTags(raw.tags),
      })
      .subscribe({
        next: (app) => {
          this.promoting.set(false);
          this.feedback.success('App promovido para o inventário');
          this.promoteForm.reset({
            sourceAppId: '',
            name: '',
            criticality: 'medium',
            description: '',
            tags: '',
          });
          this.reload();
          void this.router.navigate(['/inventory', app.id]);
        },
        error: (err) => {
          this.promoting.set(false);
          this.feedback.fromError(err, 'Falha ao promover app');
        },
      });
  }

  deleteApp(row: ManagedApp, event: Event): void {
    event.stopPropagation();
    if (!this.canWrite()) return;
    if (!window.confirm(`Remover "${row.name}" do inventário? O app sincronizado não será apagado.`)) {
      return;
    }

    this.deletingId.set(row.id);
    this.api.deleteApp(row.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.feedback.success('App removido do inventário');
        this.reload();
      },
      error: (err) => {
        this.deletingId.set(null);
        this.feedback.fromError(err, 'Falha ao remover app');
      },
    });
  }
}
