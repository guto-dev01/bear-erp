import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from './skeleton.component';
import { AlertItem } from '../dashboard.types';

/** Painel lateral de alertas — cada item navega para a página real correspondente. */
@Component({
  selector: 'bear-alert-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <section class="card ap" aria-labelledby="ap-title">
      <header class="ap__head">
        <h3 class="ap__title" id="ap-title">
          <span class="material-symbols-rounded" aria-hidden="true">notifications_active</span>
          Alertas
        </h3>
        <span class="ap__total" [class.ap__total--zero]="total === 0"
              [attr.aria-label]="total + ' pendências no total'">{{ total }}</span>
      </header>

      <div class="ap__list">
        @if (loading) {
          @for (i of [1,2,3,4]; track i) {
            <div class="ap__row ap__row--sk">
              <bear-skeleton width="36px" height="36px" radius="10px"></bear-skeleton>
              <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                <bear-skeleton width="70%" height="0.8rem"></bear-skeleton>
                <bear-skeleton width="40%" height="0.7rem"></bear-skeleton>
              </div>
            </div>
          }
        } @else {
          @for (a of alerts; track a.label) {
            <a class="ap__row" [class]="'ap__row ap__row--' + a.type" [routerLink]="a.route"
               [attr.aria-label]="a.label + ': ' + a.count">
              <span class="ap__icon" aria-hidden="true">
                <span class="material-symbols-rounded">{{ a.icon }}</span>
              </span>
              <div class="ap__body">
                <span class="ap__label">{{ a.label }}</span>
                <span class="ap__desc">{{ a.count === 0 ? 'Sem pendências' : a.count + (a.count === 1 ? ' pendência' : ' pendências') }}</span>
              </div>
              <span class="ap__badge" [class.ap__badge--zero]="a.count === 0">{{ a.count }}</span>
            </a>
          }
        }
      </div>
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
    .ap__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.875rem;
    }
    .ap__title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-title);
    }
    .ap__title .material-symbols-rounded { font-size: 1.125rem; color: var(--orange); }
    .ap__total {
      min-width: 24px;
      height: 22px;
      padding: 0 0.5rem;
      border-radius: var(--r-pill);
      background: var(--color-error-light);
      color: var(--red);
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .ap__total--zero { background: var(--surface-2); color: var(--text-tertiary); }

    .ap__list { display: flex; flex-direction: column; gap: 0.375rem; }

    .ap__row {
      --ac: var(--brand);
      --ac-soft: var(--brand-primary-light);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--r-control);
      text-decoration: none;
      border: 1px solid transparent;
      transition: background var(--transition-fast), border-color var(--transition-fast);
    }
    a.ap__row:hover { background: var(--surface-2); border-color: var(--border-subtle); }
    a.ap__row:focus-visible { outline: 2px solid var(--ac); outline-offset: 1px; }
    .ap__row--sk { cursor: default; }
    .ap__row--error   { --ac: var(--red); --ac-soft: var(--color-error-light); }
    .ap__row--warning { --ac: var(--orange); --ac-soft: var(--color-warning-light); }
    .ap__row--info    { --ac: var(--brand); --ac-soft: var(--color-info-light); }
    .ap__row--purple  { --ac: var(--purple); --ac-soft: var(--brand-accent-light); }

    .ap__icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--ac-soft);
      color: var(--ac);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ap__icon .material-symbols-rounded { font-size: 1.125rem; }
    .ap__body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .ap__label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ap__desc { font-size: 0.6875rem; color: var(--text-tertiary); }
    .ap__badge {
      min-width: 24px;
      height: 24px;
      padding: 0 0.4375rem;
      border-radius: var(--r-pill);
      background: var(--ac-soft);
      color: var(--ac);
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ap__badge--zero { background: var(--surface-2); color: var(--text-tertiary); }
  `],
})
export class AlertPanelComponent {
  @Input() alerts: AlertItem[] = [];
  @Input() loading = false;

  get total(): number {
    return this.alerts.reduce((s, a) => s + a.count, 0);
  }
}
