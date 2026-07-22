import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="empty" [class.empty-inline]="inline" [class.ih-card]="!inline">
      <mat-icon>{{ icon }}</mat-icon>
      <h3>{{ title }}</h3>
      @if (description) {
        <p class="ih-muted">{{ description }}</p>
      }
      <div class="actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
      padding: 2.5rem 1.5rem;
    }
    .empty-inline {
      padding: 1.5rem 1rem;
      border: 1px dashed var(--ih-border);
      border-radius: var(--ih-radius-sm);
      background: var(--ih-bg-tertiary);
    }
    mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: var(--ih-primary);
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
export class EmptyStateComponent {
  @Input() title = 'Nada por aqui';
  @Input() description = '';
  @Input() icon = 'inbox';
  @Input() inline = false;
}
