import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SparklineComponent } from './sparkline.component';
import { SkeletonComponent } from './skeleton.component';
import { MetricCardData } from '../dashboard.types';

/** Card de indicador principal (KPI): ícone, valor, tendência real e sparkline. */
@Component({
  selector: 'bear-metric-card',
  standalone: true,
  imports: [CommonModule, RouterLink, SparklineComponent, SkeletonComponent],
  template: `
    @if (loading) {
      <div class="mc mc--skeleton">
        <bear-skeleton width="40px" height="40px" radius="12px"></bear-skeleton>
        <bear-skeleton width="55%" height="0.8rem"></bear-skeleton>
        <bear-skeleton width="45%" height="1.6rem"></bear-skeleton>
        <bear-skeleton width="70%" height="0.7rem"></bear-skeleton>
      </div>
    } @else if (data) {
      <a class="mc" [class]="'mc mc--' + data.theme" [routerLink]="data.route"
         [attr.aria-label]="data.title + ': ' + data.value">
        <div class="mc__top">
          <span class="mc__icon" aria-hidden="true">
            <span class="material-symbols-rounded">{{ data.icon }}</span>
          </span>
          @if (data.trend) {
            <span class="mc__trend" [class.mc__trend--up]="data.trend.up" [class.mc__trend--down]="!data.trend.up">
              <span class="material-symbols-rounded">{{ data.trend.up ? 'trending_up' : 'trending_down' }}</span>
              {{ data.trend.value }}
            </span>
          }
        </div>
        <span class="mc__title">{{ data.title }}</span>
        <span class="mc__value">{{ data.value }}</span>
        <span class="mc__sub">{{ data.sublabel }}</span>
        <div class="mc__spark">
          @if (data.spark.length > 1) {
            <bear-sparkline [data]="data.spark" [color]="'var(--mc)'"></bear-sparkline>
          }
        </div>
      </a>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .mc {
      --mc: var(--brand);
      --mc-soft: var(--brand-primary-light);
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      height: 100%;
      min-height: 158px;
      padding: 1.125rem 1.25rem 0.75rem;
      border-radius: var(--r-card);
      background: var(--surface-card);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-xs);
      text-decoration: none;
      overflow: hidden;
      transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
    }
    a.mc:hover {
      border-color: color-mix(in srgb, var(--mc) 40%, var(--border-color));
      background: var(--surface-raised);
      transform: translateY(-2px);
    }
    a.mc:active { transform: translateY(0); }
    a.mc:focus-visible { outline: 2px solid var(--mc); outline-offset: 2px; }

    .mc--blue   { --mc: #1687ff; --mc-soft: rgba(22, 135, 255, 0.14); }
    .mc--purple { --mc: #8b5cf6; --mc-soft: rgba(139, 92, 246, 0.16); }
    .mc--orange { --mc: #ff8a1f; --mc-soft: rgba(255, 138, 31, 0.16); }
    .mc--green  { --mc: #20d477; --mc-soft: rgba(32, 212, 119, 0.16); }
    .mc--pink   { --mc: #f472b6; --mc-soft: rgba(244, 114, 182, 0.16); }

    .mc__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .mc__icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--mc-soft);
      color: var(--mc);
    }
    .mc__icon .material-symbols-rounded { font-size: 1.375rem; }

    .mc__trend {
      display: inline-flex;
      align-items: center;
      gap: 0.125rem;
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.125rem 0.4375rem;
      border-radius: var(--r-pill);
    }
    .mc__trend .material-symbols-rounded { font-size: 0.875rem; }
    .mc__trend--up { color: var(--green); background: var(--color-success-light); }
    .mc__trend--down { color: var(--red); background: var(--color-error-light); }

    .mc__title {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
      margin-top: 0.125rem;
    }
    .mc__value {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-title);
      line-height: 1.1;
    }
    .mc__sub {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }
    .mc__spark {
      margin-top: auto;
      height: 34px;
      color: var(--mc);
      pointer-events: none;
    }

    .mc--skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      cursor: default;
    }

    @media (max-width: 640px) {
      .mc { min-height: 138px; }
      .mc__value { font-size: 1.5rem; }
    }
  `],
})
export class MetricCardComponent {
  @Input() data: MetricCardData | null = null;
  @Input() loading = false;
}
