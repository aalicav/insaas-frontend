import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { CatalogApiService } from '../../core/api/catalog-api.service';
import { IdentitiesApiService } from '../../core/api/identities-api.service';
import { extractApiErrorMessage } from '../../core/api/api-error';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { RelativeTimePipe, fullDate } from '../../shared/pipes/relative-time.pipe';
import { providerLabel } from '../../shared/labels/domain-labels';
import { HelpHints } from '../../shared/labels/help-hints';
import { InfoHintComponent } from '../../shared/components/info-hint/info-hint.component';
import {
  CatalogApp,
  CatalogGroup,
  CatalogIdentity,
  CatalogLicense,
} from '../../core/models/catalog.models';

type CatalogTab = 'identities' | 'groups' | 'licenses' | 'apps';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RelativeTimePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    InfoHintComponent,
  ],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
})
export class CatalogComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly identitiesApi = inject(IdentitiesApiService);
  readonly HelpHints = HelpHints;
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<CatalogTab>('identities');
  readonly actionId = signal<string | null>(null);

  readonly identities = signal<CatalogIdentity[]>([]);
  readonly groups = signal<CatalogGroup[]>([]);
  readonly licenses = signal<CatalogLicense[]>([]);
  readonly apps = signal<CatalogApp[]>([]);

  readonly identityColumns = [
    'displayName',
    'email',
    'provider',
    'status',
    'department',
    'lastActivity',
    'actions',
  ];
  readonly groupColumns = ['name', 'provider', 'email', 'memberCount', 'externalId'];
  readonly licenseColumns = ['skuName', 'provider', 'seats', 'assignedCount', 'externalId'];
  readonly appColumns = ['name', 'provider', 'category', 'externalId'];
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly providerLabel = providerLabel;
  readonly fullDate = fullDate;

  readonly filters = this.fb.nonNullable.group({
    provider: [''],
  });

  readonly hasActiveFilters = computed(() => !!this.filters.getRawValue().provider.trim());

  readonly currentItems = computed(() => {
    switch (this.activeTab()) {
      case 'groups':
        return this.groups();
      case 'licenses':
        return this.licenses();
      case 'apps':
        return this.apps();
      default:
        return this.identities();
    }
  });

  canLifecycleWrite = () => this.auth.hasPermission('lifecycle:write');

  ngOnInit(): void {
    this.reload();
  }

  onTabChange(index: number): void {
    const tabs: CatalogTab[] = ['identities', 'groups', 'licenses', 'apps'];
    this.activeTab.set(tabs[index] ?? 'identities');
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const provider = this.filters.getRawValue().provider.trim() || undefined;
    const filters = { provider };
    const tab = this.activeTab();

    const handleError = (err: unknown) => {
      this.loading.set(false);
      this.error.set(extractApiErrorMessage(err, this.tabErrorLabel()));
    };

    if (tab === 'groups') {
      this.catalogApi.listGroups(filters).subscribe({
        next: (items) => {
          this.groups.set(items);
          this.loading.set(false);
        },
        error: handleError,
      });
      return;
    }
    if (tab === 'licenses') {
      this.catalogApi.listLicenses(filters).subscribe({
        next: (items) => {
          this.licenses.set(items);
          this.loading.set(false);
        },
        error: handleError,
      });
      return;
    }
    if (tab === 'apps') {
      this.catalogApi.listApps(filters).subscribe({
        next: (items) => {
          this.apps.set(items);
          this.loading.set(false);
        },
        error: handleError,
      });
      return;
    }
    this.catalogApi.listIdentities(filters).subscribe({
      next: (items) => {
        this.identities.set(items);
        this.loading.set(false);
      },
      error: handleError,
    });
  }

  clearFilters(): void {
    this.filters.reset({ provider: '' });
    this.reload();
  }

  canSuspend(row: CatalogIdentity): boolean {
    return row.status === 'active';
  }

  canDelete(row: CatalogIdentity): boolean {
    return row.status !== 'deleted';
  }

  suspendIdentity(row: CatalogIdentity): void {
    if (!this.canLifecycleWrite() || !this.canSuspend(row)) return;
    if (!window.confirm(`Suspender a identidade ${row.email || row.displayName || row.id}?`)) return;

    this.actionId.set(row.id);
    this.identitiesApi.suspend(row.id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.feedback.success('Identidade suspensa');
        this.reload();
      },
      error: (err) => {
        this.actionId.set(null);
        this.feedback.fromError(err, 'Falha ao suspender identidade');
      },
    });
  }

  deleteIdentity(row: CatalogIdentity): void {
    if (!this.canLifecycleWrite() || !this.canDelete(row)) return;
    if (
      !window.confirm(
        `Excluir permanentemente a identidade ${row.email || row.displayName || row.id}? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    this.actionId.set(row.id);
    this.identitiesApi.delete(row.id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.feedback.success('Identidade excluída');
        this.reload();
      },
      error: (err) => {
        this.actionId.set(null);
        this.feedback.fromError(err, 'Falha ao excluir identidade');
      },
    });
  }

  private tabErrorLabel(): string {
    switch (this.activeTab()) {
      case 'groups':
        return 'Falha ao carregar grupos';
      case 'licenses':
        return 'Falha ao carregar licenças';
      case 'apps':
        return 'Falha ao carregar apps';
      default:
        return 'Falha ao carregar identidades';
    }
  }

  emptyTitle(): string {
    if (this.hasActiveFilters()) return 'Nenhum resultado para este provedor';
    switch (this.activeTab()) {
      case 'groups':
        return 'Nenhum grupo sincronizado';
      case 'licenses':
        return 'Nenhuma licença sincronizada';
      case 'apps':
        return 'Nenhum app sincronizado';
      default:
        return 'Nenhuma identidade sincronizada';
    }
  }

  emptyDescription(): string {
    if (this.hasActiveFilters()) {
      return 'Ajuste ou limpe o filtro de provedor para ver mais registros.';
    }
    return 'Conecte uma integração e execute uma sincronização para popular o catálogo.';
  }
}
