import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Topo da sidebar: logo compacto + nome, selo PRO e subtítulo (ocultos no trilho). */
@Component({
  selector: 'bear-sidebar-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sh" [class.sh--rail]="collapsed">
      <div class="sh__logo" aria-hidden="true">
        @if (logoOk) {
          <img src="assets/logo-bear.png" alt="Bear ERP" (error)="logoOk = false">
        } @else {
          <span class="material-symbols-rounded">pets</span>
        }
      </div>
      @if (!collapsed) {
        <div class="sh__meta">
          <div class="sh__row">
            <span class="sh__name">Bear ERP</span>
            <span class="sh__badge">PRO</span>
          </div>
          <span class="sh__sub">Sistema de Gestão Empresarial</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .sh {
      display: flex;
      align-items: center;
      gap: 0.6875rem;
      padding: 0.875rem 1rem;
      min-height: 60px;
      border-bottom: 1px solid var(--sidebar-border);
    }
    .sh--rail { justify-content: center; padding: 0.875rem 0; }
    .sh__logo {
      width: 34px;
      height: 34px;
      min-width: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sh__logo img { width: 100%; height: 100%; object-fit: contain; display: block; filter: drop-shadow(0 2px 6px rgba(139, 92, 246, 0.35)); }
    .sh__logo .material-symbols-rounded { font-size: 1.5rem; color: var(--brand-primary); }
    .sh__meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .sh__row { display: flex; align-items: center; gap: 0.5rem; }
    .sh__name {
      font-size: 0.9375rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sh__badge {
      font-size: 0.5625rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.0625rem 0.375rem;
      border-radius: 4px;
      background: var(--brand-primary-muted);
      color: #8ec2ff;
      border: 1px solid var(--brand-primary-muted);
      flex-shrink: 0;
    }
    .sh__sub {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--sidebar-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class SidebarHeaderComponent {
  @Input() collapsed = false;
  /** Logo do urso; se o arquivo ainda não existir, cai para o ícone de pata. */
  logoOk = true;
}
