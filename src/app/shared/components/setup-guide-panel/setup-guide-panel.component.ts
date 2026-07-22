import { Component, Input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { SetupGuide } from '../../../core/models/connection.models';

@Component({
  selector: 'app-setup-guide-panel',
  standalone: true,
  imports: [MatExpansionModule],
  template: `
    @if (guide; as g) {
      <mat-expansion-panel class="guide-panel" [expanded]="expanded">
        <mat-expansion-panel-header>
          <mat-panel-title>{{ title }}</mat-panel-title>
          @if (g.summary) {
            <mat-panel-description>{{ g.summary }}</mat-panel-description>
          }
        </mat-expansion-panel-header>

        <p class="summary">{{ g.summary }}</p>

        @if (g.prerequisites?.length) {
          <div class="block">
            <div class="ih-label">Pré-requisitos</div>
            <ul>
              @for (item of g.prerequisites; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </div>
        }

        <ol class="steps">
          @for (step of g.steps; track step.title; let i = $index) {
            <li>
              <strong>{{ i + 1 }}. {{ step.title }}</strong>
              <p>{{ step.body }}</p>
              @if (step.link) {
                <a [href]="step.link.url" target="_blank" rel="noopener noreferrer">
                  {{ step.link.label }}
                </a>
              }
            </li>
          }
        </ol>

        @if (g.docsUrl) {
          <p class="docs">
            <a [href]="g.docsUrl" target="_blank" rel="noopener noreferrer">
              Documentação oficial
            </a>
          </p>
        }
      </mat-expansion-panel>
    }
  `,
  styles: `
    .guide-panel {
      background: var(--ih-bg-secondary);
      border: 1px solid var(--ih-border);
      border-radius: var(--ih-radius);
      box-shadow: none;
    }

    .summary {
      margin: 0 0 0.85rem;
      color: var(--ih-muted, inherit);
      line-height: 1.45;
    }

    .block {
      margin-bottom: 0.85rem;
    }

    ul,
    .steps {
      margin: 0.35rem 0 0;
      padding-left: 1.15rem;
      line-height: 1.45;
    }

    .steps {
      list-style: none;
      padding-left: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .steps p {
      margin: 0.25rem 0 0;
      color: var(--ih-muted, inherit);
    }

    .steps a,
    .docs a {
      font-size: 0.9rem;
    }

    .docs {
      margin: 1rem 0 0;
    }

    mat-panel-description {
      max-width: 55%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class SetupGuidePanelComponent {
  @Input() guide: SetupGuide | null | undefined;
  @Input() title = 'Como configurar';
  @Input() expanded = false;
}
