import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="error" [class.error-inline]="inline" [class.ih-card]="!inline">
      <mat-icon>{{ icon }}</mat-icon>
      <h3>{{ title }}</h3>
      @if (message) {
        <p class="ih-muted">{{ message }}</p>
      }
      <div class="actions">
        @if (showRetry) {
          <button mat-flat-button color="primary" type="button" (click)="retry.emit()">
            {{ retryLabel }}
          </button>
        }
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
      padding: 2.5rem 1.5rem;
    }
    .error-inline {
      padding: 1.25rem 1rem;
      border: 1px dashed var(--ih-border-strong);
      border-radius: var(--ih-radius-sm);
      background: color-mix(in srgb, var(--ih-danger) 6%, transparent);
    }
    mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: var(--ih-danger);
    }
    h3 {
      margin: 0;
      font-size: 1.125rem;
    }
    p {
      margin: 0;
      max-width: 28rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      margin-top: 0.5rem;
    }
  `,
})
export class ErrorStateComponent {
  @Input() title = 'Não foi possível carregar';
  @Input() message = '';
  @Input() icon = 'error_outline';
  @Input() retryLabel = 'Tentar novamente';
  @Input() showRetry = true;
  @Input() inline = false;
  @Output() retry = new EventEmitter<void>();
}
