import {
  Component, DestroyRef, EventEmitter, HostListener, Input, Output, computed, effect, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';
import { NavGroup, NavLeaf, NavSection, SIDEBAR_NAV, isGroup } from './sidebar-nav';

/**
 * SidebarNavigation — renderiza as seções/grupos/itens da navegação.
 *  - Expandido: accordion (um grupo aberto por vez), estado ativo por URL,
 *    o grupo pai abre automaticamente ao entrar numa rota interna.
 *  - Trilho (colapsado): apenas ícones; grupos abrem um popover lateral (flyout).
 *  - Permissões: seções/itens com `roles` só aparecem para quem tem o papel
 *    (fail-open quando o usuário não tem papéis configurados, para não remover acesso).
 */
@Component({
  selector: 'bear-sidebar-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTooltipModule],
  template: `
    <nav class="nav" [class.nav--rail]="collapsed" aria-label="Navegação principal">
      @for (section of sections(); track section.id) {
        @if (section.title) {
          @if (collapsed) {
            <div class="nav__divider" role="separator"></div>
          } @else {
            <div class="nav__section">{{ section.title }}</div>
          }
        }

        @for (node of section.items; track node.id) {
          @if (asGroup(node); as group) {
            @if (collapsed) {
              <!-- Trilho: ícone que abre o flyout -->
              <button type="button" class="nav__rail-item"
                      [class.is-active]="isGroupActive(group)"
                      [class.is-open]="flyoutId() === group.id"
                      (click)="openFlyout(group, $event)"
                      [attr.aria-expanded]="flyoutId() === group.id"
                      [attr.aria-label]="group.label"
                      [matTooltip]="flyoutId() ? '' : group.label" matTooltipPosition="right">
                <span class="material-symbols-rounded">{{ group.icon }}</span>
              </button>
            } @else {
              <!-- Expandido: accordion -->
              <div class="nav__group" [class.is-open]="isOpen(group.id)" [class.is-active]="isGroupActive(group)">
                <button type="button" class="nav__parent" (click)="toggleGroup(group.id)"
                        [attr.aria-expanded]="isOpen(group.id)">
                  <span class="material-symbols-rounded nav__icon">{{ group.icon }}</span>
                  <span class="nav__label">{{ group.label }}</span>
                  <span class="material-symbols-rounded nav__chevron" [class.is-open]="isOpen(group.id)">chevron_right</span>
                </button>
                @if (isOpen(group.id)) {
                  <div class="nav__children" role="group" [attr.aria-label]="group.label">
                    @for (child of group.children; track child.id) {
                      <a class="nav__child" [class.is-active]="isActive(child.route)"
                         [routerLink]="child.route" (click)="onNavigate()"
                         [attr.aria-current]="isActive(child.route) ? 'page' : null">
                        <span class="nav__child-icon material-symbols-rounded">{{ child.icon }}</span>
                        <span class="nav__child-label">{{ child.label }}</span>
                      </a>
                    }
                  </div>
                }
              </div>
            }
          } @else {
            @if (asLeaf(node); as leaf) {
              @if (collapsed) {
                <a class="nav__rail-item" [class.is-active]="isActive(leaf.route)"
                   [routerLink]="leaf.route" (click)="onNavigate()"
                   [attr.aria-label]="leaf.label" [attr.aria-current]="isActive(leaf.route) ? 'page' : null"
                   [matTooltip]="leaf.label" matTooltipPosition="right">
                  <span class="material-symbols-rounded">{{ leaf.icon }}</span>
                </a>
              } @else {
                <a class="nav__item" [class.is-active]="isActive(leaf.route)"
                   [routerLink]="leaf.route" (click)="onNavigate()"
                   [attr.aria-current]="isActive(leaf.route) ? 'page' : null">
                  <span class="material-symbols-rounded nav__icon">{{ leaf.icon }}</span>
                  <span class="nav__label">{{ leaf.label }}</span>
                </a>
              }
            }
          }
        }
      }
    </nav>

    <!-- Flyout do modo trilho -->
    @if (flyoutId() && flyoutGroup(); as fg) {
      <div class="nav-flyout__backdrop" (click)="closeFlyout()"></div>
      <div class="nav-flyout" [style.top.px]="flyoutTop()" role="menu" [attr.aria-label]="fg.label">
        <div class="nav-flyout__title">{{ fg.label }}</div>
        @for (child of fg.children; track child.id) {
          <a class="nav-flyout__item" role="menuitem" [class.is-active]="isActive(child.route)"
             [routerLink]="child.route" (click)="onFlyoutNavigate()"
             [attr.aria-current]="isActive(child.route) ? 'page' : null">
            <span class="material-symbols-rounded">{{ child.icon }}</span>
            <span>{{ child.label }}</span>
          </a>
        }
      </div>
    }
  `,
  styleUrl: './sidebar-nav.component.scss',
})
export class SidebarNavComponent {
  @Input() collapsed = false;
  @Output() navigate = new EventEmitter<void>();

  private router = inject(Router);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  private readonly currentUrl = signal(this.stripUrl(this.router.url));
  readonly openGroupId = signal<string | null>(null);
  readonly flyoutId = signal<string | null>(null);
  readonly flyoutTop = signal(0);

  /** Seções visíveis conforme os papéis do usuário autenticado. */
  readonly sections = computed<NavSection[]>(() => {
    const roles = this.auth.user()?.roles ?? [];
    return SIDEBAR_NAV
      .filter(s => this.canSee(s.roles, roles))
      .map(s => ({
        ...s,
        items: s.items
          .map(n => (isGroup(n) ? { ...n, children: n.children.filter(c => this.canSee(c.roles, roles)) } : n))
          .filter(n => (isGroup(n) ? n.children.length > 0 : this.canSee((n as NavLeaf).roles, roles))),
      }))
      .filter(s => s.items.length > 0);
  });

  readonly flyoutGroup = computed<NavGroup | null>(() => {
    const id = this.flyoutId();
    if (!id) return null;
    for (const s of this.sections()) {
      for (const n of s.items) if (isGroup(n) && n.id === id) return n;
    }
    return null;
  });

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(e => this.currentUrl.set(this.stripUrl((e as NavigationEnd).urlAfterRedirects)));

    // Abre automaticamente o grupo pai da rota atual (accordion).
    effect(() => {
      const url = this.currentUrl();
      const gid = this.groupForUrl(url);
      if (gid) this.openGroupId.set(gid);
    }, { allowSignalWrites: true });

    // Fecha o flyout ao sair do modo trilho.
    effect(() => {
      if (!this.collapsed) this.flyoutId.set(null);
    }, { allowSignalWrites: true });
  }

  // Narrowing helpers para o template (o control-flow não estreita uniões).
  asGroup(n: NavGroup | NavLeaf): NavGroup | null { return isGroup(n) ? n : null; }
  asLeaf(n: NavGroup | NavLeaf): NavLeaf | null { return isGroup(n) ? null : n; }

  isActive(route: string): boolean {
    const u = this.currentUrl();
    return u === route || u.startsWith(route + '/');
  }

  isGroupActive(group: NavGroup): boolean {
    return group.children.some(c => this.isActive(c.route));
  }

  isOpen(id: string): boolean { return this.openGroupId() === id; }

  toggleGroup(id: string): void {
    this.openGroupId.update(cur => (cur === id ? null : id));
  }

  onNavigate(): void {
    this.navigate.emit();
  }

  // ── Flyout (modo trilho) ────────────────────────────────────────────────
  openFlyout(group: NavGroup, ev: Event): void {
    if (this.flyoutId() === group.id) { this.closeFlyout(); return; }
    const el = ev.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const estimated = 60 + group.children.length * 40;
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - estimated - 8));
    this.flyoutTop.set(top);
    this.flyoutId.set(group.id);
  }

  closeFlyout(): void { this.flyoutId.set(null); }

  onFlyoutNavigate(): void {
    this.closeFlyout();
    this.navigate.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.closeFlyout(); }

  // ── Internos ────────────────────────────────────────────────────────────
  private groupForUrl(url: string): string | null {
    for (const s of this.sections()) {
      for (const n of s.items) {
        if (isGroup(n) && n.children.some(c => url === c.route || url.startsWith(c.route + '/'))) return n.id;
      }
    }
    return null;
  }

  private stripUrl(url: string): string {
    return (url || '/').split('?')[0].split('#')[0];
  }

  private canSee(required: string[] | undefined, userRoles: string[]): boolean {
    if (!required || required.length === 0) return true;
    // Sem papéis configurados → não esconder (preserva o acesso atual).
    if (userRoles.length === 0) return true;
    return userRoles.some(r => required.some(req => r.toUpperCase() === req.toUpperCase()));
  }
}
