import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { SpendApiService } from '../../../core/api/spend-api.service';
import { ContractsApiService } from '../../../core/api/contracts-api.service';
import { InventoryApiService } from '../../../core/api/inventory-api.service';
import { applyApiValidationErrors, extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { SpendEntry, SpendKind } from '../../../core/models/spend.models';
import { Contract } from '../../../core/models/contracts.models';
import { ManagedApp } from '../../../core/models/inventory.models';
import { HelpHints } from '../../../shared/labels/help-hints';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';

@Component({
  selector: 'app-spend-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    InfoHintComponent,
  ],
  templateUrl: './spend-list.component.html',
  styleUrl: './spend-list.component.scss',
})
export class SpendListComponent implements OnInit {
  private readonly api = inject(SpendApiService);
  private readonly contractsApi = inject(ContractsApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly entries = signal<SpendEntry[]>([]);
  readonly contracts = signal<Contract[]>([]);
  readonly apps = signal<ManagedApp[]>([]);
  readonly columns = ['kind', 'competence', 'amount', 'contract', 'ref'];
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly filters = this.fb.nonNullable.group({
    competenceFrom: [''],
    competenceTo: [''],
    kind: [''],
    contractId: [''],
  });

  readonly createForm = this.fb.nonNullable.group({
    kind: ['invoice' as 'invoice' | 'card' | 'adjustment', Validators.required],
    managedAppId: [''],
    contractId: [''],
    currency: ['BRL', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    competenceOn: ['', Validators.required],
    paidOn: [''],
    externalRef: [''],
  });

  readonly hasActiveFilters = computed(() => {
    const raw = this.filters.getRawValue();
    return !!(raw.competenceFrom || raw.competenceTo || raw.kind || raw.contractId);
  });

  canWrite = () => this.auth.hasPermission('spend:write');

  ngOnInit(): void {
    this.contractsApi.list().subscribe({
      next: (items) => this.contracts.set(items),
      error: () => this.contracts.set([]),
    });
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
        competenceFrom: raw.competenceFrom || undefined,
        competenceTo: raw.competenceTo || undefined,
        kind: (raw.kind as SpendKind) || undefined,
        contractId: raw.contractId || undefined,
      })
      .subscribe({
        next: (items) => {
          this.entries.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(extractApiErrorMessage(err, 'Falha ao carregar gastos'));
        },
      });
  }

  clearFilters(): void {
    this.filters.reset({
      competenceFrom: '',
      competenceTo: '',
      kind: '',
      contractId: '',
    });
    this.reload();
  }

  createEntry(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.createForm.getRawValue();
    this.api
      .create({
        kind: raw.kind,
        managedAppId: raw.managedAppId || undefined,
        contractId: raw.contractId || undefined,
        currency: raw.currency,
        amountMinor: Math.round(Number(raw.amount) * 100),
        competenceOn: raw.competenceOn,
        paidOn: raw.paidOn || undefined,
        externalRef: raw.externalRef || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.createForm.reset({
            kind: 'invoice',
            managedAppId: '',
            contractId: '',
            currency: 'BRL',
            amount: '',
            competenceOn: '',
            paidOn: '',
            externalRef: '',
          });
          this.feedback.success('Lançamento registrado');
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          if (!applyApiValidationErrors(this.createForm, err)) {
            this.feedback.fromError(err, 'Falha ao registrar lançamento');
          }
        },
      });
  }

  kindLabel(kind: SpendKind | string): string {
    const labels: Record<string, string> = {
      contract_commitment: 'Compromisso',
      invoice: 'Nota fiscal',
      card: 'Cartão',
      adjustment: 'Ajuste',
    };
    return labels[kind] ?? kind;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  }

  formatMoney(minor: number, currency = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(minor / 100);
  }

  contractLabel(contractId: string | null): string {
    if (!contractId) return '—';
    const found = this.contracts().find((c) => c.id === contractId);
    return found?.managedApp?.name || found?.vendorName || contractId.slice(0, 8);
  }
}
