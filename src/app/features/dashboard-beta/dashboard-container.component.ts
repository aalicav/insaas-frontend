import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  Type,
  inject,
  signal,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DisplayGrid,
  GridsterComponent,
  GridsterConfig,
  GridsterItem,
  GridsterItemComponent,
  GridType,
} from 'angular-gridster2';
import { Subject, Subscription, debounceTime, of, switchMap, tap, catchError } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { extractApiErrorMessage } from '../../core/api/api-error';
import {
  DashboardLayout,
  WidgetConfig,
} from './models/dashboard-layout.models';
import { DashboardLayoutService } from './services/dashboard-layout.service';
import { WidgetRegistryService } from './services/widget-registry.service';

/** Gridster item + our persisted widget metadata. */
export type DashboardGridItem = GridsterItem & {
  id: string;
  componentType: string;
  dataPayload?: Record<string, unknown>;
};

/**
 * Smart container: owns Gridster2, loads/saves layout, resolves widgets via registry.
 * OnPush is mandatory — Gridster fires continuous drag events; default CD would
 * re-check every mat-table cell on each pixel move.
 */
@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgComponentOutlet,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    GridsterComponent,
    GridsterItemComponent,
    PageHeaderComponent,
    ErrorStateComponent,
  ],
  templateUrl: './dashboard-container.component.html',
  styleUrl: './dashboard-container.component.scss',
})
export class DashboardContainerComponent implements OnInit, OnDestroy {
  private readonly layoutApi = inject(DashboardLayoutService);
  private readonly registry = inject(WidgetRegistryService);
  private readonly feedback = inject(FeedbackService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly items = signal<DashboardGridItem[]>([]);
  readonly layoutMeta = signal<Pick<DashboardLayout, 'userId' | 'layoutId'> | null>(null);

  private readonly persist$ = new Subject<DashboardGridItem[]>();
  private persistSub?: Subscription;
  private loadSub?: Subscription;

  options: GridsterConfig = {
    gridType: GridType.ScrollVertical,
    displayGrid: DisplayGrid.OnDragAndResize,
    pushItems: true,
    swap: false,
    draggable: { enabled: true },
    resizable: { enabled: true },
    minCols: 12,
    maxCols: 12,
    minRows: 4,
    maxRows: 100,
    defaultItemCols: 3,
    defaultItemRows: 3,
    minItemCols: 2,
    minItemRows: 2,
    margin: 12,
    outerMargin: true,
    disableScrollHorizontal: true,
    itemChangeCallback: () => this.queuePersist(),
    itemResizeCallback: () => this.queuePersist(),
  };

  ngOnInit(): void {
    this.persistSub = this.persist$
      .pipe(
        debounceTime(2000),
        switchMap((widgets) => {
          const meta = this.layoutMeta();
          if (!meta) return of(null);
          this.saving.set(true);
          const payload: DashboardLayout = {
            userId: meta.userId,
            layoutId: meta.layoutId,
            widgets: widgets.map((w) => this.toWidgetConfig(w)),
          };
          return this.layoutApi.saveLayout(payload).pipe(
            tap(() => this.saving.set(false)),
            catchError((err: unknown) => {
              this.saving.set(false);
              this.feedback.fromError(err, 'Falha ao salvar layout');
              return of(null);
            }),
          );
        }),
      )
      .subscribe();

    this.reload();
  }

  ngOnDestroy(): void {
    this.persistSub?.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadSub?.unsubscribe();
    this.loadSub = this.layoutApi.loadLayout().subscribe({
      next: (layout: DashboardLayout) => {
        this.layoutMeta.set({ userId: layout.userId, layoutId: layout.layoutId });
        this.items.set(layout.widgets.map((w) => this.toGridItem(w)));
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar layout'));
      },
    });
  }

  resetLayout(): void {
    this.loading.set(true);
    this.layoutApi.resetLayout().subscribe({
      next: (layout: DashboardLayout) => {
        this.layoutMeta.set({ userId: layout.userId, layoutId: layout.layoutId });
        this.items.set(layout.widgets.map((w) => this.toGridItem(w)));
        this.loading.set(false);
        this.feedback.success('Layout restaurado ao padrão');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.feedback.fromError(err);
      },
    });
  }

  resolveComponent(type: string): Type<unknown> | null {
    return this.registry.resolve(type);
  }

  trackItem(_: number, item: DashboardGridItem): string {
    return item.id;
  }

  private queuePersist(): void {
    this.persist$.next([...this.items()]);
  }

  private toGridItem(w: WidgetConfig): DashboardGridItem {
    return {
      id: w.id,
      componentType: w.componentType,
      dataPayload: w.dataPayload,
      x: w.x,
      y: w.y,
      cols: w.cols,
      rows: w.rows,
      minItemCols: 2,
      minItemRows: 2,
    };
  }

  private toWidgetConfig(item: DashboardGridItem): WidgetConfig {
    return {
      id: item.id,
      componentType: item.componentType,
      x: item.x,
      y: item.y,
      cols: item.cols,
      rows: item.rows,
      dataPayload: item.dataPayload,
    };
  }
}
