import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface RolePermissionsDialogData {
  roleName: string;
  permissions: string[];
  permissionLabels: Record<string, string>;
}

@Component({
  selector: 'app-role-permissions-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.roleName }}</h2>
    <mat-dialog-content>
      @if (!data.permissions.length) {
        <p class="ih-muted">Este papel não tem permissões listadas.</p>
      } @else {
        <ul class="perm-list">
          @for (perm of data.permissions; track perm) {
            <li>
              <strong>{{ data.permissionLabels[perm] || perm }}</strong>
              @if (data.permissionLabels[perm] && data.permissionLabels[perm] !== perm) {
                <span class="ih-muted key">{{ perm }}</span>
              }
            </li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .perm-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    li {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--ih-border);
      border-radius: var(--ih-radius-sm);
      background: var(--ih-bg-tertiary);
    }
    .key {
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  `,
})
export class RolePermissionsDialogComponent {
  readonly data = inject<RolePermissionsDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<RolePermissionsDialogComponent>);
}
