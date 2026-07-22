import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MetricsApiService } from '../../../core/api/metrics-api.service';
import { ConnectionsApiService } from '../../../core/api/connections-api.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  LicenseMetricResponse,
  PeopleByUnitRow,
  SpendMetricResponse,
  WasteMetricResponse,
} from '../../../core/models/metrics.models';

/** Shared shell styles for all grid widgets — fill Gridster cell, no margin leak. */
export const WIDGET_HOST_STYLES = `
  :host {
    display: block;
    height: 100%;
    width: 100%;
    min-height: 0;
  }
  .widget-root {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: var(--ih-bg-secondary);
    border: 1px solid var(--ih-border);
    border-radius: 0;
    box-shadow: none;
  }
  .widget-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.85rem 1rem 1rem;
  }
  .widget-head {
    padding: 0.75rem 1rem 0;
  }
  .metric-value {
    display: block;
    font-size: var(--ih-text-metric);
    font-weight: 700;
    letter-spacing: -0.03em;
    margin-top: 0.35rem;
    font-variant-numeric: tabular-nums;
  }
`;

@Component({
  selector: 'app-metric-licenses-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    ErrorStateComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="widget-root">
      <div class="widget-head">
        <div class="ih-label">Licenças</div>
      </div>
      <div class="widget-body">
        @if (loading()) {
          <app-skeleton height="2rem" width="40%" />
          <app-skeleton height="0.85rem" width="70%" />
        } @else if (error()) {
          <app-error-state
            [inline]="true"
            title="Falha nas licenças"
            [message]="error()!"
            (retry)="load()"
          />
        } @else {
          <strong class="metric-value">{{ value() | number }}</strong>
          <p class="ih-muted">Assentos atribuídos</p>
          <a mat-button color="primary" routerLink="/integrations">Ver integrações</a>
        }
      </div>
    </div>
  `,
  styles: [WIDGET_HOST_STYLES],
})
export class MetricLicensesWidgetComponent implements OnInit {
  private readonly metrics = inject(MetricsApiService);
  private readonly auth = inject(AuthService);

  @Input() dataPayload: Record<string, unknown> | undefined;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly value = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.auth.hasPermission('catalog:read')) {
      this.loading.set(false);
      this.error.set('Seu papel não tem acesso a esta métrica.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    void firstValueFrom(this.metrics.licenses({}))
      .then((data: LicenseMetricResponse) => {
        const series = data?.series ?? [];
        const latest = series.length ? series[series.length - 1].assignedCount : 0;
        this.value.set(latest);
        this.loading.set(false);
      })
      .catch((err) => {
        this.error.set(extractApiErrorMessage(err));
        this.loading.set(false);
      });
  }
}

@Component({
  selector: 'app-metric-spend-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, ErrorStateComponent, SkeletonComponent],
  template: `
    <div class="widget-root">
      <div class="widget-head"><div class="ih-label">Gastos</div></div>
      <div class="widget-body">
        @if (loading()) {
          <app-skeleton height="2rem" width="45%" />
        } @else if (error()) {
          <app-error-state [inline]="true" title="Falha nos gastos" [message]="error()!" (retry)="load()" />
        } @else {
          <strong class="metric-value">{{ value() | currency: 'BRL' }}</strong>
          <p class="ih-muted">Total no período</p>
        }
      </div>
    </div>
  `,
  styles: [WIDGET_HOST_STYLES],
})
export class MetricSpendWidgetComponent implements OnInit {
  private readonly metrics = inject(MetricsApiService);
  private readonly auth = inject(AuthService);
  @Input() dataPayload: Record<string, unknown> | undefined;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly value = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.auth.hasPermission('spend:read')) {
      this.loading.set(false);
      this.error.set('Seu papel não tem acesso a esta métrica.');
      return;
    }
    this.loading.set(true);
    void firstValueFrom(this.metrics.spend({}))
      .then((data: SpendMetricResponse) => {
        const total =
          (data?.series ?? []).reduce((s, i) => s + (i.totalBrlMinor ?? 0), 0) / 100;
        this.value.set(total);
        this.loading.set(false);
      })
      .catch((err) => {
        this.error.set(extractApiErrorMessage(err));
        this.loading.set(false);
      });
  }
}

@Component({
  selector: 'app-metric-waste-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, ErrorStateComponent, SkeletonComponent],
  template: `
    <div class="widget-root">
      <div class="widget-head"><div class="ih-label">Desperdício</div></div>
      <div class="widget-body">
        @if (loading()) {
          <app-skeleton height="2rem" width="45%" />
        } @else if (error()) {
          <app-error-state [inline]="true" title="Falha no desperdício" [message]="error()!" (retry)="load()" />
        } @else {
          <strong class="metric-value">{{ value() | currency: 'BRL' }}</strong>
          <p class="ih-muted">Estimativa de assentos ociosos</p>
        }
      </div>
    </div>
  `,
  styles: [WIDGET_HOST_STYLES],
})
export class MetricWasteWidgetComponent implements OnInit {
  private readonly metrics = inject(MetricsApiService);
  private readonly auth = inject(AuthService);
  @Input() dataPayload: Record<string, unknown> | undefined;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly value = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.auth.hasPermission('spend:read')) {
      this.loading.set(false);
      this.error.set('Seu papel não tem acesso a esta métrica.');
      return;
    }
    this.loading.set(true);
    void firstValueFrom(this.metrics.waste())
      .then((data: WasteMetricResponse) => {
        this.value.set((data?.wasteBrlMinor ?? 0) / 100);
        this.loading.set(false);
      })
      .catch((err) => {
        this.error.set(extractApiErrorMessage(err));
        this.loading.set(false);
      });
  }
}

@Component({
  selector: 'app-metric-people-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, RouterLink, MatButtonModule, ErrorStateComponent, SkeletonComponent],
  template: `
    <div class="widget-root">
      <div class="widget-head"><div class="ih-label">Pessoas</div></div>
      <div class="widget-body">
        @if (loading()) {
          <app-skeleton height="2rem" width="35%" />
        } @else if (error()) {
          <app-error-state [inline]="true" title="Falha nas pessoas" [message]="error()!" (retry)="load()" />
        } @else {
          <strong class="metric-value">{{ value() | number }}</strong>
          <p class="ih-muted">No diretório</p>
          <a mat-button color="primary" routerLink="/people">Ver pessoas</a>
        }
      </div>
    </div>
  `,
  styles: [WIDGET_HOST_STYLES],
})
export class MetricPeopleWidgetComponent implements OnInit {
  private readonly metrics = inject(MetricsApiService);
  private readonly auth = inject(AuthService);
  @Input() dataPayload: Record<string, unknown> | undefined;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly value = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.auth.hasPermission('people:read')) {
      this.loading.set(false);
      this.error.set('Seu papel não tem acesso a esta métrica.');
      return;
    }
    this.loading.set(true);
    void firstValueFrom(this.metrics.peopleByUnitRows())
      .then((rows: PeopleByUnitRow[]) => {
        this.value.set(rows.reduce((s, u) => s + (u.peopleCount ?? 0), 0));
        this.loading.set(false);
      })
      .catch((err) => {
        this.error.set(extractApiErrorMessage(err));
        this.loading.set(false);
      });
  }
}

@Component({
  selector: 'app-people-by-unit-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, ErrorStateComponent, SkeletonComponent, EmptyStateComponent],
  template: `
    <div class="widget-root">
      <div class="widget-head"><div class="ih-label">Pessoas por unidade</div></div>
      <div class="widget-body">
        @if (loading()) {
          @for (_ of [1, 2, 3]; track $index) {
            <app-skeleton height="2.2rem" />
          }
        } @else if (error()) {
          <app-error-state [inline]="true" title="Falha nas pessoas" [message]="error()!" (retry)="load()" />
        } @else if (!rows().length) {
          <app-empty-state
            [inline]="true"
            title="Sem distribuição"
            description="Quando houver pessoas por unidade, elas aparecem aqui."
            icon="account_tree"
          >
            <a mat-stroked-button routerLink="/people">Abrir pessoas</a>
          </app-empty-state>
        } @else {
          <div class="unit-list">
            @for (unit of rows(); track unit.orgUnitId) {
              <div class="unit-row">
                <span>{{ unit.name }}</span>
                <strong>{{ unit.peopleCount }}</strong>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    WIDGET_HOST_STYLES,
    `
      .unit-list { display: flex; flex-direction: column; gap: 0.5rem; }
      .unit-row {
        display: flex; justify-content: space-between; gap: 1rem;
        padding: 0.55rem 0.7rem; border: 1px solid var(--ih-border);
        background: var(--ih-bg-tertiary);
      }
    `,
  ],
})
export class PeopleByUnitWidgetComponent implements OnInit {
  private readonly metrics = inject(MetricsApiService);
  private readonly auth = inject(AuthService);
  @Input() dataPayload: Record<string, unknown> | undefined;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<PeopleByUnitRow[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.auth.hasPermission('people:read')) {
      this.loading.set(false);
      this.error.set('Seu papel não tem acesso a esta métrica.');
      return;
    }
    this.loading.set(true);
    void firstValueFrom(this.metrics.peopleByUnitRows())
      .then((data) => {
        this.rows.set(data ?? []);
        this.loading.set(false);
      })
      .catch((err) => {
        this.error.set(extractApiErrorMessage(err));
        this.loading.set(false);
      });
  }
}

