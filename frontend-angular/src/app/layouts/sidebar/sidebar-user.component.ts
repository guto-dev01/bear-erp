import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '@core/auth/auth.service';
import { ThemeService } from '@core/services/theme.service';

/** Card do usuário no rodapé: avatar/nome/e-mail + menu (tema, configurações, sair). */
@Component({
  selector: 'bear-sidebar-user',
  standalone: true,
  imports: [CommonModule, RouterLink, MatMenuModule, MatTooltipModule],
  template: `
    @if (collapsed) {
      <button type="button" class="su su--rail" [matMenuTriggerFor]="userMenu"
              [matTooltip]="auth.user()?.nome || 'Conta'" matTooltipPosition="right"
              aria-label="Menu do usuário">
        <span class="su__avatar">{{ initials() }}</span>
        <span class="su__status"></span>
      </button>
    } @else {
      <div class="su">
        <div class="su__avatar-wrap">
          <span class="su__avatar">{{ initials() }}</span>
          <span class="su__status"></span>
        </div>
        <div class="su__info" [matTooltip]="fullTooltip()" matTooltipPosition="above">
          <span class="su__name">{{ auth.user()?.nome || 'Usuário' }}</span>
          <span class="su__email">{{ auth.user()?.email }}</span>
        </div>
        <button type="button" class="su__more" [matMenuTriggerFor]="userMenu" aria-label="Opções da conta">
          <span class="material-symbols-rounded">more_vert</span>
        </button>
      </div>
    }

    <mat-menu #userMenu="matMenu" xPosition="after">
      <button mat-menu-item (click)="theme.toggle()">
        <span class="material-symbols-rounded su__menu-icon">{{ theme.icon() }}</span>
        <span>{{ theme.label() }}</span>
      </button>
      <a mat-menu-item routerLink="/configuracoes">
        <span class="material-symbols-rounded su__menu-icon">settings</span>
        <span>Configurações</span>
      </a>
      <button mat-menu-item (click)="auth.logout()">
        <span class="material-symbols-rounded su__menu-icon su__menu-icon--danger">logout</span>
        <span class="su__danger">Sair</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    :host { display: block; }
    .su {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.375rem;
      border-radius: var(--radius-md);
    }
    .su:not(.su--rail):hover { background: var(--sidebar-hover); }

    .su--rail {
      position: relative;
      width: 44px;
      height: 44px;
      margin: 0 auto;
      justify-content: center;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: var(--radius-md);
    }
    .su--rail:hover { background: var(--sidebar-hover); }
    .su--rail:focus-visible { outline: 2px solid var(--sidebar-active-border); outline-offset: 2px; }

    .su__avatar-wrap { position: relative; flex-shrink: 0; }
    .su__avatar {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, #20d477, #16c7d9);
    }
    .su__status {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--green);
      border: 2px solid var(--surface-card);
    }
    .su--rail .su__status { bottom: 6px; right: 6px; }

    .su__info { flex: 1; min-width: 0; display: flex; flex-direction: column; cursor: default; }
    .su__name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .su__email {
      font-size: 0.6875rem;
      color: var(--sidebar-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .su__more {
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--sidebar-text);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .su__more:hover { background: var(--sidebar-active); color: var(--sidebar-text-hover); }
    .su__more:focus-visible { outline: 2px solid var(--sidebar-active-border); outline-offset: 1px; }
    .su__more .material-symbols-rounded { font-size: 1.25rem; }

    .su__menu-icon { margin-right: 0.75rem; font-size: 1.125rem; vertical-align: middle; }
    .su__menu-icon--danger, .su__danger { color: var(--red); }
  `],
})
export class SidebarUserComponent {
  @Input() collapsed = false;

  auth = inject(AuthService);
  theme = inject(ThemeService);

  initials(): string {
    const name = this.auth.user()?.nome;
    if (!name) return '?';
    return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  fullTooltip(): string {
    const u = this.auth.user();
    return [u?.nome, u?.email].filter(Boolean).join('\n');
  }
}
