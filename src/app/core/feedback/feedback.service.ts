import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { extractApiErrorMessage } from '../api/api-error';

export type FeedbackTone = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly snack = inject(MatSnackBar);

  show(message: string, tone: FeedbackTone = 'info', action = 'OK', duration = 3500): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: `ih-snack-${tone}`,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    };
    this.snack.open(message, action, config);
  }

  success(message: string, action = 'OK'): void {
    this.show(message, 'success', action, 2800);
  }

  error(message: string, action = 'Fechar'): void {
    this.show(message, 'error', action, 5000);
  }

  warning(message: string, action = 'OK'): void {
    this.show(message, 'warning', action, 4000);
  }

  info(message: string, action = 'OK'): void {
    this.show(message, 'info', action, 3500);
  }

  fromError(error: unknown, fallback = 'Ocorreu um erro'): void {
    this.error(extractApiErrorMessage(error, fallback));
  }
}
