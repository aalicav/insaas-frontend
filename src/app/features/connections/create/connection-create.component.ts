import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
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
import {
  authTypeDescription,
  authTypeLabel,
  categoryLabel,
  providerBlurb,
} from '../../../shared/labels/domain-labels';
import { ProviderIconComponent } from '../../../shared/components/provider-icon/provider-icon.component';
import { SetupGuidePanelComponent } from '../../../shared/components/setup-guide-panel/setup-guide-panel.component';
import {
  CredentialField,
  IntegrationProvider,
} from '../../../core/models/connection.models';
import { isProviderConnectable } from '../../integrations/catalog/integrations-catalog.models';
import { HelpHints } from '../../../shared/labels/help-hints';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';

const URL_RE = /^https?:\/\/.+/i;

function urlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = String(control.value ?? '').trim();
    if (!v) return null;
    return URL_RE.test(v) ? null : { url: true };
  };
}

function requireOneOfValidator(groups: string[][]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup) || !groups.length) return null;
    const filled = (name: string) => {
      const v = control.get(name)?.value;
      return v != null && String(v).trim().length > 0;
    };
    const ok = groups.some((group) => group.every(filled));
    return ok ? null : { requireOneOf: true };
  };
}

function fieldValidators(field: CredentialField): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (!field.optional) {
    validators.push(Validators.required);
  }
  if (field.type === 'email') {
    validators.push(Validators.email);
  }
  if (field.type === 'url') {
    validators.push(urlValidator());
  }
  if (field.pattern) {
    try {
      validators.push(Validators.pattern(field.pattern));
    } catch {
      // ignore invalid pattern from API
    }
  }
  return validators;
}

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
    SetupGuidePanelComponent,
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
  readonly requireOneOf = signal<string[][]>([]);
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
  readonly authTypeDescription = authTypeDescription;
  readonly providerBlurb = providerBlurb;
  readonly categoryLabel = categoryLabel;
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

  requireOneOfMessage(): string {
    const fields = this.credentialFields();
    const groups = this.requireOneOf();
    if (!groups.length) return '';
    const labelOf = (name: string) =>
      fields.find((f) => f.name === name)?.label ?? name;
    return groups.map((g) => g.map(labelOf).join(' + ')).join(' ou ');
  }

  fieldError(name: string): string | null {
    const ctrl = this.credentialsForm.get(name);
    if (!ctrl || !ctrl.touched || !ctrl.errors) return null;
    if (ctrl.hasError('required')) return 'Campo obrigatório';
    if (ctrl.hasError('email')) return 'E-mail inválido';
    if (ctrl.hasError('url')) return 'URL inválida (use http:// ou https://)';
    if (ctrl.hasError('pattern')) return 'Formato inválido';
    if (ctrl.hasError('api')) return String(ctrl.getError('api'));
    return null;
  }

  inputType(field: CredentialField): string {
    if (field.secret) return 'password';
    if (field.type === 'email') return 'email';
    if (field.type === 'url') return 'url';
    return 'text';
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
      this.feedback.warning('Selecione um sistema');
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
          this.requireOneOf.set(res.next.requireOneOf ?? []);
          const group: Record<string, FormControl<string>> = {};
          for (const field of res.next.fields) {
            group[field.name] = new FormControl('', {
              nonNullable: true,
              validators: fieldValidators(field),
            });
          }
          this.credentialsForm = new FormGroup(group, {
            validators: requireOneOfValidator(res.next.requireOneOf ?? []),
          });
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
      if (this.credentialsForm.hasError('requireOneOf')) {
        this.feedback.warning(`Informe ${this.requireOneOfMessage()}`);
      }
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
