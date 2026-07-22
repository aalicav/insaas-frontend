import { Component, HostListener, computed, inject, signal, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionKey } from '../../core/models/auth.models';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { environment } from '../../../environments/environment';
import { CommandPaletteComponent } from '../command-palette/command-palette.component';
import { NotificationsBellComponent } from '../notifications-bell/notifications-bell.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  permissions?: PermissionKey[];
  any?: boolean;
  exact?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    NotificationsBellComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  @ViewChild('drawer') drawer?: MatSidenav;

  readonly auth = inject(AuthService);
  private readonly feedback = inject(FeedbackService);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly appName = environment.appName;
  readonly me = this.auth.me;
  readonly switching = signal(false);
  readonly sidenavCollapsed = signal(false);

  readonly isHandset = toSignal(
    this.breakpoints
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  /** Explicit px width so MatSidenav recalculates content margins when collapsing. */
  readonly sidenavWidthPx = computed(() => {
    if (this.isHandset()) return undefined;
    return this.sidenavCollapsed() ? 72 : 248;
  });

  private readonly allNav: NavItem[] = [
    { label: 'Painel', route: '/dashboard', icon: 'dashboard', exact: true },
    {
      label: 'Integrações',
      route: '/integrations',
      icon: 'hub',
      permissions: ['connections:read'],
    },
    {
      label: 'Catálogo',
      route: '/catalog',
      icon: 'inventory_2',
      permissions: ['catalog:read'],
    },
    {
      label: 'Inventário',
      route: '/inventory',
      icon: 'apps',
      permissions: ['inventory:read'],
    },
    {
      label: 'Contratos',
      route: '/contracts',
      icon: 'description',
      permissions: ['contracts:read'],
    },
    {
      label: 'Gastos',
      route: '/spend',
      icon: 'payments',
      permissions: ['spend:read'],
    },
    {
      label: 'Pessoas',
      route: '/people',
      icon: 'group',
      permissions: ['people:read'],
    },
    {
      label: 'Estrutura',
      route: '/org-structure',
      icon: 'account_tree',
      permissions: ['people:read', 'org:settings'],
      any: true,
    },
    {
      label: 'Workflows',
      route: '/workflows',
      icon: 'schema',
      permissions: ['workflows:manage', 'lifecycle:read'],
      any: true,
    },
    {
      label: 'Notificações',
      route: '/notifications',
      icon: 'notifications',
      permissions: ['notifications:read'],
    },
    {
      label: 'Auditoria',
      route: '/audit',
      icon: 'history',
      permissions: ['audit:read'],
    },
    {
      label: 'Organização',
      route: '/organizations',
      icon: 'apartment',
      permissions: ['members:manage', 'roles:manage', 'org:settings', 'org:logo', 'orgs:manage_children'],
      any: true,
    },
  ];

  readonly navItems = computed(() =>
    this.allNav.filter((item) => {
      if (!item.permissions?.length) return true;
      return item.any
        ? this.auth.hasAnyPermission(item.permissions)
        : this.auth.hasPermission(item.permissions);
    }),
  );

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const typing =
      tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openCommandPalette();
      return;
    }

    if (!typing && event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.openCommandPalette();
    }
  }

  openCommandPalette(): void {
    if (this.dialog.openDialogs.some((d) => d.componentInstance instanceof CommandPaletteComponent)) {
      return;
    }
    this.dialog.open(CommandPaletteComponent, {
      panelClass: 'command-palette-panel',
      backdropClass: 'command-palette-backdrop',
      autoFocus: 'input',
      width: 'auto',
      maxWidth: '92vw',
    });
  }

  openQuickAction(): void {
    this.openCommandPalette();
  }

  closeIfHandset(): void {
    if (this.isHandset() && this.drawer?.opened) {
      void this.drawer.close();
    }
  }

  toggleCollapse(): void {
    this.sidenavCollapsed.update((v) => !v);
  }

  switchOrg(organizationId: string): void {
    if (!organizationId || organizationId === this.me()?.activeOrganization?.id) {
      return;
    }
    this.switching.set(true);
    this.auth.switchOrganization(organizationId).subscribe({
      next: () => {
        const url = this.router.url;
        void this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          void this.router.navigateByUrl(url).then(() => {
            this.switching.set(false);
            this.feedback.success('Organização alterada');
          });
        });
      },
      error: (err) => {
        this.switching.set(false);
        this.feedback.fromError(err);
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
