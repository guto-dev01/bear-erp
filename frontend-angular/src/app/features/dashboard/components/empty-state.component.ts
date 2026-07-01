import { Component, Input } from '@angular/core';

/** Estado vazio profissional — usado quando um indicador não possui dados reais. */
@Component({
  selector: 'bear-empty-state',
  standalone: true,
  template: `
    <div class="empty" [class.empty--compact]="compact" role="status">
      <div class="empty__icon">
        <span class="material-symbols-rounded">{{ icon }}</span>
      </div>
      <p class="empty__title">{{ title }}</p>
      @if (message) { <p class="empty__msg">{{ message }}</p> }
    </div>
  `,
  styles: [`
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.5rem;
      padding: 1.75rem 1rem;
      width: 100%;
    }
    .empty--compact { padding: 1rem; }
    .empty__icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-2);
      color: var(--text-tertiary);
      border: 1px solid var(--border-subtle);
    }
    .empty__icon .material-symbols-rounded { font-size: 1.5rem; }
    .empty__title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .empty__msg {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      max-width: 240px;
      line-height: 1.4;
    }
  `],
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Sem dados';
  @Input() message = '';
  @Input() compact = false;
}
