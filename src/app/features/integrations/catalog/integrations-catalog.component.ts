import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ConnectionsApiService } from '../../../core/api/connections-api.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import {
  categoryLabel,
  providerBlurb,
  providerLabel,
} from '../../../shared/labels/domain-labels';
import { HelpHints } from '../../../shared/labels/help-hints';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';
import { ProviderIconComponent } from '../../../shared/components/provider-icon/provider-icon.component';
import { RelativeTimePipe, fullDate } from '../../../shared/pipes/relative-time.pipe';
import {
  CatalogItem,
  buildCatalog,
  filterCatalog,
  partitionCatalog,
} from './integrations-catalog.models';

@Component({
  selector: 'app-integrations-catalog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    InfoHintComponent,
    RelativeTimePipe,
    ProviderIconComponent,
  ],
  templateUrl: './integrations-catalog.component.html',
  styleUrl: './integrations-catalog.component.scss',
})
export class IntegrationsCatalogComponent implements OnInit {
  private readonly api = inject(ConnectionsApiService);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly catalog = signal<CatalogItem[]>([]);

  readonly query = new FormControl('', { nonNullable: true });
  readonly category = new FormControl('', { nonNullable: true });
  readonly connectableOnly = new FormControl(false, { nonNullable: true });

  readonly filterTick = signal(0);

  readonly providerLabel = providerLabel;
  readonly providerBlurb = providerBlurb;
  readonly categoryLabel = categoryLabel;
  readonly fullDate = fullDate;

  readonly categories = computed(() => {
    const set = new Set<string>();
    for (const item of this.catalog()) {
      set.add(item.provider.category || 'other');
    }
    return [...set].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), 'pt-BR'));
  });

  readonly filtered = computed(() => {
    this.filterTick();
    return filterCatalog(this.catalog(), {
      q: this.query.value,
      category: this.category.value || undefined,
      connectableOnly: this.connectableOnly.value,
    });
  });

  readonly sections = computed(() => partitionCatalog(this.filtered()));

  canWrite = () => this.auth.hasPermission('connections:write');

  ngOnInit(): void {
    this.query.valueChanges.subscribe(() => this.filterTick.update((n) => n + 1));
    this.category.valueChanges.subscribe(() => this.filterTick.update((n) => n + 1));
    this.connectableOnly.valueChanges.subscribe(() => this.filterTick.update((n) => n + 1));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      providers: this.api.listIntegrations(),
      connections: this.api.listConnections(),
    }).subscribe({
      next: ({ providers, connections }) => {
        this.catalog.set(buildCatalog(providers, connections));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar integrações'));
      },
    });
  }
}
