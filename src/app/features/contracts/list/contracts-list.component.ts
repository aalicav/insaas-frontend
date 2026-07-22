import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { ContractsApiService } from '../../../core/api/contracts-api.service';
import { InventoryApiService } from '../../../core/api/inventory-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Contract } from '../../../core/models/contracts.models';
import { ManagedApp } from '../../../core/models/inventory.models';

@Component({
  selector: 'app-contracts-list',
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
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
  ],
  templateUrl: './contracts-list.component.html',
  styleUrl: './contracts-list.component.scss',
})
export class ContractsListComponent implements OnInit {
  private readonly api = inject(ContractsApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly contracts = signal<Contract[]>([]);
  readonly apps = signal<ManagedApp[]>([]);
  readonly columns = ['app', 'vendor', 'status', 'period', 'billing'];
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly filters = this.fb.nonNullable.group({
    status: [''],
    managedAppId: [''],
    renewingBefore: [''],
  });

  readonly hasActiveFilters = computed(() => {
    const raw = this.filters.getRawValue();
    return !!(raw.status || raw.managedAppId || raw.renewingBefore);
  });

  canWrite = () => this.auth.hasPermission('contracts:write');

  ngOnInit(): void {
    this.inventoryApi.listApps().subscribe({
      next: (items) => this.apps.set(items),
      error: () => this.apps.set([]),
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const raw = this.filters.getRawValue();
    this.api
      .list({
        status: raw.status || undefined,
        managedAppId: raw.managedAppId || undefined,
        renewingBefore: raw.renewingBefore || undefined,
      })
      .subscribe({
        next: (items) => {
          this.contracts.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(extractApiErrorMessage(err, 'Falha ao carregar contratos'));
        },
      });
  }

  clearFilters(): void {
    this.filters.reset({ status: '', managedAppId: '', renewingBefore: '' });
    this.reload();
  }

  open(row: Contract): void {
    void this.router.navigate(['/contracts', row.id]);
  }

  billingLabel(value: string): string {
    const labels: Record<string, string> = {
      monthly: 'Mensal',
      yearly: 'Anual',
      custom: 'Personalizado',
    };
    return labels[value] ?? value;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  }
}
