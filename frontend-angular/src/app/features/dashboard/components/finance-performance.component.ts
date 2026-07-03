import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';
import { EmptyStateComponent } from './empty-state.component';
import { FinanceSummary, Periodo, Trend } from '../dashboard.types';

/**
 * Painel "Desempenho Financeiro": três cartões (receita/despesa/lucro) + gráfico
 * de área com séries diárias reais. Tooltip e guia de foco interativos.
 */
@Component({
  selector: 'bear-finance-performance',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, EmptyStateComponent],
  template: `
    <section class="card fp" aria-labelledby="fp-title">
      <header class="fp__head">
        <div>
          <h3 class="fp__title" id="fp-title">Desempenho Financeiro</h3>
          <p class="fp__subtitle">Receitas e despesas acumuladas no período</p>
        </div>
        <label class="fp__period">
          <span class="visually-hidden">Selecionar período</span>
          <select [value]="periodo" (change)="onPeriodo($event)" aria-label="Período">
            <option value="atual">Este mês</option>
            <option value="anterior">Mês anterior</option>
          </select>
          <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
        </label>
      </header>

      <div class="fp__mini">
        @for (m of miniCards(); track m.key) {
          <div class="mini" [class]="'mini mini--' + m.key">
            <div class="mini__top">
              <span class="mini__icon"><span class="material-symbols-rounded">{{ m.icon }}</span></span>
              @if (m.trend) {
                <span class="mini__trend" [class.mini__trend--up]="m.trend.up" [class.mini__trend--down]="!m.trend.up">
                  <span class="material-symbols-rounded">{{ m.trend.up ? 'arrow_upward' : 'arrow_downward' }}</span>
                  {{ m.trend.value }}
                </span>
              }
            </div>
            <span class="mini__label">{{ m.label }}</span>
            @if (loading) {
              <bear-skeleton width="60%" height="1.4rem"></bear-skeleton>
            } @else {
              <span class="mini__value">{{ formatCurrency(m.value) }}</span>
            }
          </div>
        }
      </div>

      <div class="fp__chart">
        @if (loading) {
          <bear-skeleton width="100%" height="200px" radius="12px"></bear-skeleton>
        } @else if (hasData()) {
          <div class="chart__legend">
            <span class="chart__legend-item"><i style="background:var(--green)"></i>Receita</span>
            <span class="chart__legend-item"><i style="background:var(--red)"></i>Despesa</span>
          </div>
          <div class="chart__area">
            <div class="chart__yaxis" aria-hidden="true">
              @for (t of yTicks(); track t) { <span>{{ compact(t) }}</span> }
            </div>
            <div class="chart__plot"
                 (pointermove)="onHover($event)" (pointerleave)="hoverIndex.set(-1)">
              <svg class="chart__svg" viewBox="0 0 600 200" preserveAspectRatio="none"
                   role="img" [attr.aria-label]="ariaLabel()">
                <defs>
                  <linearGradient id="fpRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--green)" stop-opacity="0.24"/>
                    <stop offset="100%" stop-color="var(--green)" stop-opacity="0"/>
                  </linearGradient>
                  <linearGradient id="fpDes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--red)" stop-opacity="0.16"/>
                    <stop offset="100%" stop-color="var(--red)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                @for (gy of gridLines(); track gy) {
                  <line class="chart__grid" x1="0" [attr.y1]="gy" x2="600" [attr.y2]="gy" vector-effect="non-scaling-stroke"/>
                }
                <polygon fill="url(#fpDes)" [attr.points]="area(summary.serieDespesa)"/>
                <polygon fill="url(#fpRec)" [attr.points]="area(summary.serieReceita)"/>
                <polyline class="chart__line chart__line--des" [attr.points]="line(summary.serieDespesa)" vector-effect="non-scaling-stroke"/>
                <polyline class="chart__line chart__line--rec" [attr.points]="line(summary.serieReceita)" vector-effect="non-scaling-stroke"/>
                @if (hoverIndex() >= 0) {
                  <line class="chart__guide" [attr.x1]="xAt(hoverIndex())" y1="6" [attr.x2]="xAt(hoverIndex())" y2="200" vector-effect="non-scaling-stroke"/>
                  <circle class="chart__dot chart__dot--rec" [attr.cx]="xAt(hoverIndex())" [attr.cy]="yAt(summary.serieReceita[hoverIndex()])" r="3" vector-effect="non-scaling-stroke"/>
                  <circle class="chart__dot chart__dot--des" [attr.cx]="xAt(hoverIndex())" [attr.cy]="yAt(summary.serieDespesa[hoverIndex()])" r="3" vector-effect="non-scaling-stroke"/>
                }
              </svg>
              @if (hoverIndex() >= 0) {
                <div class="chart__tip" [style.left.%]="tipLeft()">
                  <span class="chart__tip-date">{{ summary.labels[hoverIndex()] }}</span>
                  <span class="chart__tip-row"><i style="background:var(--green)"></i>Receita <b>{{ formatCurrency(summary.serieReceita[hoverIndex()]) }}</b></span>
                  <span class="chart__tip-row"><i style="background:var(--red)"></i>Despesa <b>{{ formatCurrency(summary.serieDespesa[hoverIndex()]) }}</b></span>
                </div>
              }
            </div>
          </div>
          <div class="chart__xaxis" aria-hidden="true">
            @for (l of xLabels(); track l.i) { <span [style.left.%]="l.pos">{{ l.text }}</span> }
          </div>
        } @else {
          <bear-empty-state icon="show_chart" title="Sem movimentação no período"
            message="Lançamentos de contas a pagar e a receber aparecerão aqui."></bear-empty-state>
        }
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .visually-hidden {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
    .card {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--surface-card);
      border: 1px solid var(--border-color);
      border-radius: var(--r-card);
      box-shadow: var(--shadow-xs);
      padding: 1.25rem 1.375rem;
    }
    .fp__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .fp__title { font-size: 1.0625rem; font-weight: 600; color: var(--text-title); }
    .fp__subtitle { font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.125rem; }

    .fp__period {
      position: relative;
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    .fp__period select {
      appearance: none;
      -webkit-appearance: none;
      padding: 0.375rem 1.875rem 0.375rem 0.875rem;
      border-radius: var(--r-control);
      border: 1px solid var(--border-color);
      background: var(--surface-2);
      color: var(--text-primary);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: border-color var(--transition-fast);
    }
    .fp__period select:hover { border-color: var(--border-strong); }
    .fp__period select:focus-visible { outline: 2px solid var(--brand); outline-offset: 1px; }
    .fp__period .material-symbols-rounded {
      position: absolute;
      right: 0.5rem;
      font-size: 1.125rem;
      color: var(--text-tertiary);
      pointer-events: none;
    }

    .fp__mini {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .mini {
      --c: var(--brand);
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.875rem 1rem;
      border-radius: var(--r-control);
      background: var(--surface-2);
      border: 1px solid var(--border-subtle);
    }
    .mini--receita { --c: var(--green); }
    .mini--despesa { --c: var(--red); }
    .mini--lucro   { --c: var(--brand); }
    .mini__top { display: flex; align-items: center; justify-content: space-between; }
    .mini__icon {
      width: 30px; height: 30px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--c) 15%, transparent);
      color: var(--c);
    }
    .mini__icon .material-symbols-rounded { font-size: 1.0625rem; }
    .mini__trend {
      display: inline-flex; align-items: center; gap: 0.125rem;
      font-size: 0.6875rem; font-weight: 600; padding: 0.0625rem 0.375rem; border-radius: var(--r-pill);
    }
    .mini__trend .material-symbols-rounded { font-size: 0.8125rem; }
    .mini__trend--up { color: var(--green); background: var(--color-success-light); }
    .mini__trend--down { color: var(--red); background: var(--color-error-light); }
    .mini__label { font-size: 0.75rem; color: var(--text-secondary); }
    .mini__value { font-size: 1.3125rem; font-weight: 700; color: var(--text-title); letter-spacing: -0.02em; }

    .fp__chart { flex: 1; display: flex; flex-direction: column; min-height: 232px; justify-content: center; }
    .chart__legend { display: flex; gap: 1rem; margin-bottom: 0.5rem; }
    .chart__legend-item { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; color: var(--text-secondary); }
    .chart__legend-item i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }

    .chart__area { display: flex; gap: 0.5rem; height: 200px; }
    .chart__yaxis {
      display: flex; flex-direction: column; justify-content: space-between;
      font-size: 0.625rem; color: var(--text-tertiary); text-align: right;
      width: 48px; flex-shrink: 0; padding: 2px 0 2px;
    }
    .chart__plot { position: relative; flex: 1; min-width: 0; }
    .chart__svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .chart__grid { stroke: var(--border-subtle); stroke-width: 1; }
    .chart__line { fill: none; stroke-width: 2; }
    .chart__line--rec { stroke: var(--green); }
    .chart__line--des { stroke: var(--red); }
    .chart__guide { stroke: var(--text-tertiary); stroke-width: 1; stroke-dasharray: 3 3; }
    .chart__dot--rec { fill: var(--green); stroke: var(--surface-card); stroke-width: 2; }
    .chart__dot--des { fill: var(--red); stroke: var(--surface-card); stroke-width: 2; }

    .chart__tip {
      position: absolute; top: 0; transform: translateX(-50%);
      pointer-events: none; z-index: 2;
      background: var(--surface-raised);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      box-shadow: var(--shadow-lg);
      padding: 0.5rem 0.625rem;
      display: flex; flex-direction: column; gap: 0.1875rem;
      min-width: 148px;
    }
    .chart__tip-date { font-size: 0.6875rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.125rem; }
    .chart__tip-row { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; color: var(--text-secondary); }
    .chart__tip-row i { width: 8px; height: 8px; border-radius: 2px; }
    .chart__tip-row b { margin-left: auto; color: var(--text-primary); font-weight: 600; }

    .chart__xaxis { position: relative; height: 16px; margin-left: 56px; margin-top: 0.375rem; }
    .chart__xaxis span { position: absolute; transform: translateX(-50%); font-size: 0.625rem; color: var(--text-tertiary); white-space: nowrap; }

    @media (max-width: 560px) {
      .fp__mini { grid-template-columns: 1fr; }
      .chart__yaxis { width: 40px; }
      .chart__xaxis { margin-left: 48px; }
    }
  `],
})
export class FinancePerformanceComponent {
  @Input() summary!: FinanceSummary;
  @Input() loading = false;
  @Input() periodo: Periodo = 'atual';
  @Output() periodoChange = new EventEmitter<Periodo>();

