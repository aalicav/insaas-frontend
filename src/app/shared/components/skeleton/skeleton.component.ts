import { Component, Input } from '@angular/core';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [NgStyle],
  template: `
    <div
      class="skeleton"
      [class.skeleton-circle]="variant === 'circle'"
      [class.skeleton-text]="variant === 'text'"
      [ngStyle]="styles"
      aria-hidden="true"
    ></div>
  `,
  styles: `
    .skeleton {
      display: block;
      background: linear-gradient(
        90deg,
        var(--ih-bg-tertiary) 0%,
        var(--ih-bg-elevated) 50%,
        var(--ih-bg-tertiary) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: var(--ih-radius-sm);
    }
    .skeleton-circle {
      border-radius: 999px;
    }
    .skeleton-text {
      border-radius: var(--ih-radius-sm);
      height: 0.9rem;
    }
    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton {
        animation: none;
        background: var(--ih-bg-elevated);
      }
    }
  `,
})
export class SkeletonComponent {
  @Input() variant: 'rect' | 'text' | 'circle' = 'rect';
  @Input() width: string | number = '100%';
  @Input() height: string | number = '1rem';

  get styles(): Record<string, string> {
    return {
      width: typeof this.width === 'number' ? `${this.width}px` : this.width,
      height: typeof this.height === 'number' ? `${this.height}px` : this.height,
    };
  }
}
