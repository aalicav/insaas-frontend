import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PeopleApiService } from '../../core/api/people-api.service';
import { ConnectionsApiService } from '../../core/api/connections-api.service';
import { providerLabel } from '../../shared/labels/domain-labels';
import { Person } from '../../core/models/people.models';
import { Connection } from '../../core/models/connection.models';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  visible: boolean;
}

interface SearchResult {
  kind: 'person' | 'connection' | 'action';
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
})
export class CommandPaletteComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<CommandPaletteComponent>);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly peopleApi = inject(PeopleApiService);
  private readonly connectionsApi = inject(ConnectionsApiService);

  readonly query = new FormControl('', { nonNullable: true });
  readonly loading = signal(false);
  readonly results = signal<SearchResult[]>([]);
  readonly activeIndex = signal(0);

  private connections: Connection[] = [];
  private readonly actions: QuickAction[] = [
    {
      id: 'integrations',
      label: 'Ver integrações',
      icon: 'hub',
      route: '/integrations',
      visible: this.auth.hasPermission('connections:read'),
    },
    {
      id: 'catalog',
      label: 'Catálogo sincronizado',
      icon: 'inventory_2',
      route: '/catalog',
      visible: this.auth.hasPermission('catalog:read'),
    },
    {
      id: 'inventory',
      label: 'Inventário de apps',
      icon: 'apps',
      route: '/inventory',
      visible: this.auth.hasPermission('inventory:read'),
    },
    {
      id: 'contracts',
      label: 'Contratos',
      icon: 'description',
      route: '/contracts',
      visible: this.auth.hasPermission('contracts:read'),
    },
    {
      id: 'spend',
      label: 'Gastos',
      icon: 'payments',
      route: '/spend',
      visible: this.auth.hasPermission('spend:read'),
    },
    {
      id: 'org-structure',
      label: 'Estrutura organizacional',
      icon: 'account_tree',
      route: '/org-structure',
      visible: this.auth.hasAnyPermission(['people:read', 'org:settings']),
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: 'schema',
      route: '/workflows',
      visible: this.auth.hasAnyPermission(['workflows:manage', 'lifecycle:read']),
    },
    {
      id: 'notifications',
      label: 'Notificações',
      icon: 'notifications',
      route: '/notifications',
      visible: this.auth.hasPermission('notifications:read'),
    },
    {
      id: 'audit',
      label: 'Auditoria',
      icon: 'history',
      route: '/audit',
      visible: this.auth.hasPermission('audit:read'),
    },
    {
      id: 'new-connection',
      label: 'Nova conexão',
      icon: 'add_link',
      route: '/connections/new',
      visible: this.auth.hasPermission('connections:write'),
    },
    {
      id: 'invite-member',
      label: 'Convidar membro',
      icon: 'person_add',
      route: '/organizations',
      visible: this.auth.hasPermission('members:manage'),
    },
    {
      id: 'new-person',
      label: 'Nova pessoa',
      icon: 'person_add',
      route: '/people/new',
      visible: this.auth.hasPermission('people:write'),
    },
  ];

  ngOnInit(): void {
    if (this.auth.hasPermission('connections:read')) {
      this.connectionsApi.listConnections().subscribe({
        next: (items) => {
          this.connections = items;
          this.refresh(this.query.value);
        },
        error: () => undefined,
      });
    } else {
      this.refresh('');
    }

    this.query.valueChanges
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap((q) => {
          const trimmed = q.trim();
          this.loading.set(!!trimmed && this.auth.hasPermission('people:read'));
          if (!trimmed || !this.auth.hasPermission('people:read')) {
            return of([] as Person[]);
          }
          return this.peopleApi.list({ q: trimmed }).pipe(catchError(() => of([] as Person[])));
        }),
      )
      .subscribe((people) => {
        this.loading.set(false);
        this.refresh(this.query.value, people);
      });
  }

  onKeydown(event: KeyboardEvent): void {
    const items = this.results();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[this.activeIndex()];
      if (item) this.select(item);
    } else if (event.key === 'Escape') {
      this.dialogRef.close();
    }
  }

  select(item: SearchResult): void {
    this.dialogRef.close();
    void this.router.navigateByUrl(item.route);
  }

  private refresh(rawQuery: string, people: Person[] = []): void {
    const q = rawQuery.trim().toLowerCase();
    const out: SearchResult[] = [];

    for (const action of this.actions) {
      if (!action.visible) continue;
      if (!q || action.label.toLowerCase().includes(q)) {
        out.push({
          kind: 'action',
          id: action.id,
          title: action.label,
          subtitle: 'Ação rápida',
          icon: action.icon,
          route: action.route,
        });
      }
    }

    for (const conn of this.connections) {
      const name = (conn.displayName || providerLabel(conn.provider)).toLowerCase();
      const provider = providerLabel(conn.provider).toLowerCase();
      if (!q || name.includes(q) || provider.includes(q) || conn.provider.toLowerCase().includes(q)) {
        out.push({
          kind: 'connection',
          id: conn.id,
          title: conn.displayName || providerLabel(conn.provider),
          subtitle: providerLabel(conn.provider),
          icon: 'hub',
          route: `/connections/${conn.id}`,
        });
      }
    }

    for (const person of people) {
      out.push({
        kind: 'person',
        id: person.id,
        title: person.displayName || person.email,
        subtitle: person.email,
        icon: 'person',
        route: `/people/${person.id}`,
      });
    }

    this.results.set(out.slice(0, 12));
    this.activeIndex.set(0);
  }
}
