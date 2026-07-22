import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { statusLabel } from '../../labels/domain-labels';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="badge" [ngClass]="tone">{{ displayLabel }}</span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      border: 1px solid var(--ih-border);
      background: var(--ih-bg-tertiary);
      color: var(--ih-text-secondary);
      text-transform: none;
    }
    .success {
      color: #a7f3d0;
      border-color: #065f46;
      background: #052e1c;
    }
    .warning {
      color: #fde68a;
      border-color: #92400e;
      background: #2a1a05;
    }
    .danger {
      color: #fecdd3;
      border-color: #9f1239;
      background: #3b1219;
    }
    .info {
      color: #e07a9c;
      border-color: #a83d62;
      background: #2a1018;
    }
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: string;
  @Input() label = '';

  get displayLabel(): string {
    return this.label || statusLabel(this.status);
  }

  get tone(): string {
    const s = this.status?.toLowerCase() ?? '';
    if (['connected', 'active', 'success', 'ok'].includes(s)) return 'success';
    if (['pending', 'queued', 'running', 'invited', 'on_leave', 'vacation'].includes(s))
      return 'warning';
    if (['error', 'failed', 'suspended', 'inactive', 'disconnected'].includes(s))
      return 'danger';
    return 'info';
  }
}
