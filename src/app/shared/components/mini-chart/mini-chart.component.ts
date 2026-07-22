import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartType,
  registerables,
} from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-mini-chart',
  standalone: true,
  template: `
    <div class="chart-wrap" [class.empty]="!hasData">
      <canvas #canvas role="img" [attr.aria-label]="ariaLabel"></canvas>
      @if (!hasData) {
        <p class="empty-msg">{{ emptyMessage }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        min-height: 0;
      }
      .chart-wrap {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 18rem;
      }
      .chart-wrap.empty canvas {
        opacity: 0.25;
      }
      canvas {
        display: block;
        width: 100% !important;
        height: 100% !important;
      }
      .empty-msg {
        position: absolute;
        inset: 0;
        margin: 0;
        display: grid;
        place-items: center;
        font-size: 0.8rem;
        color: var(--ih-text-tertiary);
        pointer-events: none;
        text-align: center;
        padding: 1rem;
      }
    `,
  ],
})
export class MiniChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true })
  private readonly canvas!: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) type!: ChartType;
  @Input({ required: true }) data!: ChartData;
  @Input() options: ChartConfiguration['options'];
  @Input() ariaLabel = 'Gráfico';
  @Input() emptyMessage = 'Sem dados no período';
  @Input() hasData = true;

  private chart: Chart | null = null;
  private ready = false;

  ngAfterViewInit(): void {
    this.ready = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.ready) return;
    if (changes['type'] && !changes['type'].firstChange) {
      this.destroy();
      this.render();
      return;
    }
    if (this.chart && (changes['data'] || changes['options'] || changes['hasData'])) {
      this.chart.data = this.data;
      if (this.options) this.chart.options = this.options;
      this.chart.update('none');
      return;
    }
    this.render();
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  private render(): void {
    if (!this.canvas?.nativeElement) return;
    this.destroy();
    this.chart = new Chart(this.canvas.nativeElement, {
      type: this.type,
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 450 },
        ...this.options,
      },
    });
  }

  private destroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
