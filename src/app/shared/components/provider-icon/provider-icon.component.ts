import { Component, Input, OnChanges } from '@angular/core';
import { providerIconUrl, providerVisual, ProviderVisual } from '../../labels/domain-labels';

@Component({
  selector: 'app-provider-icon',
  standalone: true,
  template: `
    @if (!useFallback && iconUrl) {
      <img
        class="provider-icon-img"
        [src]="iconUrl"
        [alt]="''"
        aria-hidden="true"
        (error)="onError()"
      />
    } @else {
      <span
        class="provider-icon-fallback"
        aria-hidden="true"
        [style.color]="visual.color"
        [style.background]="visual.bg"
      >
        {{ visual.initial }}
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      width: var(--provider-icon-size, 2rem);
      height: var(--provider-icon-size, 2rem);
      flex-shrink: 0;
      border-radius: inherit;
      overflow: hidden;
    }
    .provider-icon-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      padding: 12%;
      box-sizing: border-box;
      background: color-mix(in srgb, var(--ih-bg-secondary, #fff) 92%, transparent);
      border-radius: inherit;
    }
    .provider-icon-fallback {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: calc(var(--provider-icon-size, 2rem) * 0.42);
      border-radius: inherit;
    }
  `,
  host: {
    '[style.--provider-icon-size]': 'size',
    '[attr.title]': 'null',
  },
})
export class ProviderIconComponent implements OnChanges {
  @Input({ required: true }) provider!: string;
  @Input() size = '2rem';

  iconUrl: string | null = null;
  useFallback = false;
  visual: ProviderVisual = providerVisual(null);

  ngOnChanges(): void {
    this.visual = providerVisual(this.provider);
    this.iconUrl = providerIconUrl(this.provider) ?? this.visual.iconUrl ?? null;
    this.useFallback = !this.iconUrl;
  }

  onError(): void {
    this.useFallback = true;
  }
}
