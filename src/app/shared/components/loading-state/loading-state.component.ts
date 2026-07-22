import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loading" [class.loading-inline]="inline" [attr.aria-label]="label">
      <mat-spinner [diameter]="diameter"></mat-spinner>
      @if (label) {
        <p class="ih-muted">{{ label }}</p>
      }
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2.5rem 1rem;
      min-height: 12rem;
    }
    .loading-inline {
      min-height: auto;
      padding: 1rem;
      flex-direction: row;
    }
    p {
      margin: 0;
    }
  `,
})
export class LoadingStateComponent {
  @Input() label = 'Carregando…';
  @Input() diameter = 40;
  @Input() inline = false;
}
