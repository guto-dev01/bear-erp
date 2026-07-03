import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from './skeleton.component';
import { EmptyStateComponent } from './empty-state.component';
import { TopCompany } from '../dashboard.types';

/** Ranking real de empresas por faturamento (contas a receber agregadas). */
@Component({
  selector: 'bear-top-companies-card',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent, EmptyStateComponent],
  template: `
    <section class="card tc" aria-labelledby="tc-title">
      <header class="tc__head">
        <h3 class="tc__title" id="tc-title">Top Empresas</h3>
        <a class="tc__link" routerLink="/empresas">Ver todas</a>
      </header>

      @if (loading) {
        <div class="tc__list">
          @for (i of [1,2,3,4]; track i) {
            <div class="tc__row tc__row--sk">
              <bear-skeleton width="60%" height="0.8rem"></bear-skeleton>
              <bear-skeleton width="100%" height="6px" radius="3px"></bear-skeleton>
            </div>
          }
        </div>
      } @else if (companies.length) {
        <ol class="tc__list">
          @for (c of companies; track c.nome; let i = $index) {
            <li class="tc__row">
              <div class="tc__meta">
                <span class="tc__rank" [class]="'tc__rank tc__rank--' + (i + 1)">{{ i + 1 }}</span>
                <span class="tc__name" [title]="c.nome">{{ c.nome }}</span>
                <span class="tc__value">{{ formatCurrency(c.valor) }}</span>
              </div>
              <div class="tc__bar">
                <span class="tc__bar-fill" [class]="'tc__bar-fill tc__bar-fill--' + (i + 1)" [style.width.%]="c.pct"></span>
              </div>
            </li>
          }
        </ol>
      } @else {
        <bear-empty-state icon="apartment" title="Sem faturamento registrado"
          message="Empresas com contas a receber aparecerão no ranking."></bear-empty-state>
      }
    </section>
  `,
  styles: [`
    :host { display: block; height: 100%; }
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
    .tc__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .tc__title { font-size: 1rem; font-weight: 600; color: var(--text-title); }
    .tc__link { font-size: 0.75rem; font-weight: 500; color: var(--brand); text-decoration: none; }
    .tc__link:hover { text-decoration: underline; }

    .tc__list { display: flex; flex-direction: column; gap: 0.875rem; list-style: none; margin: 0; padding: 0; }
    .tc__row { display: flex; flex-direction: column; gap: 0.4375rem; }
    .tc__row--sk { gap: 0.5rem; }
    .tc__meta { display: flex; align-items: center; gap: 0.5rem; }
    .tc__rank {
      width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.6875rem; font-weight: 700;
      background: var(--surface-3); color: var(--text-secondary);
    }
    .tc__rank--1 { background: var(--brand-primary-light); color: var(--brand); }
    .tc__rank--2 { background: rgba(139, 92, 246, 0.16); color: var(--purple); }
    .tc__rank--3 { background: var(--color-success-light); color: var(--green); }
    .tc__name {
      flex: 1; min-width: 0; font-size: 0.8125rem; font-weight: 500; color: var(--text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tc__value { font-size: 0.8125rem; font-weight: 700; color: var(--text-title); flex-shrink: 0; }
    .tc__bar { height: 6px; border-radius: 3px; background: var(--surface-3); overflow: hidden; }
    .tc__bar-fill {
      display: block; height: 100%; border-radius: 3px; min-width: 4px;
      background: var(--brand);
      transition: width 600ms var(--ease-ios);
    }
    .tc__bar-fill--1 { background: var(--brand); }
    .tc__bar-fill--2 { background: var(--purple); }
    .tc__bar-fill--3 { background: var(--green); }
    .tc__bar-fill--4 { background: var(--teal); }
    .tc__bar-fill--5 { background: var(--orange); }
  `],
})
export class TopCompaniesCardComponent {
  @Input() companies: TopCompany[] = [];
  @Input() loading = false;

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  }
}
