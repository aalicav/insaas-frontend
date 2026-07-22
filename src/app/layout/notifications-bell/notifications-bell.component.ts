import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsApiService } from '../../core/api/notifications-api.service';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { Notification } from '../../core/models/notifications.models';

const POLL_INTERVAL_MS = 60_000;

@Component({
  selector: 'app-notifications-bell',
  standalone: true,
  imports: [
    RouterLink,
    RelativeTimePipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './notifications-bell.component.html',
  styleUrl: './notifications-bell.component.scss',
})
export class NotificationsBellComponent implements OnInit {
  private readonly api = inject(NotificationsApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly unreadCount = signal(0);
  readonly loadingMenu = signal(false);
  readonly items = signal<Notification[]>([]);
  readonly markingId = signal<string | null>(null);

  canRead = () => this.auth.hasPermission('notifications:read');

  ngOnInit(): void {
    if (!this.canRead()) return;

    interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.api.unreadCount()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.unreadCount.set(res.count),
        error: () => {},
      });
  }

  onMenuOpened(): void {
    if (!this.canRead()) return;
    this.loadingMenu.set(true);
    this.api.list({ unread: true, limit: 8, skip: 0 }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loadingMenu.set(false);
      },
      error: () => this.loadingMenu.set(false),
    });
  }

  openNotification(item: Notification, event: Event): void {
    event.stopPropagation();
    if (!item.readAt) {
      this.markingId.set(item.id);
      this.api.markRead(item.id).subscribe({
        next: () => {
          this.markingId.set(null);
          this.unreadCount.update((c) => Math.max(0, c - 1));
          this.items.update((list) => list.filter((n) => n.id !== item.id));
        },
        error: () => this.markingId.set(null),
      });
    }
    const route = this.resourceRoute(item);
    if (route) void this.router.navigate(route);
  }

  private resourceRoute(item: Notification): string[] | null {
    if (item.resourceType === 'workflow_run' && item.resourceId) {
      return ['/workflows/runs', item.resourceId];
    }
    if (item.resourceType === 'person' && item.resourceId) {
      return ['/people', item.resourceId];
    }
    return null;
  }
}
