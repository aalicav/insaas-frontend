import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { InventoryApiService } from '../../core/api/inventory-api.service';
import { applyApiValidationErrors, extractApiErrorMessage } from '../../core/api/api-error';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { providerLabel } from '../../shared/labels/domain-labels';
import {
  ManagedApp,
  ManagedAppCriticality,
  ManagedAppStatus,
} from '../../core/models/inventory.models';

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './inventory-detail.component.html',
  styleUrl: './inventory-detail.component.scss',
})
export class InventoryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(InventoryApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly app = signal<ManagedApp | null>(null);

  readonly providerLabel = providerLabel;
  private appId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    status: ['unmanaged' as ManagedAppStatus, Validators.required],
    criticality: ['medium' as ManagedAppCriticality, Validators.required],
    description: [''],
    tags: [''],
  });

  canWrite = () => this.auth.hasPermission('inventory:write');

  ngOnInit(): void {
    this.appId = this.route.snapshot.paramMap.get('id');
    if (!this.appId) {
      this.loading.set(false);
      this.error.set('App não encontrado');
      return;
    }
    this.reload();
  }

  reload(): void {
    if (!this.appId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.getApp(this.appId).subscribe({
      next: (app) => {
        this.app.set(app);
        this.form.patchValue({
          name: app.name,
          status: app.status,
          criticality: app.criticality,
          description: app.description ?? '',
          tags: app.tags?.join(', ') ?? '',
        });
        if (!this.canWrite()) {
          this.form.disable();
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.app.set(null);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar app'));
      },
    });
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
    };
    return labels[value] ?? value;
  }

  parseTags(value: string): string[] {
    return value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  submit(): void {
    if (!this.appId || !this.canWrite()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.api
      .updateApp(this.appId, {
        name: raw.name.trim(),
        status: raw.status,
        criticality: raw.criticality,
        description: raw.description.trim() || null,
        tags: this.parseTags(raw.tags),
      })
      .subscribe({
        next: (app) => {
          this.saving.set(false);
          this.app.set(app);
          this.feedback.success('App atualizado');
        },
        error: (err) => {
          this.saving.set(false);
          applyApiValidationErrors(this.form, err);
          this.feedback.fromError(err, 'Falha ao salvar app');
        },
      });
  }
}
