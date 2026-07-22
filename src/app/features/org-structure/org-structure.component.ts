import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { OrgStructureApiService } from '../../core/api/org-structure-api.service';
import { PeopleApiService } from '../../core/api/people-api.service';
import { applyApiValidationErrors, extractApiErrorMessage } from '../../core/api/api-error';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  MappingSuggestionsResponse,
  OrgUnit,
  OrgUnitKind,
  OrgViews,
  OwnerReportsRunResponse,
} from '../../core/models/org-structure.models';
import { Person } from '../../core/models/people.models';
import { HelpHints } from '../../shared/labels/help-hints';
import { InfoHintComponent } from '../../shared/components/info-hint/info-hint.component';

interface MappingSelection {
  departmentFromIdp: string;
  key: string;
  count: number;
  suggestedTeamUnitId: string | null;
  suggestedTeamName: string | null;
  needsNewTeam: boolean;
  selected: boolean;
  teamUnitId: string;
}

@Component({
  selector: 'app-org-structure',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    DatePipe,
    InfoHintComponent,
  ],
  templateUrl: './org-structure.component.html',
  styleUrl: './org-structure.component.scss',
})
export class OrgStructureComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly HelpHints = HelpHints;
  private readonly api = inject(OrgStructureApiService);
  private readonly peopleApi = inject(PeopleApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly savingUnit = signal(false);
  readonly savingViews = signal(false);
  readonly mappingLoading = signal(false);
  readonly bulkMapping = signal(false);
  readonly runningReports = signal(false);
  readonly units = signal<OrgUnit[]>([]);
  readonly views = signal<OrgViews | null>(null);
  readonly people = signal<Person[]>([]);
  readonly mapping = signal<MappingSuggestionsResponse | null>(null);
  readonly mappingRows = signal<MappingSelection[]>([]);
  readonly ownerReportResult = signal<OwnerReportsRunResponse | null>(null);
  readonly editingUnitId = signal<string | null>(null);
  readonly unitColumns = ['name', 'kind', 'code', 'members', 'owner', 'status', 'actions'];
  readonly mappingColumns = ['selected', 'department', 'count', 'suggestion', 'target'];

  readonly unitFilters = this.fb.nonNullable.group({
    kind: [''],
    status: ['active' as '' | 'active' | 'inactive'],
    q: [''],
  });

  readonly unitForm = this.fb.nonNullable.group({
    kind: ['team' as OrgUnitKind, Validators.required],
    name: ['', Validators.required],
    code: [''],
    ownerPersonId: [''],
    status: ['active' as 'active' | 'inactive'],
  });

  readonly viewsForm = this.fb.nonNullable.group({
    primaryView: ['team' as OrgUnitKind, Validators.required],
    secondaryView: ['' as '' | OrgUnitKind],
  });

  readonly mappingOptions = this.fb.nonNullable.group({
    dryRun: [true],
    createMissingTeams: [true],
  });

  readonly hasUnitFilters = computed(() => {
    const raw = this.unitFilters.getRawValue();
    return !!(raw.kind || raw.q || raw.status !== 'active');
  });

  readonly allMappingSelected = computed(
    () => this.mappingRows().length > 0 && this.mappingRows().every((row) => row.selected),
  );

  canRead = () => this.auth.hasPermission('people:read');
  canWriteUnits = () => this.auth.hasPermission('people:write');
  canManageViews = () => this.auth.hasPermission('org:settings');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    if (!this.canRead()) {
      this.loading.set(false);
      this.error.set('Sem permissão para visualizar a estrutura organizacional');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      units: this.api.listUnits({
        kind: (this.unitFilters.getRawValue().kind as OrgUnitKind) || undefined,
        status: this.unitFilters.getRawValue().status || undefined,
        q: this.unitFilters.getRawValue().q || undefined,
      }),
      views: this.api.getViews(),
      people: this.peopleApi.list({ status: 'active' }),
    }).subscribe({
      next: ({ units, views, people }) => {
        this.units.set(units);
        this.views.set(views);
        this.people.set(people);
        this.viewsForm.patchValue({
          primaryView: views.primaryView,
          secondaryView: views.secondaryView ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar estrutura organizacional'));
      },
    });
  }

  reloadUnits(): void {
    const raw = this.unitFilters.getRawValue();
    this.api
      .listUnits({
        kind: (raw.kind as OrgUnitKind) || undefined,
        status: raw.status || undefined,
        q: raw.q || undefined,
      })
      .subscribe({
        next: (items) => this.units.set(items),
        error: (err) => this.feedback.fromError(err, 'Falha ao carregar unidades'),
      });
  }

  clearUnitFilters(): void {
    this.unitFilters.reset({ kind: '', status: 'active', q: '' });
    this.reloadUnits();
  }

  resetUnitForm(): void {
    this.editingUnitId.set(null);
    this.unitForm.reset({
      kind: 'team',
      name: '',
      code: '',
      ownerPersonId: '',
      status: 'active',
    });
  }

  editUnit(unit: OrgUnit): void {
    this.editingUnitId.set(unit.id);
    this.unitForm.patchValue({
      kind: unit.kind,
      name: unit.name,
      code: unit.code ?? '',
      ownerPersonId: unit.ownerPersonId ?? '',
      status: unit.status,
    });
  }

  saveUnit(): void {
    if (this.unitForm.invalid) {
      this.unitForm.markAllAsTouched();
      return;
    }
    this.savingUnit.set(true);
    const raw = this.unitForm.getRawValue();
    const id = this.editingUnitId();

    if (id) {
      this.api
        .updateUnit(id, {
          name: raw.name,
          code: raw.code || null,
          ownerPersonId: raw.ownerPersonId || null,
          status: raw.status,
        })
        .subscribe({
          next: () => {
            this.savingUnit.set(false);
            this.feedback.success('Unidade atualizada');
            this.resetUnitForm();
            this.reloadUnits();
          },
          error: (err) => {
            this.savingUnit.set(false);
            if (!applyApiValidationErrors(this.unitForm, err)) {
              this.feedback.fromError(err, 'Falha ao salvar unidade');
            }
          },
        });
      return;
    }

    this.api
      .createUnit({
        kind: raw.kind,
        name: raw.name,
        code: raw.code || undefined,
        ownerPersonId: raw.ownerPersonId || null,
      })
      .subscribe({
        next: () => {
          this.savingUnit.set(false);
          this.feedback.success('Unidade criada');
          this.resetUnitForm();
          this.reloadUnits();
        },
        error: (err) => {
          this.savingUnit.set(false);
          if (!applyApiValidationErrors(this.unitForm, err)) {
            this.feedback.fromError(err, 'Falha ao criar unidade');
          }
        },
      });
  }

  deactivateUnit(unit: OrgUnit): void {
    this.confirm
      .open({
        title: 'Desativar unidade',
        message: `Desativar ${unit.name}? Membros permanecem, mas a unidade deixa de aparecer como ativa.`,
        confirmLabel: 'Desativar',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.api.deactivateUnit(unit.id).subscribe({
          next: () => {
            this.feedback.success('Unidade desativada');
            this.reloadUnits();
          },
          error: (err) => this.feedback.fromError(err, 'Falha ao desativar unidade'),
        });
      });
  }

  saveViews(): void {
    if (this.viewsForm.invalid) {
      this.viewsForm.markAllAsTouched();
      return;
    }
    this.savingViews.set(true);
    const raw = this.viewsForm.getRawValue();
    this.api
      .updateViews({
        primaryView: raw.primaryView,
        secondaryView: raw.secondaryView || null,
      })
      .subscribe({
        next: (views) => {
          this.savingViews.set(false);
          this.views.set(views);
          this.feedback.success('Visualizações atualizadas');
        },
        error: (err) => {
          this.savingViews.set(false);
          if (!applyApiValidationErrors(this.viewsForm, err)) {
            this.feedback.fromError(err, 'Falha ao salvar visualizações');
          }
        },
      });
  }

  loadMappingSuggestions(): void {
    this.mappingLoading.set(true);
    this.api.mappingSuggestions().subscribe({
      next: (response) => {
        this.mapping.set(response);
        this.mappingRows.set(
          response.suggestions.map((item) => ({
            ...item,
            selected: true,
            teamUnitId: item.suggestedTeamUnitId ?? '',
          })),
        );
        this.mappingLoading.set(false);
      },
      error: (err) => {
        this.mappingLoading.set(false);
        this.feedback.fromError(err, 'Falha ao carregar sugestões de mapeamento');
      },
    });
  }

  toggleAllMapping(selected: boolean): void {
    this.mappingRows.update((rows) => rows.map((row) => ({ ...row, selected })));
  }

  toggleMappingRow(index: number, selected: boolean): void {
    this.mappingRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, selected } : row)),
    );
  }

  updateMappingTeam(index: number, teamUnitId: string): void {
    this.mappingRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, teamUnitId } : row)),
    );
  }

  bulkMap(): void {
    const rows = this.mappingRows().filter((row) => row.selected);
    if (!rows.length) {
      this.feedback.warning('Selecione ao menos um departamento');
      return;
    }

    this.bulkMapping.set(true);
    const opts = this.mappingOptions.getRawValue();
    this.api
      .bulkMap({
        dryRun: opts.dryRun,
        createMissingTeams: opts.createMissingTeams,
        mappings: rows.map((row) => ({
          departmentKey: row.key,
          teamUnitId: row.teamUnitId || null,
        })),
      })
      .subscribe({
        next: (result) => {
          this.bulkMapping.set(false);
          const prefix = result.dryRun ? 'Simulação:' : 'Mapeamento concluído:';
          this.feedback.success(
            `${prefix} ${result.updated} pessoa(s), ${result.teamsCreated} time(s) criado(s)`,
          );
          if (!result.dryRun) {
            this.loadMappingSuggestions();
            this.reloadUnits();
          }
        },
        error: (err) => {
          this.bulkMapping.set(false);
          this.feedback.fromError(err, 'Falha ao aplicar mapeamento');
        },
      });
  }

  runOwnerReports(): void {
    this.runningReports.set(true);
    this.api.runOwnerReports().subscribe({
      next: (result) => {
        this.runningReports.set(false);
        this.ownerReportResult.set(result);
        this.feedback.success(
          `Relatórios enviados: ${result.notified} de ${result.scanned} unidade(s)`,
        );
      },
      error: (err) => {
        this.runningReports.set(false);
        this.feedback.fromError(err, 'Falha ao executar relatórios de owners');
      },
    });
  }

  bulkCreateFromForm(): void {
    if (this.unitForm.invalid) {
      this.unitForm.markAllAsTouched();
      return;
    }
    const raw = this.unitForm.getRawValue();
    this.api
      .bulkCreateUnits({
        units: [
          {
            kind: raw.kind,
            name: raw.name,
            code: raw.code || undefined,
            ownerPersonId: raw.ownerPersonId || null,
          },
        ],
      })
      .subscribe({
        next: (res) => {
          this.feedback.success(`${res.created.length} unidade(s) criada(s)`);
          this.unitForm.patchValue({ name: '', code: '', ownerPersonId: '' });
          this.reloadUnits();
        },
        error: (err) => this.feedback.fromError(err, 'Falha no cadastro em lote'),
      });
  }

  kindLabel(kind: OrgUnitKind | string): string {
    return kind === 'cost_center' ? 'Centro de custo' : 'Time';
  }

  personLabel(personId: string | null | undefined): string {
    if (!personId) return '—';
    const found = this.people().find((p) => p.id === personId);
    return found?.displayName || found?.email || personId.slice(0, 8);
  }

  teamOptions(): OrgUnit[] {
    return this.units().filter((u) => u.kind === 'team' && u.status === 'active');
  }
}
