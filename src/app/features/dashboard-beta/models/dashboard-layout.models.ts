/** Persistence contract for spatial dashboard layouts (Gridster2). */

export type UUID = string;

export type WidgetComponentType =
  | 'METRIC_LICENSES'
  | 'METRIC_SPEND'
  | 'METRIC_WASTE'
  | 'METRIC_PEOPLE'
  | 'PEOPLE_BY_UNIT'
  | 'NEXT_STEP'
  | 'PROCESS_TABLE'
  | 'LEADERBOARD';

export interface WidgetConfig {
  /** Unique block id on the canvas */
  id: string;
  /** Registry key → Angular component */
  componentType: WidgetComponentType | string;
  x: number;
  y: number;
  cols: number;
  rows: number;
  /** Filters / params for that widget instance */
  dataPayload?: Record<string, unknown>;
}

export interface DashboardLayout {
  userId: UUID;
  layoutId: UUID;
  widgets: WidgetConfig[];
}

/** Gridster item shape used by the container (extends WidgetConfig). */
export interface GridsterWidgetItem extends WidgetConfig {
  // angular-gridster2 mutates these at runtime; keep optional mirrors
  minItemCols?: number;
  minItemRows?: number;
}
