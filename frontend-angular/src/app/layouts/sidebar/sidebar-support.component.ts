import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Card de suporte no rodapé; vira apenas um botão de ícone no modo trilho. */
@Component({
  selector: 'bear-sidebar-support',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    @if (collapsed) {
      <a class="ss-btn" [href]="mailto" matTooltip="Acessar suporte" matTooltipPosition="right"
         aria-label="Acessar suporte">
        <span class="material-symbols-rounded">support_agent</span>
      </a>
    } @else {
      <div class="ss">
        <div class="ss__title">
          <span class="material-symbols-rounded">support_agent</span>
          Precisa de ajuda?
        </div>
        <p class="ss__text">Abra um chamado ou fale com o suporte.</p>
        <a class="ss__cta" [href]="mailto">
          <span class="material-symbols-rounded">headset_mic</span>
          Acessar Suporte
        </a>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .ss {
      padding: 0.75rem;
      border-radius: var(--radius-md);
      background: linear-gradient(160deg, var(--brand-primary-light), transparent 92%);
      border: 1px solid var(--sidebar-border);
    }
    .ss__title {
      display: flex;
      align-items: center;
      gap: 0.4375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--sidebar-text-hover);
    }
    .ss__title .material-symbols-rounded { font-size: 1.0625rem; color: var(--sidebar-text-active); }
    .ss__text { margin: 0.3125rem 0 0.625rem; font-size: 0.6875rem; line-height: 1.4; color: var(--sidebar-text); }
    .ss__cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.4375rem 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--brand-primary);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      text-decoration: none;
      transition: background var(--transition-fast);
    }
    .ss__cta .material-symbols-rounded { font-size: 1rem; }
    .ss__cta:hover { background: var(--brand-primary-hover); }
    .ss__cta:focus-visible { outline: 2px solid var(--sidebar-active-border); outline-offset: 2px; }

    .ss-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      margin: 0 auto;
      border-radius: var(--radius-md);
      color: var(--sidebar-text);
      text-decoration: none;
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .ss-btn .material-symbols-rounded { font-size: 1.375rem; }
    .ss-btn:hover { background: var(--sidebar-hover); color: var(--sidebar-text-hover); }
    .ss-btn:focus-visible { outline: 2px solid var(--sidebar-active-border); outline-offset: 2px; }
  `],
})
export class SidebarSupportComponent {
  @Input() collapsed = false;
  readonly mailto = 'mailto:suporte@bear-erp.com.br?subject=' + encodeURIComponent('Suporte — Bear ERP');
}