@Component({
  selector: 'app-next-step-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="widget-root">
      <div class="widget-body next">
        <div>
          <div class="ih-label">Próximo passo</div>
          <h2>{{ title() }}</h2>
          <p class="ih-muted">{{ subtitle() }}</p>
        </div>
        <div class="ih-actions">
          @if (primaryLink()) {
            <a mat-flat-button color="primary" [routerLink]="primaryLink()!">
              <mat-icon>arrow_forward</mat-icon>
              {{ primaryLabel() }}
            </a>
          }
          <a mat-stroked-button routerLink="/integrations">Ver integrações</a>
        </div>
      </div>
    </div>
  `,
  styles: [
    WIDGET_HOST_STYLES,
    `
      .next {
        display: flex; justify-content: space-between; align-items: center;
        gap: 1rem; flex-wrap: wrap;
      }
      h2 { margin: 0.35rem 0 0.4rem; font-size: 1.2rem; }
      p { margin: 0; max-width: 36rem; }
    `,
  ],
})
export class NextStepWidgetComponent implements OnInit {
  private readonly connections = inject(ConnectionsApiService);
  private readonly auth = inject(AuthService);
  @Input() dataPayload: Record<string, unknown> | undefined;

  readonly title = signal('Organize seu dashboard');
  readonly subtitle = signal('Arraste e redimensione os blocos. O layout é salvo automaticamente.');
  readonly primaryLink = signal<string | null>('/connections/new');
  readonly primaryLabel = signal('Conectar provider');

  ngOnInit(): void {
    if (!this.auth.hasPermission('connections:read')) return;
    void firstValueFrom(this.connections.listConnections())
      .then((items) => {
        if (items.length === 0) {
          this.title.set('Conecte o primeiro provider');
          this.subtitle.set('Sem conexão, ainda não há identidades para sincronizar.');
          this.primaryLink.set(
            this.auth.hasPermission('connections:write') ? '/connections/new' : '/integrations',
          );
          this.primaryLabel.set(
            this.auth.hasPermission('connections:write') ? 'Conectar provider' : 'Ver integrações',
          );
        } else {
          this.title.set('Dashboard espacial');
          this.subtitle.set('Arraste os widgets. Alterações são salvas automaticamente.');
          this.primaryLink.set('/people');
          this.primaryLabel.set('Ir para pessoas');
        }
      })
      .catch(() => undefined);
  }
}

@Component({
  selector: 'app-process-table-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="widget-root">
      <div class="widget-head">
        <div class="ih-label">Process table (demo)</div>
        <p class="ih-muted tip">Tabela densa — overflow local; resize não dispara HTTP.</p>
      </div>
      <div class="widget-body">
        <table class="dense-table">
          <thead>
            <tr>
              <th>Processo</th>
              <th>Status</th>
              <th>SLA</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row.id) {
              <tr>
                <td>{{ row.name }}</td>
                <td>{{ row.status }}</td>
                <td>{{ row.sla }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="ih-muted size">Viewport ≈ {{ hostHeight() }}px</p>
      </div>
    </div>
  `,
  styles: [
    WIDGET_HOST_STYLES,
    `
      .tip { margin: 0.25rem 0 0; font-size: 0.8rem; }
      .dense-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
      .dense-table th, .dense-table td {
        text-align: left; padding: 0.45rem 0.5rem;
        border-bottom: 1px solid var(--ih-border);
      }
      .dense-table th { color: var(--ih-text-tertiary); font-weight: 600; }
      .size { margin-top: 0.75rem; font-size: 0.75rem; }
    `,
  ],
})
export class ProcessTableWidgetComponent implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  @Input() dataPayload: Record<string, unknown> | undefined;
  readonly hostHeight = signal(0);
  private observer?: ResizeObserver;

  readonly rows = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    name: `Processo ${i + 1}`,
    status: i % 3 === 0 ? 'Atrasado' : i % 2 === 0 ? 'Em andamento' : 'Concluído',
    sla: `${80 + (i % 15)}%`,
  }));

  ngOnInit(): void {
    // Observe host size on resize — UI only, no HTTP
    const el = this.host.nativeElement.querySelector('.widget-root');
    if (!el || typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      this.hostHeight.set(Math.round(h));
    });
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}

