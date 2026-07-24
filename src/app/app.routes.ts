import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'accept-invite',
    loadComponent: () =>
      import('./features/auth/accept-invite/accept-invite.component').then(
        (m) => m.AcceptInviteComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'dashboard-beta',
        loadComponent: () =>
          import('./features/dashboard-beta/dashboard-container.component').then(
            (m) => m.DashboardContainerComponent,
          ),
      },
      {
        path: 'integrations/:key',
        canActivate: [permissionGuard('connections:read')],
        loadComponent: () =>
          import(
            './features/integrations/detail/provider-detail.component'
          ).then((m) => m.ProviderDetailComponent),
      },
      {
        path: 'integrations',
        canActivate: [permissionGuard('connections:read')],
        loadComponent: () =>
          import(
            './features/integrations/catalog/integrations-catalog.component'
          ).then((m) => m.IntegrationsCatalogComponent),
      },
      {
        path: 'connections/oauth-callback',
        canActivate: [permissionGuard('connections:read')],
        loadComponent: () =>
          import(
            './features/connections/oauth-callback/oauth-callback.component'
          ).then((m) => m.OauthCallbackComponent),
      },
      {
        path: 'connections/new',
        canActivate: [permissionGuard('connections:write')],
        loadComponent: () =>
          import(
            './features/connections/create/connection-create.component'
          ).then((m) => m.ConnectionCreateComponent),
      },
      {
        path: 'connections/:id',
        canActivate: [permissionGuard('connections:read')],
        loadComponent: () =>
          import(
            './features/connections/detail/connection-detail.component'
          ).then((m) => m.ConnectionDetailComponent),
      },
      {
        path: 'connections',
        pathMatch: 'full',
        redirectTo: 'integrations',
      },
      {
        path: 'people/new',
        canActivate: [permissionGuard('people:write')],
        loadComponent: () =>
          import('./features/people/form/people-form.component').then(
            (m) => m.PeopleFormComponent,
          ),
      },
      {
        path: 'people/:id/edit',
        canActivate: [permissionGuard('people:write')],
        loadComponent: () =>
          import('./features/people/form/people-form.component').then(
            (m) => m.PeopleFormComponent,
          ),
      },
      {
        path: 'people/:id',
        canActivate: [permissionGuard('people:read')],
        loadComponent: () =>
          import('./features/people/detail/people-detail.component').then(
            (m) => m.PeopleDetailComponent,
          ),
      },
      {
        path: 'people',
        canActivate: [permissionGuard('people:read')],
        loadComponent: () =>
          import('./features/people/list/people-list.component').then(
            (m) => m.PeopleListComponent,
          ),
      },
      {
        path: 'catalog',
        canActivate: [permissionGuard('catalog:read')],
        loadComponent: () =>
          import('./features/catalog/catalog.component').then(
            (m) => m.CatalogComponent,
          ),
      },
      {
        path: 'inventory/new',
        canActivate: [permissionGuard('inventory:write')],
        loadComponent: () =>
          import('./features/inventory/inventory-detail.component').then(
            (m) => m.InventoryDetailComponent,
          ),
      },
      {
        path: 'inventory/:id',
        canActivate: [permissionGuard('inventory:read')],
        loadComponent: () =>
          import('./features/inventory/inventory-detail.component').then(
            (m) => m.InventoryDetailComponent,
          ),
      },
      {
        path: 'inventory',
        canActivate: [permissionGuard('inventory:read')],
        loadComponent: () =>
          import('./features/inventory/inventory-list.component').then(
            (m) => m.InventoryListComponent,
          ),
      },
      {
        path: 'shadow-it',
        canActivate: [permissionGuard('inventory:read')],
        loadComponent: () =>
          import('./features/shadow-it/shadow-it.component').then(
            (m) => m.ShadowItComponent,
          ),
      },
      {
        path: 'contracts/new',
        canActivate: [permissionGuard('contracts:write')],
        loadComponent: () =>
          import('./features/contracts/form/contract-form.component').then(
            (m) => m.ContractFormComponent,
          ),
      },
      {
        path: 'contracts/:id/edit',
        canActivate: [permissionGuard('contracts:write')],
        loadComponent: () =>
          import('./features/contracts/form/contract-form.component').then(
            (m) => m.ContractFormComponent,
          ),
      },
      {
        path: 'contracts/:id',
        canActivate: [permissionGuard('contracts:read')],
        loadComponent: () =>
          import('./features/contracts/detail/contract-detail.component').then(
            (m) => m.ContractDetailComponent,
          ),
      },
      {
        path: 'contracts',
        canActivate: [permissionGuard('contracts:read')],
        loadComponent: () =>
          import('./features/contracts/list/contracts-list.component').then(
            (m) => m.ContractsListComponent,
          ),
      },
      {
        path: 'spend',
        canActivate: [permissionGuard('spend:read')],
        loadComponent: () =>
          import('./features/spend/list/spend-list.component').then(
            (m) => m.SpendListComponent,
          ),
      },
      {
        path: 'org-structure',
        canActivate: [
          permissionGuard(['people:read', 'org:settings'], 'any'),
        ],
        loadComponent: () =>
          import('./features/org-structure/org-structure.component').then(
            (m) => m.OrgStructureComponent,
          ),
      },
      {
        path: 'workflows/runs/:id',
        canActivate: [permissionGuard('lifecycle:read')],
        loadComponent: () =>
          import('./features/lifecycle/lifecycle-detail.component').then(
            (m) => m.LifecycleDetailComponent,
          ),
      },
      {
        path: 'workflows',
        canActivate: [
          permissionGuard(['workflows:manage', 'lifecycle:read'], 'any'),
        ],
        loadComponent: () =>
          import('./features/workflows/workflows-list.component').then(
            (m) => m.WorkflowsListComponent,
          ),
      },
      {
        path: 'lifecycle/:id',
        redirectTo: 'workflows/runs/:id',
        pathMatch: 'full',
      },
      {
        path: 'lifecycle',
        pathMatch: 'full',
        canActivate: [
          () =>
            inject(Router).createUrlTree(['/workflows'], {
              queryParams: { tab: 'runs' },
            }),
        ],
        children: [],
      },
      {
        path: 'notifications',
        canActivate: [permissionGuard('notifications:read')],
        loadComponent: () =>
          import('./features/notifications/notifications-list.component').then(
            (m) => m.NotificationsListComponent,
          ),
      },
      {
        path: 'audit',
        canActivate: [permissionGuard('audit:read')],
        loadComponent: () =>
          import('./features/audit/audit-list.component').then(
            (m) => m.AuditListComponent,
          ),
      },
      {
        path: 'organizations',
        canActivate: [
          permissionGuard(
            [
              'members:manage',
              'roles:manage',
              'org:settings',
              'org:logo',
              'orgs:manage_children',
            ],
            'any',
          ),
        ],
        loadComponent: () =>
          import('./features/organizations/organizations.component').then(
            (m) => m.OrganizationsComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
