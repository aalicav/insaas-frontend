import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContractsApiService } from '../../../core/api/contracts-api.service';
import { InventoryApiService } from '../../../core/api/inventory-api.service';
import { applyApiValidationErrors, extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { ManagedApp } from '../../../core/models/inventory.models';
import { ContractStatus } from '../../../core/models/contracts.models';

@Component({
  selector: 'app-contract-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './contract-form.component.html',
  styleUrl: './contract-form.component.scss',
})
export class ContractFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContractsApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly loadingSuggestions = signal(false);
  readonly contractId = signal<string | null>(null);
  readonly apps = signal<ManagedApp[]>([]);

  readonly form = this.fb.nonNullable.group({
    managedAppId: ['', Validators.required],
    vendorName: [''],
    vendorTaxId: [''],
    status: ['draft' as ContractStatus],
    startsOn: ['', Validators.required],
    endsOn: [''],
    autoRenew: [false],
    noticeDays: [''],
    billingCycle: ['monthly' as 'monthly' | 'yearly' | 'custom'],
    chargeType: ['postpaid' as 'prepaid' | 'postpaid' | 'on_demand'],
    currency: ['BRL'],
    notes: [''],
    lineItems: this.fb.array([this.createLineItemGroup()]),
  });

  get isEdit(): boolean {
    return !!this.contractId();
  }

  get lineItems(): FormArray {
    return this.form.controls.lineItems;
  }

  ngOnInit(): void {
    this.inventoryApi.listApps().subscribe({
      next: (items) => this.apps.set(items),
      error: () => this.apps.set([]),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'new') return;
    this.contractId.set(id);
    this.form.controls.managedAppId.disable();
    this.loadContract(id);
  }

  createLineItemGroup() {
    return this.fb.nonNullable.group({
      name: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitAmount: ['', Validators.required],
    });
  }

  addLineItem(): void {
    this.lineItems.push(this.createLineItemGroup());
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length <= 1) return;
    this.lineItems.removeAt(index);
  }

  loadContract(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get(id).subscribe({
      next: (contract) => {
        this.lineItems.clear();
        if (contract.lineItems.length) {
          for (const item of contract.lineItems) {
            this.lineItems.push(
              this.fb.nonNullable.group({
                name: [item.name, Validators.required],
                quantity: [item.quantity, [Validators.required, Validators.min(1)]],
                unitAmount: [String(item.unitAmountMinor / 100), Validators.required],
              }),
            );
          }
        } else {
          this.lineItems.push(this.createLineItemGroup());
        }
        this.form.patchValue({
          managedAppId: contract.managedAppId,
          vendorName: contract.vendorName ?? '',
          vendorTaxId: contract.vendorTaxId ?? '',
          status: contract.status as ContractStatus,
          startsOn: contract.startsOn.slice(0, 10),
          endsOn: contract.endsOn ? contract.endsOn.slice(0, 10) : '',
          autoRenew: contract.autoRenew,
          noticeDays: contract.noticeDays != null ? String(contract.noticeDays) : '',
          billingCycle: contract.billingCycle as 'monthly' | 'yearly' | 'custom',
          chargeType: contract.chargeType as 'prepaid' | 'postpaid' | 'on_demand',
          currency: contract.currency,
          notes: contract.notes ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(extractApiErrorMessage(err, 'Falha ao carregar contrato'));
      },
    });
  }

  loadSuggestions(): void {
    const managedAppId = this.form.controls.managedAppId.value;
    if (!managedAppId || this.isEdit) return;
    this.loadingSuggestions.set(true);
    this.api.suggestions(managedAppId).subscribe({
      next: (suggestions) => {
        this.lineItems.clear();
        for (const item of suggestions.lineItems) {
          this.lineItems.push(
            this.fb.nonNullable.group({
              name: [item.name, Validators.required],
              quantity: [item.quantity, [Validators.required, Validators.min(1)]],
              unitAmount: [String(item.unitAmountMinor / 100), Validators.required],
            }),
          );
        }
        if (!this.lineItems.length) {
          this.lineItems.push(this.createLineItemGroup());
        }
        if (suggestions.lineItems.length) {
          this.feedback.success('Sugestões de itens carregadas');
        }
        this.loadingSuggestions.set(false);
      },
      error: (err) => {
        this.loadingSuggestions.set(false);
        this.feedback.fromError(err, 'Falha ao carregar sugestões');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const lineItems = raw.lineItems
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity),
        unitAmountMinor: Math.round(Number(item.unitAmount) * 100),
      }));

    const payload = {
      vendorName: raw.vendorName || undefined,
      vendorTaxId: raw.vendorTaxId || undefined,
      status: raw.status,
      startsOn: raw.startsOn,
      endsOn: raw.endsOn || undefined,
      autoRenew: raw.autoRenew,
      noticeDays: raw.noticeDays ? Number(raw.noticeDays) : undefined,
      billingCycle: raw.billingCycle,
      chargeType: raw.chargeType,
      currency: raw.currency,
      notes: raw.notes || undefined,
      lineItems: lineItems.length ? lineItems : undefined,
    };

    const id = this.contractId();
    if (id) {
      this.api
        .update(id, {
          ...payload,
          endsOn: raw.endsOn ? raw.endsOn : null,
          noticeDays: raw.noticeDays ? Number(raw.noticeDays) : null,
          notes: raw.notes || null,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.feedback.success('Contrato atualizado');
            void this.router.navigate(['/contracts', id]);
          },
          error: (err) => {
            this.saving.set(false);
            if (!applyApiValidationErrors(this.form, err)) {
              this.feedback.fromError(err, 'Falha ao salvar contrato');
            }
          },
        });
      return;
    }

    this.api
      .create({
        managedAppId: raw.managedAppId,
        ...payload,
      })
      .subscribe({
        next: (contract) => {
          this.saving.set(false);
          this.feedback.success('Contrato criado');
          void this.router.navigate(['/contracts', contract.id]);
        },
        error: (err) => {
          this.saving.set(false);
          if (!applyApiValidationErrors(this.form, err)) {
            this.feedback.fromError(err, 'Falha ao criar contrato');
          }
        },
      });
  }
}
