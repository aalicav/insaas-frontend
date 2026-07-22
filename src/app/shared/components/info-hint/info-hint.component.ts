import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Ícone "i" com tooltip ao hover — para termos de domínio pouco óbvios.
 *
 * Uso: <app-info-hint text="Explicação curta." />
 * Opcional: label="Rótulo" para leitores de tela.
 */
@Component({
  selector: 'app-info-hint',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    <button
      type="button"
      class="hint"
      [matTooltip]="text"
      matTooltipShowDelay="200"
      matTooltipHideDelay="100"
      matTooltipClass="ih-info-tooltip"
      [attr.aria-label]="label || 'Mais informações'"
    >
      <mat-icon>info</mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
      margin-inline-start: 0.2rem;
    }
    .hint {
      display: inline-grid;
      place-items: center;
      width: 1.25rem;
      height: 1.25rem;
      padding: 0;
      border: none;
      border-radius: 999px;
      background: transparent;
      color: var(--ih-text-muted, #8a7a7e);
      cursor: help;
      line-height: 0;
    }
    .hint:hover,
    .hint:focus-visible {
      color: var(--ih-burgundy, #6b2030);
      outline: none;
      background: color-mix(in srgb, var(--ih-burgundy, #6b2030) 10%, transparent);
    }
    mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
  `,
})
export class InfoHintComponent {
  @Input({ required: true }) text!: string;
  @Input() label = '';
}
