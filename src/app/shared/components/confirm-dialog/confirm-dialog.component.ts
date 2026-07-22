import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="ih-muted">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">
        {{ data.cancelLabel || 'Cancelar' }}
      </button>
      <button
        mat-flat-button
        type="button"
        [color]="data.danger === false ? 'primary' : 'warn'"
        [mat-dialog-close]="true"
      >
        {{ data.confirmLabel || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    p {
      margin: 0;
      line-height: 1.5;
    }
  `,
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ConfirmDialogComponent, boolean>);
}
