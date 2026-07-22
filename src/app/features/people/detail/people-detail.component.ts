import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PeopleApiService } from '../../../core/api/people-api.service';
import { WorkflowsApiService } from '../../../core/api/workflows-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';
import { RelativeTimePipe, fullDate } from '../../../shared/pipes/relative-time.pipe';
import {
  absenceReasonLabel,
  providerLabel,
} from '../../../shared/labels/domain-labels';
import { HelpHints } from '../../../shared/labels/help-hints';
import {
  AbsenceReason,
  PersonAbsence,
  PersonDetail,
} from '../../../core/models/people.models';
import { WorkflowRun } from '../../../core/models/workflows.models';

@Component({
  selector: 'app-people-detail',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    RelativeTimePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    BreadcrumbComponent,
    InfoHintComponent,
  ],
  templateUrl: './people-detail.component.html',
  styleUrl: './people-detail.component.scss',
})
export class PeopleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PeopleApiService);
  private readonly workflows = inject(WorkflowsApiService);
  private readonly feedback = inject(FeedbackService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly person = signal<PersonDetail | null>(null);
  readonly runs = signal<WorkflowRun[]>([]);
  readonly lifecycleBusy = signal(false);
  readonly absenceBusy = signal(false);
  readonly providerLabel = providerLabel;
  readonly absenceReasonLabel = absenceReasonLabel;
  readonly fullDate = fullDate;
  readonly HelpHints = HelpHints;
  readonly reasons: AbsenceReason[] = [
    'vacation',
    'absence',
    'sick',
    'recess',
  ];

  readonly absenceForm = this.fb.nonNullable.group({
    reason: ['vacation' as AbsenceReason, Validators.required],
    startsOn: ['', Validators.required],
    endsOn: [''],
    note: [''],
  });

  private personId: string | null = null;

  canWrite = () => this.auth.hasPermission('people:write');
  canLifecycle = () => this.auth.hasPermission('lifecycle:write');
  canReadLifecycle = () => this.auth.hasPermission('lifecycle:read');

  ngOnInit(): void {
    this.personId = this.route.snapshot.paramMap.get('id');
    if (!this.personId) {
      this.loading.set(false);
      this.error.set('Pessoa não encontrada');
      return;
    }
    this.reload();
  }

  reload(): void {
    if (!this.personId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.get(this.personId).subscribe({
      next: (person) => {
        this.person.set(person);
        this.loading.set(false);
        if (this.canReadLifecycle() && this.personId) {
          this.workflows.listRuns({ personId: this.personId }).subscribe({
            next: (items) => this.runs.set(items),
            error: () => this.runs.set([]),
          });
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.person.set(null);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar pessoa'));
      },
    });
  }

  formatDay(value: string | null | undefined): string {
    if (!value) return '—';
    return value.slice(0, 10);
  }

  isCurrent(absence: PersonAbsence): boolean {
    const today = new Date().toISOString().slice(0, 10);
    const start = absence.startsOn.slice(0, 10);
    if (start > today) return false;
    if (!absence.endsOn) return true;
    return absence.endsOn.slice(0, 10) >= today;
  }

  addAbsence(): void {
    if (!this.personId || this.absenceForm.invalid) return;
    const raw = this.absenceForm.getRawValue();
    this.absenceBusy.set(true);
    this.api
      .createAbsence(this.personId, {
        reason: raw.reason,
        startsOn: raw.startsOn,
        endsOn: raw.endsOn || null,
        note: raw.note || undefined,
      })
      .subscribe({
        next: (person) => {
          this.absenceBusy.set(false);
          this.person.set(person);
          this.absenceForm.reset({
            reason: 'vacation',
            startsOn: '',
            endsOn: '',
            note: '',
          });
          this.feedback.success('Ausência registrada');
        },
        error: (err) => {
          this.absenceBusy.set(false);
          this.feedback.fromError(err, 'Falha ao registrar ausência');
        },
      });
  }

  removeAbsence(absence: PersonAbsence): void {
    if (!this.personId) return;
    if (!window.confirm('Remover este período de ausência?')) return;
    this.absenceBusy.set(true);
    this.api.deleteAbsence(this.personId, absence.id).subscribe({
      next: (person) => {
        this.absenceBusy.set(false);
        this.person.set(person);
        this.feedback.success('Ausência removida');
      },
      error: (err) => {
        this.absenceBusy.set(false);
        this.feedback.fromError(err, 'Falha ao remover ausência');
      },
    });
  }

  onboard(): void {
    if (!this.personId) return;
    this.lifecycleBusy.set(true);
    this.workflows.onboardPerson(this.personId).subscribe({
      next: () => {
        this.lifecycleBusy.set(false);
        this.feedback.success('Onboarding iniciado');
        this.reload();
      },
      error: (err) => {
        this.lifecycleBusy.set(false);
        this.feedback.fromError(err, 'Falha ao iniciar onboarding');
      },
    });
  }

  offboard(): void {
    if (!this.personId) return;
    if (!window.confirm('Iniciar offboarding desta pessoa?')) return;
    this.lifecycleBusy.set(true);
    this.workflows.offboardPerson(this.personId).subscribe({
      next: () => {
        this.lifecycleBusy.set(false);
        this.feedback.success('Offboarding iniciado');
        this.reload();
      },
      error: (err) => {
        this.lifecycleBusy.set(false);
        this.feedback.fromError(err, 'Falha ao iniciar offboarding');
      },
    });
  }
}
