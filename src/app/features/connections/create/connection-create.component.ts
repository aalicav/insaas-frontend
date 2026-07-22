import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { ConnectionsApiService } from '../../../core/api/connections-api.service';
import { applyApiValidationErrors, extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { authTypeLabel, providerBlurb } from '../../../shared/labels/domain-labels';
import { ProviderIconComponent } from '../../../shared/components/provider-icon/provider-icon.component';
import {
  CredentialField,
  IntegrationProvider,
} from '../../../core/models/connection.models';
import { isProviderConnectable } from '../../integrations/catalog/integrations-catalog.models';
import { HelpHints } from '../../../shared/labels/help-hints';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';

@Component({
  selector: 'app-connection-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatIconModule,
    PageHeaderComponent,
    BreadcrumbComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    InfoHintComponent,
    ProviderIconComponent,
  ],
  templateUrl: './connection-create.component.html',
  styleUrl: './connection-create.component.scss',
})
export class ConnectionCreateComponent implements OnInit {
  @ViewChild('stepper') stepper?: MatStepper;

  private readonly api = inject(ConnectionsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly feedback = inject(FeedbackService);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly providers = signal<IntegrationProvider[]>([]);
  readonly credentialFields = signal<CredentialField[]>([]);
  readonly pendingConnectionId = signal<string | null>(null);
  readonly wizardStep = signal(0);

  readonly isHandset = toSignal(
    this.breakpoints.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly form = this.fb.nonNullable.group({
    provider: ['', Validators.required],
    authType: [''],
    displayName: [''],
  });

  credentialsForm = new FormGroup<Record<string, FormControl<string>>>({});

  readonly authTypeLabel = authTypeLabel;
  readonly providerBlurb = providerBlurb;
  readonly HelpHints = HelpHints;

  ngOnInit(): void {
    this.loadProviders();
  }

  loadProviders(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listIntegrations().subscribe({
      next: (items) => {
        const connectable = items.filter((p) => isProviderConnectable(p));
        this.providers.set(connectable);
        this.loading.set(false);
        const preset = this.route.snapshot.queryParamMap.get('provider');
        if (preset && connectable.some((p) => p.key === preset)) {
          this.selectProvider(preset);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(extractApiErrorMessage(err, 'Falha ao carregar providers'));
      },
    });
  }

  selectedProvider(): IntegrationProvider | undefined {
    return this.providers().find((p) => p.key === this.form.value.provider);
  }

  authTypes(): string[] {
    return this.selectedProvider()?.auth?.supportedTypes ?? [];
  }

  selectProvider(key: string): void {
    this.form.patchValue({ provider: key, authType: '' });
    this.wizardStep.set(1);
    queueMicrotask(() => this.stepper?.next());
  }

  goToProviderStep(): void {
    this.wizardStep.set(0);
    this.stepper?.previous();
  }

  create(): void {
    if (!this.form.value.provider) {
      this.form.controls.provider.markAsTouched();
      this.feedback.warning('Selecione um provider');
      return;
    }
    const raw = this.form.getRawValue();
    this.submitting.set(true);
    this.api
      .createConnection({
        provider: raw.provider,
        authType: raw.authType || undefined,
        displayName: raw.displayName || undefined,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          if (res.next.kind === 'redirect') {
            this.feedback.info('Redirecionando para autorização…');
            window.location.href = res.next.url;
            return;
          }
          this.pendingConnectionId.set(res.connection.id);
          this.credentialFields.set(res.next.fields);
          const group: Record<string, FormControl<string>> = {};
          for (const field of res.next.fields) {
            group[field.name] = new FormControl('', {
              nonNullable: true,
              validators: field.optional ? [] : [Validators.required],
            });
          }
          this.credentialsForm = new FormGroup(group);
          this.wizardStep.set(2);
          queueMicrotask(() => this.stepper?.next());
        },
        error: (err) => {
          this.submitting.set(false);
          if (!applyApiValidationErrors(this.form, err)) {
            this.feedback.fromError(err, 'Falha ao criar conexão');
          }
        },
      });
  }

  submitCredentials(): void {
    const id = this.pendingConnectionId();
    if (!id || this.credentialsForm.invalid) {
      this.credentialsForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.api.submitCredentials(id, this.credentialsForm.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.status === 'connected') {
          this.feedback.success('Conexão autenticada');
        } else {
          this.feedback.error('Conexão com erro');
        }
        void this.router.navigate(['/connections', id]);
      },
      error: (err) => {
        this.submitting.set(false);
        if (!applyApiValidationErrors(this.credentialsForm, err)) {
          this.feedback.fromError(err, 'Falha ao salvar credenciais');
        }
      },
    });
  }
}