@Component({
  selector: 'app-leaderboard-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="widget-root">
      <div class="widget-head"><div class="ih-label">Leaderboard (demo)</div></div>
      <div class="widget-body">
        <ol class="board">
          @for (entry of entries; track entry.rank) {
            <li>
              <span class="rank">{{ entry.rank }}</span>
              <span class="name">{{ entry.name }}</span>
              <strong>{{ entry.score }}</strong>
            </li>
          }
        </ol>
      </div>
    </div>
  `,
  styles: [
    WIDGET_HOST_STYLES,
    `
      .board { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.45rem; }
      li {
        display: grid; grid-template-columns: 2rem 1fr auto; gap: 0.75rem; align-items: center;
        padding: 0.5rem 0.65rem; border: 1px solid var(--ih-border); background: var(--ih-bg-tertiary);
      }
      .rank { color: var(--ih-primary-light); font-weight: 700; }
    `,
  ],
})
export class LeaderboardWidgetComponent {
  @Input() dataPayload: Record<string, unknown> | undefined;
  readonly entries = [
    { rank: 1, name: 'Equipe Alfa', score: 1280 },
    { rank: 2, name: 'Equipe Beta', score: 1110 },
    { rank: 3, name: 'Equipe Gama', score: 980 },
    { rank: 4, name: 'Equipe Delta', score: 870 },
    { rank: 5, name: 'Equipe Épsilon', score: 760 },
  ];
}
