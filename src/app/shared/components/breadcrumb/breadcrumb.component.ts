import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string | string[];
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      @for (item of items; track $index; let last = $last) {
        @if (!last && item.link) {
          <a [routerLink]="item.link">{{ item.label }}</a>
          <span aria-hidden="true">/</span>
        } @else {
          <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
          @if (!last) {
            <span aria-hidden="true">/</span>
          }
        }
      }
    </nav>
  `,
  styles: `
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--ih-text-sm);
      color: var(--ih-text-tertiary);
    }
    .breadcrumb a {
      color: var(--ih-text-secondary);
      text-decoration: none;
    }
    .breadcrumb a:hover {
      color: var(--ih-primary-light);
      text-decoration: underline;
    }
  `,
})
export class BreadcrumbComponent {
  @Input({ required: true }) items: BreadcrumbItem[] = [];
}
