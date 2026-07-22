import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ChartData, ChartOptions } from 'chart.js';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { MetricsApiService } from '../../core/api/metrics-api.service';
import { ConnectionsApiService } from '../../core/api/connections-api.service';
import { OrganizationsApiService } from '../../core/api/organizations-api.service';
import { extractApiErrorMessage } from '../../core/api/api-error';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { MiniChartComponent } from '../../shared/components/mini-chart/mini-chart.component';
import { RelativeTimePipe, fullDate } from '../../shared/pipes/relative-time.pipe';
import { providerLabel } from '../../shared/labels/domain-labels';
import { ProviderIconComponent } from '../../shared/components/provider-icon/provider-icon.component';
import { HelpHints } from '../../shared/labels/help-hints';
import { InfoHintComponent } from '../../shared/components/info-hint/info-hint.component';
import {
  LicenseMetricResponse,
  PeopleByUnitResponse,
  SpendMetricResponse,
  WasteMetricResponse,
} from '../../core/models/metrics.models';
import { Connection } from '../../core/models/connection.models';

type MetricKey = 'licenses' | 'spend' | 'waste' | 'people';
type StepStatus = 'done' | 'active' | 'blocked' | 'pending' | 'error';
type OrgDimension = 'team' | 'cost_center';
type PeriodDays = 30 | 90 | 180 | 365;

const DEFAULT_PERIOD: PeriodDays = 90;
const DEFAULT_DIMENSION: OrgDimension = 'team';

interface MetricCardState<T> {
  loading: boolean;
  error: string | null;
  data: T;
}

interface OnboardingStep {
  id: string;
  index: number;
  label: string;
  description: string;
  status: StepStatus;
  statusLabel?: string;
  link: string;
  cta: string;
}

interface ActivityItem {
  id: string;
  tone: 'ok' | 'warn' | 'err' | 'info';
  text: string;
  when: string | null;
}

