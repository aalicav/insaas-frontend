import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { OrganizationsApiService } from '../../core/api/organizations-api.service';
import { applyApiValidationErrors, extractApiErrorMessage } from '../../core/api/api-error';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { OrgMember, OrgRole, Organization, OrganizationTreeNode } from '../../core/models/organization.models';
import { RolePermissionsDialogComponent } from './role-permissions-dialog.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatIconModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './organizations.component.html',
  styleUrl: './organizations.component.scss',
})
export class OrganizationsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(OrganizationsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly inviting = signal(false);
  readonly creatingRole = signal(false);
  readonly savingRole = signal(false);
  readonly savingSettings = signal(false);
  readonly uploadingLogo = signal(false);
  readonly editingRoleId = signal<string | null>(null);
  readonly memberActionId = signal<string | null>(null);
  readonly members = signal<OrgMember[]>([]);
  readonly roles = signal<OrgRole[]>([]);
  readonly org = signal<Organization | null>(null);
  readonly tree = signal<OrganizationTreeNode[]>([]);
  readonly permissionCatalog = signal<Array<{ key: string; description?: string }>>([]);
  readonly memberColumns = ['name', 'email', 'role', 'status', 'actions'];
  readonly roleColumns = ['name', 'permissions', 'actions'];

  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    name: [''],
    roleId: ['', Validators.required],
  });

  readonly roleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    permissions: [[] as string[], Validators.required],
  });

  readonly settingsForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly childForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  canManageMembers = () => this.auth.hasPermission('members:manage');
  canManageRoles = () => this.auth.hasPermission('roles:manage');
  canSettings = () => this.auth.hasPermission('org:settings');
  canLogo = () => this.auth.hasPermission('org:logo') || this.auth.hasPermission('org:settings');
  canManageChildren = () => this.auth.hasPermission('orgs:manage_children');

  get orgId(): string | null {
    return this.auth.me()?.activeOrganization?.id ?? null;
  }

  permissionLabel(key: string): string {
    const found = this.permissionCatalog().find((p) => p.key === key);
    return found?.description || key;
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const orgId = this.orgId;
    if (!orgId) {
      this.loading.set(false);
      this.error.set('Nenhuma organização ativa');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      members: this.api.listMembers(orgId),
      roles: this.api.listRoles(orgId),
      current: this.api.current(),
    }).subscribe({
      next: ({ members, roles, current }) => {
        this.members.set(members);
        this.roles.set(roles);
        this.org.set(current);
        this.settingsForm.patchValue({ name: current.name });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar organização'));
      },
    });

    if (this.canManageChildren()) {
      this.api.list().subscribe({
        next: () => undefined,
        error: () => undefined,
      });
      this.api.tree().subscribe({
        next: (nodes) => this.tree.set(nodes),
        error: () => this.tree.set([]),
      });
    }

    this.api.listPermissions().subscribe({
      next: (perms) => this.permissionCatalog.set(perms),
      error: () => {
        if (this.canManageRoles()) {
          this.feedback.warning('Não foi possível carregar o catálogo de permissões');
        }
      },
    });
  }

  isMemberBusy(member: OrgMember): boolean {
    return this.memberActionId() === member.userId;
  }

  invite(): void {
    const orgId = this.orgId;
    if (!orgId || this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }
    this.inviting.set(true);
    this.api.inviteMember(orgId, this.inviteForm.getRawValue()).subscribe({
      next: () => {
        this.inviting.set(false);
        this.inviteForm.reset({ email: '', name: '', roleId: '' });
        this.feedback.success('Convite enviado');
        this.reload();
      },
      error: (err) => {
        this.inviting.set(false);
        if (!applyApiValidationErrors(this.inviteForm, err)) {
          this.feedback.fromError(err, 'Falha ao enviar convite');
        }
      },
    });
  }

  resend(member: OrgMember): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.memberActionId.set(member.userId);
    this.api.resendInvite(orgId, member.userId).subscribe({
      next: () => {
        this.memberActionId.set(null);
        this.feedback.success('Convite reenviado');
      },
      error: (err) => {
        this.memberActionId.set(null);
        this.feedback.fromError(err, 'Falha ao reenviar convite');
      },
    });
  }

  setStatus(member: OrgMember, status: 'active' | 'suspended'): void {
    const orgId = this.orgId;
    if (!orgId) return;

    const run = () => {
      this.memberActionId.set(member.userId);
      this.api.updateMember(orgId, member.userId, { status }).subscribe({
        next: () => {
          this.memberActionId.set(null);
          this.feedback.success(status === 'active' ? 'Membro reativado' : 'Membro suspenso');
          this.reload();
        },
        error: (err) => {
          this.memberActionId.set(null);
          this.feedback.fromError(err, 'Falha ao atualizar membro');
        },
      });
    };

    if (status === 'suspended') {
      this.confirm
        .open({
          title: 'Suspender membro',
          message: `Suspender ${member.email}? A pessoa perde o acesso até ser reativada.`,
          confirmLabel: 'Suspender',
          danger: true,
        })
        .subscribe((confirmed) => {
          if (confirmed) run();
        });
      return;
    }

    run();
  }

  remove(member: OrgMember): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.confirm
      .open({
        title: 'Remover membro',
        message: `Remover ${member.email} da organização? Esta ação não pode ser desfeita.`,
        confirmLabel: 'Remover',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.memberActionId.set(member.userId);
        this.api.removeMember(orgId, member.userId).subscribe({
          next: () => {
            this.memberActionId.set(null);
            this.feedback.success('Membro removido');
            this.reload();
          },
          error: (err) => {
            this.memberActionId.set(null);
            this.feedback.fromError(err, 'Falha ao remover membro');
          },
        });
      });
  }

  viewRolePermissions(role: OrgRole): void {
    const labels: Record<string, string> = {};
    for (const perm of this.permissionCatalog()) {
      labels[perm.key] = perm.description || perm.key;
    }
    this.dialog.open(RolePermissionsDialogComponent, {
      width: '440px',
      data: {
        roleName: role.name,
        permissions: role.permissions ?? [],
        permissionLabels: labels,
      },
    });
  }

  startEditRole(role: OrgRole): void {
    if (role.isSystem) {
      this.feedback.warning('Papéis de sistema não podem ser editados');
      return;
    }
    this.editingRoleId.set(role.id);
    this.roleForm.setValue({
      name: role.name,
      permissions: [...(role.permissions as string[])],
    });
  }

  cancelEditRole(): void {
    this.editingRoleId.set(null);
    this.roleForm.reset({ name: '', permissions: [] });
  }

  createRole(): void {
    const orgId = this.orgId;
    if (!orgId || this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }
    const editingId = this.editingRoleId();
    if (editingId) {
      this.savingRole.set(true);
      this.api.updateRole(orgId, editingId, this.roleForm.getRawValue()).subscribe({
        next: () => {
          this.savingRole.set(false);
          this.cancelEditRole();
          this.feedback.success('Papel atualizado');
          this.reload();
        },
        error: (err) => {
          this.savingRole.set(false);
          if (!applyApiValidationErrors(this.roleForm, err)) {
            this.feedback.fromError(err, 'Falha ao atualizar papel');
          }
        },
      });
      return;
    }
    this.creatingRole.set(true);
    this.api.createRole(orgId, this.roleForm.getRawValue()).subscribe({
      next: () => {
        this.creatingRole.set(false);
        this.roleForm.reset({ name: '', permissions: [] });
        this.feedback.success('Papel criado');
        this.reload();
      },
      error: (err) => {
        this.creatingRole.set(false);
        if (!applyApiValidationErrors(this.roleForm, err)) {
          this.feedback.fromError(err, 'Falha ao criar papel');
        }
      },
    });
  }

  saveSettings(): void {
    const orgId = this.orgId;
    if (!orgId || this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    this.savingSettings.set(true);
    this.api.update(orgId, this.settingsForm.getRawValue()).subscribe({
      next: (org) => {
        this.savingSettings.set(false);
        this.org.set(org);
        this.feedback.success('Organização atualizada');
        this.auth.refreshMe().subscribe();
      },
      error: (err) => {
        this.savingSettings.set(false);
        this.feedback.fromError(err, 'Falha ao salvar configurações');
      },
    });
  }

  onLogoSelected(event: Event): void {
    const orgId = this.orgId;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!orgId || !file) return;
    this.uploadingLogo.set(true);
    this.api.uploadLogo(orgId, file).subscribe({
      next: (org) => {
        this.uploadingLogo.set(false);
        this.org.set(org);
        this.feedback.success('Logo atualizado');
        this.auth.refreshMe().subscribe();
        input.value = '';
      },
      error: (err) => {
        this.uploadingLogo.set(false);
        this.feedback.fromError(err, 'Falha ao enviar logo');
        input.value = '';
      },
    });
  }

  removeLogo(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.uploadingLogo.set(true);
    this.api.deleteLogo(orgId).subscribe({
      next: (org) => {
        this.uploadingLogo.set(false);
        this.org.set(org);
        this.feedback.success('Logo removido');
        this.auth.refreshMe().subscribe();
      },
      error: (err) => {
        this.uploadingLogo.set(false);
        this.feedback.fromError(err, 'Falha ao remover logo');
      },
    });
  }

  createChildOrg(): void {
    if (this.childForm.invalid) {
      this.childForm.markAllAsTouched();
      return;
    }
    const parentId = this.orgId ?? undefined;
    this.api.create({ name: this.childForm.getRawValue().name, parentId }).subscribe({
      next: () => {
        this.childForm.reset({ name: '' });
        this.feedback.success('Organização filha criada');
        this.api.tree().subscribe({ next: (nodes) => this.tree.set(nodes) });
      },
      error: (err) => this.feedback.fromError(err, 'Falha ao criar organização'),
    });
  }
}