  hoverIndex = signal(-1);

  private readonly W = 600;
  private readonly H = 200;
  private readonly padTop = 8;
  private readonly padBottom = 6;

  miniCards(): { key: string; label: string; icon: string; value: number; trend: Trend }[] {
    const s = this.summary;
    return [
      { key: 'receita', label: 'Receita Bruta', icon: 'trending_up', value: s?.receita ?? 0, trend: s?.receitaTrend ?? null },
      { key: 'despesa', label: 'Despesas', icon: 'trending_down', value: s?.despesa ?? 0, trend: s?.despesaTrend ?? null },
      { key: 'lucro', label: 'Lucro Líquido', icon: 'account_balance_wallet', value: s?.lucro ?? 0, trend: s?.lucroTrend ?? null },
    ];
  }

  private max(): number {
    const s = this.summary;
    if (!s) return 0;
    return Math.max(0, ...s.serieReceita, ...s.serieDespesa);
  }

  hasData(): boolean {
    return this.max() > 0;
  }

  private n(): number {
    return this.summary?.serieReceita.length ?? 0;
  }

  xAt(i: number): number {
    const n = this.n();
    return n <= 1 ? 0 : (i / (n - 1)) * this.W;
  }

  yAt(v: number): number {
    const max = this.max() || 1;
    return this.padTop + (1 - v / max) * (this.H - this.padTop - this.padBottom);
  }

