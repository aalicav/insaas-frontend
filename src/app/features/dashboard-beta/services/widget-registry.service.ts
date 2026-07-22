import { Injectable, Type } from '@angular/core';
import {
  MetricLicensesWidgetComponent,
  MetricSpendWidgetComponent,
  MetricWasteWidgetComponent,
  MetricPeopleWidgetComponent,
  PeopleByUnitWidgetComponent,
  NextStepWidgetComponent,
  ProcessTableWidgetComponent,
  LeaderboardWidgetComponent,
} from '../widgets/metric-widgets.bundle';

/**
 * Singleton registry: componentType (persisted) → Angular component class.
 * Prefer this over giant ngSwitch templates; hosts resolve via NgComponentOutlet.
 */
@Injectable({ providedIn: 'root' })
export class WidgetRegistryService {
  private readonly map = new Map<string, Type<unknown>>([
    ['METRIC_LICENSES', MetricLicensesWidgetComponent],
    ['METRIC_SPEND', MetricSpendWidgetComponent],
    ['METRIC_WASTE', MetricWasteWidgetComponent],
    ['METRIC_PEOPLE', MetricPeopleWidgetComponent],
    ['PEOPLE_BY_UNIT', PeopleByUnitWidgetComponent],
    ['NEXT_STEP', NextStepWidgetComponent],
    ['PROCESS_TABLE', ProcessTableWidgetComponent],
    ['LEADERBOARD', LeaderboardWidgetComponent],
  ]);

  register(type: string, component: Type<unknown>): void {
    this.map.set(type, component);
  }

  resolve(componentType: string): Type<unknown> | null {
    return this.map.get(componentType) ?? null;
  }

  has(componentType: string): boolean {
    return this.map.has(componentType);
  }

  keys(): string[] {
    return [...this.map.keys()];
  }
}
