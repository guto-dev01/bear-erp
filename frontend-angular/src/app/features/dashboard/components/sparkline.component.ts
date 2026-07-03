import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

let sparkUid = 0;

/**
 * Mini gráfico (sparkline) puro em SVG a partir de uma série real de números.
 * Sem dependência de biblioteca de gráficos — escala a série ao próprio viewBox.
 */
@Component({
  selector: 'bear-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg class="spark" [attr.viewBox]="'0 0 ' + w + ' ' + h" preserveAspectRatio="none"
         fill="none" aria-hidden="true" [style.color]="color">
      <defs>
        <linearGradient [attr.id]="gradId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon [attr.fill]="'url(#' + gradId + ')'" [attr.points]="areaPoints()"/>
      <polyline [attr.points]="linePoints()" stroke="currentColor" [attr.stroke-width]="strokeWidth"
                stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  styles: [`
    .spark { display: block; width: 100%; height: 100%; overflow: visible; }
  `],
})
export class SparklineComponent {
  @Input() set data(v: number[]) { this._data = Array.isArray(v) ? v : []; }
  get data(): number[] { return this._data; }
  private _data: number[] = [];

  @Input() color = 'var(--brand)';
  @Input() strokeWidth = 1.75;

  readonly w = 100;
  readonly h = 32;
  readonly gradId = `spark-grad-${sparkUid++}`;

  /** Normaliza a série ao viewBox; série constante vira uma linha central estável. */
  private coords(): { x: number; y: number }[] {
    const d = this._data;
    if (d.length === 0) return [];
    if (d.length === 1) return [{ x: 0, y: this.h / 2 }, { x: this.w, y: this.h / 2 }];
    const min = Math.min(...d);
    const max = Math.max(...d);
    const span = max - min || 1;
    const pad = 3;
    return d.map((val, i) => ({
      x: (i / (d.length - 1)) * this.w,
      y: pad + (1 - (val - min) / span) * (this.h - pad * 2),
    }));
  }

  linePoints(): string {
    return this.coords().map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  areaPoints(): string {
    const c = this.coords();
    if (!c.length) return '';
    return `${this.linePoints()} ${this.w},${this.h} 0,${this.h}`;
  }
}
