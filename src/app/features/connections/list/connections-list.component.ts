import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../core/auth/auth.service';
import { ConnectionsApiService } from '../../../core/api/connections-api.service';
import { extractApiErrorMessage } from '../../../core/api/api-error';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { RelativeTimePipe, fullDate } from '../../../shared/pipes/relative-time.pipe';
import { providerLabel } from '../../../shared/labels/domain-labels';
import { ProviderIconComponent } from '../../../shared/components/provider-icon/provider-icon.component';
import { Connection } from '../../../core/models/connection.models';

@Component({
  selector: 'app-connections-list',
  standalone: true,
  imports: [
    RouterLink,
    RelativeTimePipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    ProviderIconComponent,
  ],
  templateUrl: './connections-list.component.html',
  styleUrl: './connections-list.component.scss',
})
export class ConnectionsListComponent implements OnInit {
  private readonly api = inject(ConnectionsApiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly connections = signal<Connection[]>([]);
  readonly columns = ['displayName', 'provider', 'status', 'lastSyncedAt'];
  readonly skeletonRows = [1, 2, 3, 4];
  readonly providerLabel = providerLabel;
  readonly fullDate = fullDate;

  canWrite = () => this.auth.hasPermission('connections:write');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listConnections().subscribe({
      next: (items) => {
        this.connections.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar conexões'));
      },
    });
  }

  open(row: Connection): void {
    void this.router.navigate(['/connections', row.id]);
  }
}
