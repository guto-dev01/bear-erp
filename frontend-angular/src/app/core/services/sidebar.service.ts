import { Injectable, computed, effect, signal } from '@angular/core';

/**
 * Estado da sidebar, com três regimes de viewport:
 *  - Desktop (≥1024): sidebar fixa, expandida ou em trilho (colapsada). Persistido.
 *  - Tablet  (768–1023): trilho fixo de ícones; o drawer sobrepõe para ver rótulos.
 *  - Mobile  (<768): sem sidebar fixa — apenas drawer sobreposto.
 *
 * `collapsed` (preferência desktop) é persistido; `mobileOpen` (drawer) NUNCA é —
 * inicia sempre fechado. Acesso a window/localStorage é guardado para não quebrar
 * caso o código rode fora do navegador.
 */
@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly storageKey = 'bear-sidebar-collapsed';

  /** Colapso da sidebar no desktop (trilho de ícones). Persistido. */
  readonly collapsed = signal(this.readCollapsed());
  /** Drawer sobreposto (tablet/mobile). Transitório — nunca persistido. */
  readonly mobileOpen = signal(false);
  /** Largura da viewport, atualizada em resize. */
  readonly viewportWidth = signal(this.readWidth());

  readonly isMobile = computed(() => this.viewportWidth() < 768);
  readonly isTablet = computed(() => this.viewportWidth() >= 768 && this.viewportWidth() < 1024);
  readonly isDesktop = computed(() => this.viewportWidth() >= 1024);

  /** Modo trilho (apenas ícones) da sidebar fixa: tablet sempre; desktop por preferência. */
  readonly railCollapsed = computed(() => (this.isDesktop() ? this.collapsed() : true));

  /** Largura que o conteúdo principal reserva para a sidebar fixa. */
  readonly width = computed(() =>
    this.isMobile() ? '0px' : (this.railCollapsed() ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'),
  );

  /** O drawer é o mecanismo de navegação sobreposto (tablet + mobile). */
  readonly usesDrawer = computed(() => !this.isDesktop());

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResize, { passive: true });
    }
    // Trava o scroll do body enquanto o drawer estiver aberto (evita scroll duplo).
    effect(() => {
      if (typeof document === 'undefined') return;
      document.body.style.overflow = this.usesDrawer() && this.mobileOpen() ? 'hidden' : '';
    });
  }

  private onResize = (): void => {
    this.viewportWidth.set(window.innerWidth);
    // Ao voltar para o desktop, o drawer não deve permanecer aberto.
    if (this.isDesktop() && this.mobileOpen()) this.mobileOpen.set(false);
  };

  /** Botão principal (topbar/rodapé): drawer no tablet/mobile, colapso no desktop. */
  primaryToggle(): void {
    if (this.usesDrawer()) this.mobileOpen.update(v => !v);
    else this.toggleCollapsed();
  }

  toggleCollapsed(): void {
    this.collapsed.update(v => !v);
    this.persist();
  }

  openMobile(): void { this.mobileOpen.set(true); }
  closeMobile(): void { this.mobileOpen.set(false); }

  /** Mantido por compatibilidade com chamadas antigas. */
  toggle(): void { this.primaryToggle(); }

  private persist(): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(this.storageKey, String(this.collapsed()));
  }

  private readCollapsed(): boolean {
    return typeof localStorage !== 'undefined' && localStorage.getItem(this.storageKey) === 'true';
  }

  private readWidth(): number {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
  }
}