  line(serie: number[]): string {
    return (serie || []).map((v, i) => `${this.xAt(i).toFixed(1)},${this.yAt(v).toFixed(1)}`).join(' ');
  }

  area(serie: number[]): string {
    if (!serie?.length) return '';
    return `${this.line(serie)} ${this.W},${this.H} 0,${this.H}`;
  }

  gridLines(): number[] {
    const top = this.padTop;
    const bottom = this.H - this.padBottom;
    return [0, 0.25, 0.5, 0.75, 1].map(f => +(top + f * (bottom - top)).toFixed(1));
  }

  yTicks(): number[] {
    const max = this.max();
    return [1, 0.75, 0.5, 0.25, 0].map(f => max * f);
  }

  xLabels(): { i: number; pos: number; text: string }[] {
    const s = this.summary;
    const n = this.n();
    if (!s || n === 0) return [];
    const count = Math.min(5, n);
    const out: { i: number; pos: number; text: string }[] = [];
    for (let k = 0; k < count; k++) {
      const i = count === 1 ? 0 : Math.round((k / (count - 1)) * (n - 1));
      out.push({ i, pos: n <= 1 ? 0 : (i / (n - 1)) * 100, text: s.labels[i] ?? '' });
    }
    return out;
  }

  onHover(ev: PointerEvent): void {
    const el = ev.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
    const n = this.n();
    this.hoverIndex.set(n <= 1 ? 0 : Math.round(ratio * (n - 1)));
  }

  tipLeft(): number {
    const n = this.n();
    const i = this.hoverIndex();
    return n <= 1 ? 50 : (i / (n - 1)) * 100;
  }

  onPeriodo(ev: Event): void {
    this.periodoChange.emit((ev.target as HTMLSelectElement).value as Periodo);
  }

  ariaLabel(): string {
    const s = this.summary;
    if (!s) return 'Gráfico de desempenho financeiro';
    return `Receita acumulada ${this.formatCurrency(s.receita)}, despesa acumulada ${this.formatCurrency(s.despesa)}.`;
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  }

  compact(v: number): string {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`;
    return `R$ ${Math.round(v)}`;
  }
}
