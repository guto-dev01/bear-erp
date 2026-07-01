import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';
import { EmptyStateComponent } from './empty-state.component';
import { CashFlow, Periodo } from '../dashboard.types';

/** Fluxo de caixa do período: entradas x saídas em donut + saldo. Dados reais. */
@Component({
  selector: 'bear-cash-flow-card',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, EmptyStateComponent],
  template: `
    <section class="card cf" aria-labelledby="cf-title">
      <header class="cf__head">
        <h3 class="cf__title" id="cf-title">Fluxo de Caixa</h3>
        <label class="cf__period">
          <span class="visually-hidden">Selecionar período</span>
          <select [value]="periodo" (change)="onPeriodo($event)" aria-label="Período do fluxo de caixa">
            <option value="atual">Este mês</option>
            <option value="anterior">Mês anterior</option>
          </select>
          <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
        </label>
      </header>

      @if (loading) {
        <div class="cf__body">
          <div style="flex:1; display:flex; flex-direction:column; gap:0.75rem;">
            <bear-skeleton width="80%" height="1rem"></bear-skeleton>
            <bear-skeleton width="80%" height="1rem"></bear-skeleton>
            <bear-skeleton width="60%" height="1.4rem"></bear-skeleton>
          </div>
          <bear-skeleton width="120px" height="120px" radius="50%"></bear-skeleton>
        </div>
      } @else if (hasData()) {
        <div class="cf__body">
          <dl class="cf__stats">
            <div class="cf__stat">
              <dt><span class="cf__dot cf__dot--in"></span>Entrada</dt>
              <dd class="cf__in">{{ formatCurrency(data.entrada) }}</dd>
            </div>
            <div class="cf__stat">
              <dt><span class="cf__dot cf__dot--out"></span>Saída</dt>
              <dd class="cf__out">{{ formatCurrency(data.saida) }}</dd>
            </div>
            <div class="cf__stat cf__stat--saldo">
              <dt>Saldo</dt>
              <dd [class.cf__pos]="data.saldo >= 0" [class.cf__neg]="data.saldo < 0">{{ formatCurrency(data.saldo) }}</dd>
            </div>
          </dl>

          <div class="cf__donut" role="img" [attr.aria-label]="ariaLabel()">
            <svg viewBox="0 0 120 120">
              <circle class="cf__track" cx="60" cy="60" r="52" fill="none" stroke-width="13"/>
              <circle class="cf__arc cf__arc--out" cx="60" cy="60" r="52" fill="none" stroke-width="13"
                      [attr.stroke-dasharray]="outDash()" [attr.stroke-dashoffset]="outOffset()"
                      transform="rotate(-90 60 60)" stroke-linecap="round"/>
              <circle class="cf__arc cf__arc--in" cx="60" cy="60" r="52" fill="none" stroke-width="13"
                      [attr.stroke-dasharray]="inDash()" transform="rotate(-90 60 60)" stroke-linecap="round"/>
            </svg>
            <div class="cf__center">
              <span class="cf__pct">{{ inPct() }}%</span>
              <span class="cf__pct-label">entradas</span>
            </div>
          </div>
        </div>
      } @else {
        <bear-empty-state icon="account_balance_wallet" title="Sem movimentação de caixa"
          message="Baixas de contas a pagar e a receber no período alimentam este gráfico."></bear-empty-state>
      }
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
      padding: 1.25rem;
    }
    .cf__head {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;
    }
    .cf__title { font-size: 1rem; font-weight: 600; color: var(--text-title); }
    .cf__period { position: relative; display: inline-flex; align-items: center; }
    .cf__period select {
      appearance: none; -webkit-appearance: none;
      padding: 0.3125rem 1.75rem 0.3125rem 0.75rem;
      border-radius: var(--r-control);
      border: 1px solid var(--border-color);
      background: var(--surface-2);
      color: var(--text-primary);
      font: inherit; font-size: 0.75rem; font-weight: 500; cursor: pointer;
    }
    .cf__period select:focus-visible { outline: 2px solid var(--brand); outline-offset: 1px; }
    .cf__period .material-symbols-rounded { position: absolute; right: 0.375rem; font-size: 1rem; color: var(--text-tertiary); pointer-events: none; }

    .cf__body { flex: 1; display: flex; align-items: center; gap: 1rem; }
    .cf__stats { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.875rem; }
    .cf__stat { display: flex; flex-direction: column; gap: 0.1875rem; }
    .cf__stat dt { display: flex; align-items: center; gap: 0.4375rem; font-size: 0.75rem; color: var(--text-secondary); }
    .cf__stat dd { font-size: 1.0625rem; font-weight: 700; letter-spacing: -0.01em; }
    .cf__dot { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
    .cf__dot--in { background: var(--green); }
    .cf__dot--out { background: var(--red); }
    .cf__in { color: var(--green); }
    .cf__out { color: var(--red); }
    .cf__stat--saldo { padding-top: 0.625rem; border-top: 1px solid var(--border-subtle); }
    .cf__stat--saldo dt { font-weight: 600; color: var(--text-tertiary); }
    .cf__pos { color: var(--text-title); }
    .cf__neg { color: var(--red); }

    .cf__donut { position: relative; width: 128px; height: 128px; flex-shrink: 0; }
    .cf__donut svg { width: 100%; height: 100%; }
    .cf__track { stroke: var(--surface-3); }
    .cf__arc--in { stroke: var(--green); transition: stroke-dasharray 600ms var(--ease-ios); }
    .cf__arc--out { stroke: var(--red); transition: stroke-dasharray 600ms var(--ease-ios); }
    .cf__center {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .cf__pct { font-size: 1.375rem; font-weight: 700; color: var(--text-title); }
    .cf__pct-label { font-size: 0.6875rem; color: var(--text-tertiary); }

    @media (max-width: 380px) {
      .cf__body { flex-direction: column-reverse; }
      .cf__stats { width: 100%; }
    }
  `],
})
export class CashFlowCardComponent {
  @Input() data!: CashFlow;
  @Input() loading = false;
  @Input() periodo: Periodo = 'atual';
  @Output() periodoChange = new EventEmitter<Periodo>();

  private readonly C = 2 * Math.PI * 52; // circunferência

  private total(): number {
    return (this.data?.entrada ?? 0) + (this.data?.saida ?? 0);
  }

  hasData(): boolean {
    return this.total() > 0;
  }

  private inFraction(): number {
    const t = this.total();
    return t > 0 ? (this.data.entrada ?? 0) / t : 0;
  }

  inPct(): number {
    return Math.round(this.inFraction() * 100);
  }

  inDash(): string {
    const len = this.inFraction() * this.C;
    return `${len.toFixed(2)} ${(this.C - len).toFixed(2)}`;
  }

  outDash(): string {
    const len = (1 - this.inFraction()) * this.C;
    return `${len.toFixed(2)} ${(this.C - len).toFixed(2)}`;
  }

  outOffset(): number {
    // Saída começa onde a entrada termina (offset negativo desloca no sentido do arco).
    return -this.inFraction() * this.C;
  }

  onPeriodo(ev: Event): void {
    this.periodoChange.emit((ev.target as HTMLSelectElement).value as Periodo);
  }

  ariaLabel(): string {
    return `Entradas ${this.formatCurrency(this.data.entrada)}, saídas ${this.formatCurrency(this.data.saida)}, saldo ${this.formatCurrency(this.data.saldo)}.`;
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  }
}
