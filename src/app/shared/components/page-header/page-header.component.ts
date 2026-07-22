import { Component, Input } from '@angular/core';
import { InfoHintComponent } from '../info-hint/info-hint.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [InfoHintComponent],
  template: `
    <header class="header">
      <div>
        @if (eyebrow) {
          <div class="ih-label">{{ eyebrow }}</div>
        }
        <h1 class="ih-display">
          {{ title }}
          @if (hint) {
            <app-info-hint [text]="hint" [label]="'Sobre: ' + title" />
          }
        </h1>
        @if (subtitle) {
          <p class="ih-muted">{{ subtitle }}</p>
        }
      </div>
      <div class="ih-toolbar-actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }
    h1 {
      margin: 0.2rem 0 0;
      font-size: clamp(1.75rem, 2.4vw, 2.35rem);
      font-weight: 400;
      letter-spacing: -0.025em;
      line-height: 1.12;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    p {
      margin: 0.45rem 0 0;
      max-width: 42rem;
      font-size: var(--ih-text-sm);
      line-height: 1.5;
    }
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
  @Input() eyebrow = '';
  /** Tooltip curto ao lado do título (ícone i). */
  @Input() hint = '';
}