const CHART = {
  primary: '#6b2030',
  primarySoft: 'rgba(107, 32, 48, 0.18)',
  secondary: '#2563eb',
  secondarySoft: 'rgba(37, 99, 235, 0.16)',
  amber: '#b45309',
  amberSoft: 'rgba(180, 83, 9, 0.2)',
  green: '#1f7a4d',
  muted: '#9ca3af',
  grid: 'rgba(15, 23, 42, 0.06)',
  text: '#64748b',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    RelativeTimePipe,
    EmptyStateComponent,
    SkeletonComponent,
    InfoHintComponent,
    MiniChartComponent,
    ProviderIconComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly metrics = inject(MetricsApiService);
  private readonly connectionsApi = inject(ConnectionsApiService);
  private readonly orgsApi = inject(OrganizationsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly HelpHints = HelpHints;

  readonly periodOptions: Array<{ value: PeriodDays; label: string }> = [
    { value: 30, label: 'Últimos 30 dias' },
    { value: 90, label: 'Últimos 90 dias' },
    { value: 180, label: 'Últimos 6 meses' },
    { value: 365, label: 'Último ano' },
  ];

  readonly filters = this.fb.nonNullable.group({
    periodDays: this.fb.nonNullable.control<PeriodDays>(DEFAULT_PERIOD),
    dimension: this.fb.nonNullable.control<OrgDimension>(DEFAULT_DIMENSION),
    connectionId: this.fb.nonNullable.control(''),
  });

  readonly licenses = signal<MetricCardState<LicenseMetricResponse | null>>({
    loading: false,
    error: null,
    data: null,
  });
  readonly spend = signal<MetricCardState<SpendMetricResponse | null>>({
    loading: false,
    error: null,
    data: null,
  });
  readonly waste = signal<MetricCardState<WasteMetricResponse | null>>({
    loading: false,
    error: null,
    data: null,
  });
  readonly peopleByUnit = signal<MetricCardState<PeopleByUnitResponse | null>>({
    loading: false,
    error: null,
    data: null,
  });
  readonly connections = signal<Connection[]>([]);
  readonly connectionCountLoading = signal(false);
  readonly memberCount = signal<number | null>(null);

  readonly providerLabel = providerLabel;
  readonly fullDate = fullDate;

  readonly canCatalog = () => this.auth.hasPermission('catalog:read');
  readonly canSpend = () => this.auth.hasPermission('spend:read');
  readonly canPeople = () => this.auth.hasPermission('people:read');
  readonly canConnections = () => this.auth.hasPermission('connections:read');
  readonly canWriteConnections = () => this.auth.hasPermission('connections:write');
  readonly canManageMembers = () => this.auth.hasPermission('members:manage');

  readonly showCharts = computed(
    () => this.canCatalog() || this.canSpend() || this.canPeople(),
  );

  /** Live mirror of the filter form for computed labels / chart queries. */
  readonly filterState = signal({
    periodDays: DEFAULT_PERIOD as PeriodDays,
    dimension: DEFAULT_DIMENSION as OrgDimension,
    connectionId: '',
  });

  readonly periodLabel = computed(() => {
    const days = this.filterState().periodDays;
    return this.periodOptions.find((o) => o.value === days)?.label ?? `Últimos ${days} dias`;
  });

  readonly hasActiveFilters = computed(() => {
    const f = this.filterState();
    return (
      f.periodDays !== DEFAULT_PERIOD ||
      f.dimension !== DEFAULT_DIMENSION ||
      !!f.connectionId
    );
  });

  readonly spendChartData = computed<ChartData<'bar'>>(() => {
    const series = this.spend().data?.series ?? [];
    return {
      labels: series.map((p) => this.formatMonth(p.month)),
      datasets: [
        {
          label: 'Faturas',
          data: series.map((p) => p.invoiceBrlMinor / 100),
          backgroundColor: CHART.primary,
          borderRadius: 4,
          stack: 'spend',
        },
        {
          label: 'Cartão',
          data: series.map((p) => p.cardBrlMinor / 100),
          backgroundColor: CHART.amber,
          borderRadius: 4,
          stack: 'spend',
        },
        {
          label: 'Compromissos',
          data: series.map((p) => p.commitmentBrlMinor / 100),
          backgroundColor: CHART.secondary,
          borderRadius: 4,
          stack: 'spend',
        },
        {
          label: 'Ajustes',
          data: series.map((p) => p.adjustmentBrlMinor / 100),
          backgroundColor: CHART.muted,
          borderRadius: 4,
          stack: 'spend',
        },
      ],
    };
  });

  readonly spendChartHasData = computed(
    () => (this.spend().data?.series ?? []).some((p) => p.totalBrlMinor > 0),
  );

  readonly licensesChartData = computed<ChartData<'line'>>(() => {
    const series = this.licenses().data?.series ?? [];
    return {
      labels: series.map((p) => this.formatDay(p.day)),
      datasets: [
        {
          label: 'Assentos',
          data: series.map((p) => p.seats),
          borderColor: CHART.muted,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.3,
        },
        {
          label: 'Atribuídos',
          data: series.map((p) => p.assignedCount),
          borderColor: CHART.primary,
          backgroundColor: CHART.primarySoft,
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
        },
      ],
    };
  });

  readonly licensesChartHasData = computed(
    () => (this.licenses().data?.series ?? []).length > 0,
  );

  readonly wasteChartData = computed<ChartData<'bar'>>(() => {
    const items = [...(this.waste().data?.items ?? [])]
      .filter((i) => i.wasteBrlMinor > 0)
      .sort((a, b) => b.wasteBrlMinor - a.wasteBrlMinor)
      .slice(0, 8);
    return {
      labels: items.map((i) => i.skuName || 'SKU'),
      datasets: [
        {
          label: 'Desperdício (R$/mês)',
          data: items.map((i) => i.wasteBrlMinor / 100),
          backgroundColor: CHART.amber,
          borderRadius: 4,
          barThickness: 14,
        },
      ],
    };
  });

  readonly wasteChartHasData = computed(
    () => (this.waste().data?.items ?? []).some((i) => i.wasteBrlMinor > 0),
  );

  readonly peopleChartData = computed<ChartData<'bar'>>(() => {
    const rows = [...(this.peopleByUnit().data?.byOrgUnit ?? [])]
      .sort((a, b) => b.peopleCount - a.peopleCount)
      .slice(0, 8);
    return {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          label: 'Pessoas',
          data: rows.map((r) => r.peopleCount),
          backgroundColor: CHART.secondary,
          borderRadius: 4,
          barThickness: 16,
        },
      ],
    };
  });

  readonly peopleChartHasData = computed(
    () => (this.peopleByUnit().data?.byOrgUnit ?? []).some((r) => r.peopleCount > 0),
  );

  readonly currencyAxisOptions: ChartOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, color: CHART.text },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = Number(ctx.parsed.y ?? 0);
            return ` ${ctx.dataset.label}: ${v.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: CHART.text, font: { size: 10 }, maxRotation: 0 },
      },
      y: {
        stacked: true,
        grid: { color: CHART.grid },
        ticks: {
          color: CHART.text,
          font: { size: 10 },
          callback: (v) =>
            Number(v).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              notation: 'compact',
              maximumFractionDigits: 1,
            }),
        },
      },
    },
  };

  readonly lineAxisOptions: ChartOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, color: CHART.text },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: CHART.text, font: { size: 10 }, maxTicksLimit: 6 },
      },
      y: {
        beginAtZero: true,
        grid: { color: CHART.grid },
        ticks: { color: CHART.text, font: { size: 10 }, precision: 0 },
      },
    },
  };

  readonly horizontalBarOptions: ChartOptions = {
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = Number(ctx.parsed.x ?? 0);
            return ` ${v.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })}/mês`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: CHART.grid },
        ticks: {
          color: CHART.text,
          font: { size: 10 },
          callback: (v) =>
            Number(v).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              notation: 'compact',
              maximumFractionDigits: 0,
            }),
        },
      },
      y: {
        grid: { display: false },
        ticks: { color: CHART.text, font: { size: 10 } },
      },
    },
  };

  readonly peopleBarOptions: ChartOptions = {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: CHART.grid },
        ticks: { color: CHART.text, font: { size: 10 }, precision: 0 },
      },
      y: {
        grid: { display: false },
        ticks: { color: CHART.text, font: { size: 10 } },
      },
    },
  };

  readonly onboardingSteps = computed<OnboardingStep[]>(() => {
    const conns = this.connections();
    const hasConnection = conns.length > 0;
    const hasError = conns.some((c) => c.status === 'error');
    const hasSynced = conns.some((c) => !!c.lastSyncedAt);
    const hasPeople = this.peopleTotal() > 0;
    const members = this.memberCount();
    const hasTeam = members != null && members > 1;

    const connectStatus: StepStatus = hasConnection ? (hasError ? 'error' : 'done') : 'active';
    const syncStatus: StepStatus = hasSynced
      ? 'done'
      : !hasConnection
        ? 'blocked'
        : hasError
          ? 'error'
          : 'active';
    const peopleStatus: StepStatus = hasPeople ? 'done' : !hasSynced ? 'blocked' : 'active';
    const inviteStatus: StepStatus = hasTeam ? 'done' : hasPeople || hasSynced ? 'active' : 'pending';

    return [
      {
        id: 'connect',
        index: 1,
        label: 'Conectar provider',
        description: 'Ligue Google, Microsoft ou outro provedor à organização.',
        status: connectStatus,
        statusLabel: connectStatus === 'done' ? 'Conectado' : undefined,
        link: this.canWriteConnections() ? '/connections/new' : '/integrations',
        cta: 'Conectar',
      },
      {
        id: 'sync',
        index: 2,
        label: 'Rodar o primeiro sync',
        description: 'Sincronize identidades e licenças do provider conectado.',
        status: syncStatus,
        link: hasConnection ? `/connections/${conns[0].id}` : '/integrations',
        cta: 'Sincronizar',
      },
      {
        id: 'people',
        index: 3,
        label: 'Atualizar cadastro de pessoas',
        description: 'Reconcilie o diretório a partir das identidades sincronizadas.',
        status: peopleStatus,
        link: '/people',
        cta: 'Abrir pessoas',
      },
      {
        id: 'invite',
        index: 4,
        label: 'Convidar equipe',
        description: 'Traga colegas para colaborar na organização.',
        status: inviteStatus,
        link: '/organizations',
        cta: 'Convidar',
      },
    ];
  });

  readonly checklistProgress = computed(() => {
    const steps = this.onboardingSteps();
    const done = steps.filter((s) => s.status === 'done').length;
    const total = steps.length;
    return {
      done,
      total,
      complete: done === total,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  });

  readonly showChecklist = computed(() => {
    if (this.connectionCountLoading()) return false;
    if (!this.canConnections() && !this.canPeople() && !this.canManageMembers()) return false;
    return !this.checklistProgress().complete;
  });

  readonly activityFeed = computed<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const c of this.connections()) {
      if (c.status === 'error') {
        items.push({
          id: `err-${c.id}`,
          tone: 'err',
          text: `Sync com ${providerLabel(c.provider)} falhou`,
          when: c.updatedAt || c.lastSyncedAt || null,
        });
      } else if (c.lastSyncedAt) {
        items.push({
          id: `ok-${c.id}`,
          tone: 'ok',
          text: `Sincronização concluída — ${providerLabel(c.provider)}`,
          when: c.lastSyncedAt,
        });
      } else if (c.status === 'connected') {
        items.push({
          id: `pending-${c.id}`,
          tone: 'warn',
          text: `${providerLabel(c.provider)} conectado — aguardando sync`,
          when: c.createdAt || null,
        });
      }
    }
    if (!items.length) {
      items.push({
        id: 'empty',
        tone: 'info',
        text: 'Sem atividade recente. Conecte um provider para começar.',
        when: null,
      });
    }
    return items.slice(0, 6);
  });

  ngOnInit(): void {
    this.filters.valueChanges
      .pipe(
        debounceTime(120),
        distinctUntilChanged(
          (a, b) =>
            a.periodDays === b.periodDays &&
            a.dimension === b.dimension &&
            a.connectionId === b.connectionId,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.filterState.set({
          periodDays: value.periodDays ?? DEFAULT_PERIOD,
          dimension: value.dimension ?? DEFAULT_DIMENSION,
          connectionId: value.connectionId ?? '',
        });
        this.reloadMetrics();
      });

    this.load();
  }

  load(): void {
    this.reloadMetrics();
    if (this.canConnections()) this.loadConnections();
    if (this.canManageMembers()) this.loadMembers();
  }

  reloadMetrics(): void {
    if (this.canCatalog()) this.loadMetric('licenses');
    if (this.canSpend()) {
      this.loadMetric('spend');
      this.loadMetric('waste');
    }
    if (this.canPeople()) this.loadMetric('people');
  }

  clearFilters(): void {
    this.filters.setValue({
      periodDays: DEFAULT_PERIOD,
      dimension: DEFAULT_DIMENSION,
      connectionId: '',
    });
  }

  retry(key: MetricKey): void {
    this.loadMetric(key);
  }

  private loadConnections(): void {
    this.connectionCountLoading.set(true);
    void firstValueFrom(this.connectionsApi.listConnections())
      .then((items) => {
        this.connections.set(items);
        this.connectionCountLoading.set(false);
      })
      .catch(() => {
        this.connections.set([]);
        this.connectionCountLoading.set(false);
      });
  }

  private loadMembers(): void {
    const orgId = this.auth.me()?.activeOrganization?.id;
    if (!orgId) return;
    void firstValueFrom(this.orgsApi.listMembers(orgId))
      .then((members) => this.memberCount.set(members.length))
      .catch(() => this.memberCount.set(null));
  }

  private isoDaysAgo(days: number): string {
    return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private loadMetric(key: MetricKey): void {
    const { periodDays, dimension, connectionId } = this.filterState();
    const from = this.isoDaysAgo(periodDays);
    const to = this.todayIso();

    if (key === 'licenses') {
      this.licenses.update((s) => ({ ...s, loading: true, error: null }));
      void firstValueFrom(
        this.metrics.licenses({
          from,
          to,
          ...(connectionId ? { connectionId } : {}),
        }),
      )
        .then((data) => {
          this.licenses.set({ loading: false, error: null, data });
        })
        .catch((err) => {
          this.licenses.set({
            loading: false,
            error: extractApiErrorMessage(err, 'Falha ao carregar licenças'),
            data: null,
          });
        });
      return;
    }

    if (key === 'spend') {
      this.spend.update((s) => ({ ...s, loading: true, error: null }));
      void firstValueFrom(
        this.metrics.spend({
          from,
          to,
          dimension,
        }),
      )
        .then((data) => {
          this.spend.set({ loading: false, error: null, data });
        })
        .catch((err) => {
          this.spend.set({
            loading: false,
            error: extractApiErrorMessage(err, 'Falha ao carregar gastos'),
            data: null,
          });
        });
      return;
    }

    if (key === 'waste') {
      this.waste.update((s) => ({ ...s, loading: true, error: null }));
      void firstValueFrom(this.metrics.waste())
        .then((data) => {
          this.waste.set({ loading: false, error: null, data });
        })
        .catch((err) => {
          this.waste.set({
            loading: false,
            error: extractApiErrorMessage(err, 'Falha ao carregar desperdício'),
            data: null,
          });
        });
      return;
    }

    this.peopleByUnit.update((s) => ({ ...s, loading: true, error: null }));
    void firstValueFrom(this.metrics.peopleByUnit(dimension))
      .then((data) => {
        this.peopleByUnit.set({ loading: false, error: null, data });
      })
      .catch((err) => {
        this.peopleByUnit.set({
          loading: false,
          error: extractApiErrorMessage(err, 'Falha ao carregar pessoas'),
          data: null,
        });
      });
  }

  latestLicenseAssigned(): number {
    const series = this.licenses().data?.series ?? [];
    if (!series.length) return 0;
    return series[series.length - 1].assignedCount;
  }

  spendTotal(): number {
    const series = this.spend().data?.series ?? [];
    return series.reduce((s, i) => s + i.totalBrlMinor, 0) / 100;
  }

  wasteTotal(): number {
    const waste = this.waste().data;
    if (!waste) return 0;
    return (waste.wasteBrlMinor ?? 0) / 100;
  }

  peopleTotal(): number {
    return (this.peopleByUnit().data?.byOrgUnit ?? []).reduce(
      (s, u) => s + (u.peopleCount ?? 0),
      0,
    );
  }

  peopleDimensionLabel(): string {
    const dim = this.filterState().dimension ?? this.peopleByUnit().data?.dimension;
    return dim === 'cost_center' ? 'centro de custo' : 'time';
  }

  syncHealthPercent(): number {
    const conns = this.connections();
    if (!conns.length) return 0;
    const healthy = conns.filter((c) => c.status === 'connected' && !!c.lastSyncedAt).length;
    return Math.round((healthy / conns.length) * 1000) / 10;
  }

  private formatMonth(ym: string): string {
    const [y, m] = ym.split('-');
    if (!y || !m) return ym;
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }

  private formatDay(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
