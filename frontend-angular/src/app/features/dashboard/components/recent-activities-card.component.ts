import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from './skeleton.component';
import { EmptyStateComponent } from './empty-state.component';
import { ActivityItem } from '../dashboard.types';

/** Atividades recentes reais, a partir da trilha de auditoria (audit_logs). */
@Component({
  selector: 'bear-recent-activities-card',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent, EmptyStateComponent],
  template: `
    <section class="card ra" aria-labelledby="ra-title">
      <header class="ra__head">
        <h3 class="ra__title" id="ra-title">Atividades Recentes</h3>
        <a class="ra__link" routerLink="/sistema/auditoria">Ver todas</a>
      </header>

      @if (loading) {
        <div class="ra__list">
          @for (i of [1,2,3,4]; track i) {
            <div class="ra__item ra__item--sk">
              <bear-skeleton width="34px" height="34px" radius="10px"></bear-skeleton>
              <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                <bear-skeleton width="80%" height="0.8rem"></bear-skeleton>
                <bear-skeleton width="30%" height="0.7rem"></bear-skeleton>
              </div>
            </div>
          }
        </div>
      } @else if (activities.length) {
        <ul class="ra__list">
          @for (a of activities; track a.id) {
            <li class="ra__item">
              <span class="ra__icon" [class]="'ra__icon ra__icon--' + a.type" aria-hidden="true">
                <span class="material-symbols-rounded">{{ a.icon }}</span>
              </span>
              <div class="ra__body">
                <p class="ra__text"><strong>{{ a.user }}</strong> {{ a.action }}</p>
              </div>
              <time class="ra__time">{{ a.time }}</time>
            </li>
          }
        </ul>
      } @else {
        <bear-empty-state icon="history" title="Sem atividades recentes"
          message="As ações realizadas no sistema aparecerão aqui."></bear-empty-state>
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
    .ra__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.875rem; }
    .ra__title { font-size: 1rem; font-weight: 600; color: var(--text-title); }
    .ra__link { font-size: 0.75rem; font-weight: 500; color: var(--brand); text-decoration: none; }
    .ra__link:hover { text-decoration: underline; }

    .ra__list { display: flex; flex-direction: column; gap: 0.25rem; list-style: none; margin: 0; padding: 0; }
    .ra__item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.5rem 0.375rem; border-radius: var(--r-control);
    }
    .ra__item--sk { padding: 0.5rem 0.375rem; }
    .ra__icon {
      --c: var(--brand);
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--c) 15%, transparent);
      color: var(--c);
    }
    .ra__icon .material-symbols-rounded { font-size: 1.0625rem; }
    .ra__icon--fiscal { --c: var(--green); }
    .ra__icon--finance { --c: var(--brand); }
    .ra__icon--task { --c: var(--purple); }
    .ra__icon--system { --c: var(--teal); }
    .ra__body { flex: 1; min-width: 0; }
    .ra__text {
      font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.35;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ra__text strong { color: var(--text-primary); font-weight: 600; }
    .ra__time { font-size: 0.6875rem; color: var(--text-tertiary); flex-shrink: 0; }
  `],
})
export class RecentActivitiesCardComponent {
  @Input() activities: ActivityItem[] = [];
  @Input() loading = false;
}
