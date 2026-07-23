import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PeopleApiService } from '../../../core/api/people-api.service';
import { OrgStructureApiService } from '../../../core/api/org-structure-api.service';
import { applyApiValidationErrors, clearApiErrors, extractApiErrorMessage } from '../../../core/api/api-error';
import { FeedbackService } from '../../../core/feedback/feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { InfoHintComponent } from '../../../shared/components/info-hint/info-hint.component';
import { HelpHints } from '../../../shared/labels/help-hints';
import { OrgUnit } from '../../../core/models/org-structure.models';

@Component({
  selector: 'app-people-form',
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
    BreadcrumbComponent,
    InfoHintComponent,
  ],
  templateUrl: './people-form.component.html',
  styleUrl: './people-form.component.scss',
})
export class PeopleFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PeopleApiService);
  private readonly orgApi = inject(OrgStructureApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly personId = signal<string | null>(null);
  readonly teams = signal<OrgUnit[]>([]);
  readonly costCenters = signal<OrgUnit[]>([]);
  readonly HelpHints = HelpHints;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: [''],
    department: [''],
    jobTitle: [''],
    status: ['active' as 'active' | 'inactive'],
    teamUnitId: ['' as string],
    costCenterUnitId: ['' as string],
  });

  get isEdit(): boolean {
    return !!this.personId();
  }

  ngOnInit(): void {
    this.loadUnits();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'new') return;
    this.personId.set(id);
    this.loadPerson(id);
  }

  loadUnits(): void {
    forkJoin({
      teams: this.orgApi.listUnits({ kind: 'team', status: 'active' }).pipe(
        catchError(() => of([] as OrgUnit[])),
      ),
      costCenters: this.orgApi
        .listUnits({ kind: 'cost_center', status: 'active' })
        .pipe(catchError(() => of([] as OrgUnit[]))),
    }).subscribe(({ teams, costCenters }) => {
      this.teams.set(teams);
      this.costCenters.set(costCenters);
    });
  }

  loadPerson(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.form.controls.email.disable();
    this.api.get(id).subscribe({
      next: (person) => {
        this.form.patchValue({
          email: person.email,
          displayName: person.displayName ?? '',
          department: person.department ?? '',
          jobTitle: person.jobTitle ?? '',
          status: person.status,
          teamUnitId: person.teamUnitId ?? '',
          costCenterUnitId: person.costCenterUnitId ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(extractApiErrorMessage(err, 'Falha ao carregar pessoa'));
      },
    });
  }

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    clearApiErrors(this.form.controls.email);
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const id = this.personId();
    const teamUnitId = raw.teamUnitId || null;
    const costCenterUnitId = raw.costCenterUnitId || null;

    if (id) {
      this.api
        .update(id, {
          displayName: raw.displayName || undefined,
          department: raw.department || undefined,
          jobTitle: raw.jobTitle || undefined,
          status: raw.status,
          teamUnitId,
          costCenterUnitId,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.feedback.success('Pessoa atualizada');
            void this.router.navigate(['/people', id]);
          },
          error: (err) => {
            this.saving.set(false);
            if (!applyApiValidationErrors(this.form, err)) {
              this.feedback.fromError(err, 'Falha ao salvar pessoa');
            }
          },
        });
      return;
    }

    this.api
      .create({
        email: raw.email,
        displayName: raw.displayName || undefined,
        department: raw.department || undefined,
        jobTitle: raw.jobTitle || undefined,
        status: raw.status,
        teamUnitId,
        costCenterUnitId,
      })
      .subscribe({
        next: (person) => {
          this.saving.set(false);
          this.feedback.success('Pessoa criada');
          void this.router.navigate(['/people', person.id]);
        },
        error: (err) => {
          this.saving.set(false);
          if (!applyApiValidationErrors(this.form, err)) {
            this.feedback.fromError(err, 'Falha ao criar pessoa');
          }
        },
      });
  }
}
