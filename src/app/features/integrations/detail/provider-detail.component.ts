import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { ConnectionsApiService } from '../../../core/api/connections-api.service';
import { CatalogApiService } from '../../../core/api/catalog-api.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import {
  authTypeLabel,
  categoryLabel,
  providerBlurb,
  providerLabel,
} from '../../../shared/labels/domain-labels';
import { RelativeTimePipe, fullDate } from '../../../shared/pipes/relative-time.pipe';
import { Connection, IntegrationProvider } from '../../../core/models/connection.models';
import { CatalogLicense } from '../../../core/models/catalog.models';
import { isProviderConnectable } from '../catalog/integrations-catalog.models';
import { HelpHints } from '../../../shared/labels/help-hints';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';
import { ProviderIconComponent } from '../../../shared/components/provider-icon/provider-icon.component';
import { SetupGuidePanelComponent } from '../../../shared/components/setup-guide-panel/setup-guide-panel.component';

const CAPABILITY_ENTITY_LABELS: Record<string, string> = {
  identity: 'Identidades',
  group: 'Grupos',
  license: 'Licenças',
  app: 'Aplicativos',
  orgUnit: 'Centros de custo / unidades',
};

@Component({
  selector: 'app-provider-detail',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTableModule,
    PageHeaderComponent,
    BreadcrumbComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
    InfoHintComponent,
    ProviderIconComponent,
    SetupGuidePanelComponent,
  ],
  templateUrl: './provider-detail.component.html',
  styleUrl: './provider-detail.component.scss',
})
export class ProviderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ConnectionsApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly feedback = inject(FeedbackService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly provider = signal<IntegrationProvider | null>(null);
  readonly connections = signal<Connection[]>([]);
  readonly licenses = signal<CatalogLicense[]>([]);
  readonly licensesLoading = signal(false);
  readonly licensesError = signal<string | null>(null);
  readonly savingAdmin = signal(false);
  readonly licenseColumns = ['skuName', 'skuId', 'seats', 'assignedCount', 'externalId'];

  readonly adminForm = this.fb.nonNullable.group({
    displayName: [''],
    enabled: [true],
    connectable: [true],
    sortOrder: [0],
  });

  readonly providerLabel = providerLabel;
  readonly providerBlurb = providerBlurb;
  readonly categoryLabel = categoryLabel;
  readonly authTypeLabel = authTypeLabel;
  readonly fullDate = fullDate;

  readonly canConnect = computed(() => {
    const p = this.provider();
    return !!p && isProviderConnectable(p) && this.auth.hasPermission('connections:write');
  });

  canManage = () => this.auth.hasPermission('integrations:manage');
  canReadCatalog = () => this.auth.hasPermission('catalog:read');

  readonly comingSoon = computed(() => {
    const p = this.provider();
    return !!p && !isProviderConnectable(p);
  });

  readonly capabilityEntries = computed(() => {
    const entities = this.provider()?.capabilities?.['entities'] as
      | Record<string, boolean>
      | undefined;
    if (!entities) return [];
    return Object.entries(entities)
      .filter(([, enabled]) => !!enabled)
      .map(([key]) => ({
        key,
        label: CAPABILITY_ENTITY_LABELS[key] ?? key,
      }));
  });

  readonly authTypes = computed(() => {
    const auth = this.provider()?.auth;
    const types = auth?.supportedTypes ?? [];
    if (!types.length && auth?.defaultType) return [auth.defaultType];
    return types;
  });

  private providerKey: string | null = null;

  ngOnInit(): void {
    this.providerKey = this.route.snapshot.paramMap.get('key');
    if (!this.providerKey) {
      this.loading.set(false);
      this.error.set('Provider não encontrado');
      return;
    }
    this.reload();
  }

  reload(): void {
    if (!this.providerKey) return;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      provider: this.api.getIntegration(this.providerKey),
      connections: this.api.listConnections().pipe(catchError(() => of([] as Connection[]))),
    }).subscribe({
      next: ({ provider, connections }) => {
        this.provider.set(provider);
        this.connections.set(connections.filter((c) => c.provider === provider.key));
        this.adminForm.patchValue({
          displayName: provider.displayName,
          enabled: provider.enabled,
          connectable: provider.connectable,
          sortOrder: provider.sortOrder ?? 0,
        });
        this.loading.set(false);
        this.loadLicenses(provider.key);
      },
      error: (err) => {
        this.loading.set(false);
        this.provider.set(null);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar provider'));
      },
    });
  }

  loadLicenses(providerKey: string): void {
    if (!this.canReadCatalog()) {
      this.licenses.set([]);
      this.licensesError.set(null);
      return;
    }
    this.licensesLoading.set(true);
    this.licensesError.set(null);
    this.catalogApi.listLicenses({ provider: providerKey }).subscribe({
      next: (items) => {
        this.licenses.set(items);
        this.licensesLoading.set(false);
      },
      error: (err) => {
        this.licenses.set([]);
        this.licensesLoading.set(false);
        this.licensesError.set(
          extractApiErrorMessage(err, 'Falha ao carregar licenças deste provider'),
        );
      },
    });
  }

  saveAdmin(): void {
    if (!this.providerKey || !this.canManage()) return;
    this.savingAdmin.set(true);
    const raw = this.adminForm.getRawValue();
    this.api
      .patchIntegration(this.providerKey, {
        displayName: raw.displayName,
        enabled: raw.enabled,
        connectable: raw.connectable,
        sortOrder: Number(raw.sortOrder) || 0,
      })
      .subscribe({
        next: (provider) => {
          this.savingAdmin.set(false);
          this.provider.set(provider);
          this.feedback.success('Provider atualizado');
        },
        error: (err) => {
          this.savingAdmin.set(false);
          this.feedback.fromError(err, 'Falha ao atualizar provider');
        },
      });
  }
}
