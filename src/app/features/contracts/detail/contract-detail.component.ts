import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ContractsApiService } from '../../../core/api/contracts-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { Contract } from '../../../core/models/contracts.models';
import { HelpHints } from '../../../shared/labels/help-hints';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';

@Component({
  selector: 'app-contract-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    BreadcrumbComponent,
    InfoHintComponent,
  ],
  templateUrl: './contract-detail.component.html',
  styleUrl: './contract-detail.component.scss',
})
export class ContractDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ContractsApiService);
  private readonly feedback = inject(FeedbackService);
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly generating = signal(false);
  readonly contract = signal<Contract | null>(null);
  readonly lineColumns = ['name', 'quantity', 'unitAmount', 'allocation'];
  private contractId: string | null = null;

  canWrite = () => this.auth.hasPermission('contracts:write');

  ngOnInit(): void {
    this.contractId = this.route.snapshot.paramMap.get('id');
    if (!this.contractId) {
      this.loading.set(false);
      this.error.set('Contrato não encontrado');
      return;
    }
    this.reload();
  }

  reload(): void {
    if (!this.contractId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.get(this.contractId).subscribe({
      next: (contract) => {
        this.contract.set(contract);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.contract.set(null);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar contrato'));
      },
    });
  }

  generateCommitments(): void {
    if (!this.contractId) return;
    this.generating.set(true);
    this.api.generateCommitments(this.contractId).subscribe({
      next: (result) => {
        this.generating.set(false);
        this.feedback.success(
          `Compromissos gerados: ${result.created} criados, ${result.updated} atualizados`,
        );
      },
      error: (err) => {
        this.generating.set(false);
        this.feedback.fromError(err, 'Falha ao gerar compromissos');
      },
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  }

  formatMoney(minor: number, currency = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(minor / 100);
  }

  billingLabel(value: string): string {
    const labels: Record<string, string> = {
      monthly: 'Mensal',
      yearly: 'Anual',
      custom: 'Personalizado',
    };
    return labels[value] ?? value;
  }

  chargeLabel(value: string): string {
    const labels: Record<string, string> = {
      prepaid: 'Pré-pago',
      postpaid: 'Pós-pago',
      on_demand: 'Sob demanda',
    };
    return labels[value] ?? value;
  }

  allocationLabel(mode: string): string {
    const labels: Record<string, string> = {
      equal_by_assignees: 'Igual por assignees',
      percent_split: 'Percentual',
      single_unit: 'Unidade única',
    };
    return labels[mode] ?? mode;
  }
}
