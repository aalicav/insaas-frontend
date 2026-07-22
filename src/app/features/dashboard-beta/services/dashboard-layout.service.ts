import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import {
  DashboardLayout,
  WidgetConfig,
} from '../models/dashboard-layout.models';

const STORAGE_PREFIX = 'ih.dashboard.layout.';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Default spatial layout for /dashboard-beta (mock until API exists). */
export function createDefaultWidgets(): WidgetConfig[] {
  return [
    {
      id: 'w-next',
      componentType: 'NEXT_STEP',
      x: 0,
      y: 0,
      cols: 12,
      rows: 2,
    },
    {
      id: 'w-licenses',
      componentType: 'METRIC_LICENSES',
      x: 0,
      y: 2,
      cols: 3,
      rows: 3,
    },
    {
      id: 'w-spend',
      componentType: 'METRIC_SPEND',
      x: 3,
      y: 2,
      cols: 3,
      rows: 3,
    },
    {
      id: 'w-waste',
      componentType: 'METRIC_WASTE',
      x: 6,
      y: 2,
      cols: 3,
      rows: 3,
    },
    {
      id: 'w-people',
      componentType: 'METRIC_PEOPLE',
      x: 9,
      y: 2,
      cols: 3,
      rows: 3,
    },
    {
      id: 'w-units',
      componentType: 'PEOPLE_BY_UNIT',
      x: 0,
      y: 5,
      cols: 6,
      rows: 5,
    },
    {
      id: 'w-process',
      componentType: 'PROCESS_TABLE',
      x: 6,
      y: 5,
      cols: 6,
      rows: 5,
    },
    {
      id: 'w-leaderboard',
      componentType: 'LEADERBOARD',
      x: 0,
      y: 10,
      cols: 12,
      rows: 4,
    },
  ];
}

/**
 * Layout persistence. Today: localStorage + simulated API latency.
 * Tomorrow: replace body with HttpClient GET/PATCH against backend contract.
 */
@Injectable({ providedIn: 'root' })
export class DashboardLayoutService {
  private readonly auth = inject(AuthService);

  private storageKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId}`;
  }

  loadLayout(): Observable<DashboardLayout> {
    const userId = this.auth.me()?.id ?? 'anonymous';
    const raw = localStorage.getItem(this.storageKey(userId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DashboardLayout;
        if (parsed?.widgets?.length) {
          return of(parsed).pipe(delay(120));
        }
      } catch {
        /* fall through to default */
      }
    }

    const layout: DashboardLayout = {
      userId,
      layoutId: uuid(),
      widgets: createDefaultWidgets(),
    };
    return of(layout).pipe(delay(120));
  }

  /** PATCH-style save — debounce must happen in the container, not here. */
  saveLayout(layout: DashboardLayout): Observable<DashboardLayout> {
    const userId = this.auth.me()?.id ?? layout.userId;
    const next: DashboardLayout = { ...layout, userId };
    localStorage.setItem(this.storageKey(userId), JSON.stringify(next));
    return of(next).pipe(delay(80));
  }

  resetLayout(): Observable<DashboardLayout> {
    const userId = this.auth.me()?.id ?? 'anonymous';
    localStorage.removeItem(this.storageKey(userId));
    return this.loadLayout();
  }
}
