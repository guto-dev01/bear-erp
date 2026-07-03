import { Component, EventEmitter, HostListener, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SidebarService } from '@core/services/sidebar.service';
import { SidebarHeaderComponent } from './sidebar-header.component';
import { SidebarNavComponent } from './sidebar-nav.component';
import { SidebarUserComponent } from './sidebar-user.component';

/**
 * AppSidebar — casca da navegação. Compõe header + nav + user e
 * decide o regime de exibição:
 *  - Desktop: sidebar fixa (trilho/expandida), colapso persistido.
 *  - Tablet: trilho fixo + drawer sobreposto sob demanda.
 *  - Mobile: apenas drawer sobreposto (sem sidebar fixa).
 */
@Component({
  selector: 'bear-app-sidebar',
  standalone: true,
  imports: [
    CommonModule, MatTooltipModule,
    SidebarHeaderComponent, SidebarNavComponent, SidebarUserComponent,
  ],
  template: `
    <!-- ── Sidebar fixa (desktop + tablet) ── -->
    @if (!sidebar.isMobile()) {
      <aside class="sb sb--fixed" [class.sb--rail]="rail()" aria-label="Barra lateral">
        <bear-sidebar-header [collapsed]="rail()"></bear-sidebar-header>

        @if (rail()) {
          <button type="button" class="sb__search-icon" (click)="search.emit()"
                  matTooltip="Buscar (⌘K)" matTooltipPosition="right" aria-label="Buscar">
            <span class="material-symbols-rounded">search</span>
          </button>
        } @else {
          <button type="button" class="sb__search" (click)="search.emit()" aria-label="Buscar">
            <span class="material-symbols-rounded">search</span>
            <span class="sb__search-text">Buscar...</span>
            <kbd class="sb__search-kbd">⌘K</kbd>
          </button>
        }

        <div class="sb__scroll">
          <bear-sidebar-nav [collapsed]="rail()"></bear-sidebar-nav>
        </div>

        <div class="sb__footer">
          <bear-sidebar-user [collapsed]="rail()"></bear-sidebar-user>
          @if (rail()) {
            <button type="button" class="sb__collapse sb__collapse--rail" (click)="sidebar.primaryToggle()"
                    matTooltip="Expandir menu" matTooltipPosition="right" aria-label="Expandir menu">
              <span class="material-symbols-rounded">chevron_right</span>
            </button>
          } @else {
            <button type="button" class="sb__collapse" (click)="sidebar.toggleCollapsed()" aria-label="Recolher menu">
              <span class="material-symbols-rounded">chevron_left</span>
              Recolher menu
            </button>
          }
        </div>
      </aside>
    }

    <!-- ── Drawer sobreposto (tablet + mobile) ── -->
    @if (sidebar.usesDrawer()) {
      <div class="sb-overlay" [class.is-open]="sidebar.mobileOpen()"
           (click)="sidebar.closeMobile()" aria-hidden="true"></div>
      <aside class="sb sb--drawer" [class.is-open]="sidebar.mobileOpen()"
             role="dialog" aria-modal="true" aria-label="Menu de navegação"
             [attr.aria-hidden]="!sidebar.mobileOpen()" [attr.inert]="sidebar.mobileOpen() ? null : ''">
        <div class="sb-drawer__top">
          <bear-sidebar-header [collapsed]="false"></bear-sidebar-header>
          <button type="button" class="sb-drawer__close" (click)="sidebar.closeMobile()" aria-label="Fechar menu">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <div class="sb__scroll">
          <bear-sidebar-nav [collapsed]="false" (navigate)="sidebar.closeMobile()"></bear-sidebar-nav>
        </div>
        <div class="sb__footer">
          <bear-sidebar-user [collapsed]="false"></bear-sidebar-user>
        </div>
      </aside>
    }
  `,
  styleUrl: './app-sidebar.component.scss',
})
export class AppSidebarComponent {
  @Output() search = new EventEmitter<void>();

  sidebar = inject(SidebarService);

  rail(): boolean { return this.sidebar.railCollapsed(); }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.sidebar.mobileOpen()) this.sidebar.closeMobile();
  }
}
