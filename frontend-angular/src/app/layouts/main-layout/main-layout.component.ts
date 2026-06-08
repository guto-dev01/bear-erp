import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { SidebarService } from '@core/services/sidebar.service';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: { label: string; icon: string; route: string }[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'bear-main-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule,
    FormsModule,
  ],
  template: `
    <!-- ═══ Command Palette (⌘K) ═══ -->
    @if (commandPaletteOpen()) {
      <div class="cmd-palette__backdrop" (click)="commandPaletteOpen.set(false)"></div>
      <div class="cmd-palette">
        <div class="cmd-palette__header">
          <span class="material-symbols-rounded cmd-palette__search-icon">search</span>
          <input
            #cmdInput
            class="cmd-palette__input"
            type="text"
            placeholder="Buscar páginas, ações, atalhos..."
            [ngModel]="commandQuery()"
            (ngModelChange)="commandQuery.set($event)"
            (keydown.escape)="commandPaletteOpen.set(false)"
            (keydown.arrowdown)="navigateResults(1, $event)"
            (keydown.arrowup)="navigateResults(-1, $event)"
            (keydown.enter)="executeResult()"
          />
          <kbd class="cmd-palette__esc">ESC</kbd>
        </div>
        <div class="cmd-palette__body">
          @if (filteredCommands().length === 0) {
            <div class="cmd-palette__empty">
              <span class="material-symbols-rounded text-2xl text-text-tertiary">search_off</span>
              <span class="text-sm text-text-tertiary">Nenhum resultado para "{{ commandQuery() }}"</span>
            </div>
          } @else {
            <div class="cmd-palette__group-label">Páginas</div>
            @for (cmd of filteredCommands(); track cmd.route; let i = $index) {
              <button
                class="cmd-palette__result"
                [class.cmd-palette__result--active]="selectedResultIndex() === i"
                (click)="goToRoute(cmd.route)"
                (mouseenter)="selectedResultIndex.set(i)">
                <span class="material-symbols-rounded cmd-palette__result-icon">{{ cmd.icon }}</span>
                <div class="cmd-palette__result-text">
                  <span class="cmd-palette__result-label">{{ cmd.label }}</span>
                  <span class="cmd-palette__result-path">{{ cmd.section }}</span>
                </div>
                <span class="material-symbols-rounded cmd-palette__result-arrow">arrow_forward</span>
              </button>
            }
          }
        </div>
        <div class="cmd-palette__footer">
          <div class="cmd-palette__hint">
            <kbd>↑↓</kbd> navegar
          </div>
          <div class="cmd-palette__hint">
            <kbd>↵</kbd> abrir
          </div>
          <div class="cmd-palette__hint">
            <kbd>esc</kbd> fechar
          </div>
        </div>
      </div>
    }

    <!-- ═══ Notification Dropdown ═══ -->
    @if (notificationsOpen()) {
      <div class="notif-backdrop" (click)="notificationsOpen.set(false)"></div>
      <div class="notif-dropdown" [style.right.px]="notifDropdownRight()">
        <div class="notif-dropdown__header">
          <span class="text-sm font-semibold text-text-primary">Notificações</span>
          <button class="notif-dropdown__mark-all" (click)="markAllRead()">Marcar todas lidas</button>
        </div>
        <div class="notif-dropdown__body">
          @for (notif of notifications(); track notif.id) {
            <div class="notif-dropdown__item" [class.notif-dropdown__item--unread]="!notif.read">
              <div class="notif-dropdown__item-icon" [class]="'notif-dropdown__item-icon--' + notif.type">
                <span class="material-symbols-rounded text-base">{{ notif.icon }}</span>
              </div>
              <div class="notif-dropdown__item-content">
                <span class="text-sm text-text-primary">{{ notif.title }}</span>
                <span class="text-xs text-text-tertiary">{{ notif.time }}</span>
              </div>
            </div>
          }
        </div>
        <div class="notif-dropdown__footer">
          <a routerLink="/notificacoes" class="text-xs text-primary font-medium" (click)="notificationsOpen.set(false)">Ver todas</a>
        </div>
      </div>
    }

    <!-- ═══ Quick Create Menu ═══ -->
    @if (quickCreateOpen()) {
      <div class="notif-backdrop" (click)="quickCreateOpen.set(false)"></div>
      <div class="quick-create-dropdown" [style.right.px]="quickCreateRight()">
        <div class="quick-create-dropdown__header">
          <span class="text-sm font-semibold text-text-primary">Criar novo</span>
        </div>
        @for (action of quickCreateActions; track action.label) {
          <button class="quick-create-dropdown__item" (click)="goToRoute(action.route); quickCreateOpen.set(false)">
            <span class="material-symbols-rounded text-lg" [style.color]="action.color">{{ action.icon }}</span>
            <div class="quick-create-dropdown__item-text">
              <span class="text-sm text-text-primary">{{ action.label }}</span>
              <span class="text-xs text-text-tertiary">{{ action.description }}</span>
            </div>
          </button>
        }
      </div>
    }

    <!-- ═══ Sidebar ═══ -->
    <aside class="sidebar" [class.sidebar--collapsed]="sidebar.collapsed()">
      <!-- Workspace Switcher -->
      <div class="sidebar__workspace" [matMenuTriggerFor]="workspaceMenu">
        <div class="sidebar__logo-icon">
          <span class="material-symbols-rounded text-white text-lg">pets</span>
          <div class="sidebar__logo-glow"></div>
        </div>
        @if (!sidebar.collapsed()) {
          <div class="sidebar__workspace-info">
            <div class="sidebar__workspace-row">
              <span class="text-sm font-bold text-white tracking-tight truncate">Bear ERP</span>
              <span class="sidebar__plan-badge">Pro</span>
            </div>
            <span class="text-2xs text-slate-400 font-medium truncate">{{ authService.user()?.nome || 'Escritório' }}</span>
          </div>
          <span class="material-symbols-rounded text-sm text-slate-500 sidebar__workspace-chevron">unfold_more</span>
        }
      </div>

      <mat-menu #workspaceMenu="matMenu">
        <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <span class="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Escritórios</span>
        </div>
        <button mat-menu-item>
          <span class="material-symbols-rounded mr-3 text-lg text-indigo-500">check_circle</span>
          <span>Bear ERP (atual)</span>
        </button>
        <button mat-menu-item routerLink="/sistema/multi-tenancy">
          <span class="material-symbols-rounded mr-3 text-lg">add_circle_outline</span>
          <span>Gerenciar escritórios</span>
        </button>
      </mat-menu>

      <!-- Search trigger -->
      @if (!sidebar.collapsed()) {
        <div class="sidebar__search" (click)="openCommandPalette()">
          <span class="material-symbols-rounded text-sm">search</span>
          <span class="text-xs text-slate-400">Buscar...</span>
          <kbd class="sidebar__search-kbd">⌘K</kbd>
        </div>
      } @else {
        <button class="sidebar__icon-btn" (click)="openCommandPalette()"
                matTooltip="Buscar (⌘K)" matTooltipPosition="right">
          <span class="material-symbols-rounded text-lg">search</span>
        </button>
      }

      <!-- Favoritos (Pinned) -->
      @if (!sidebar.collapsed() && favorites().length > 0) {
        <div class="sidebar__section-title">
          <span>Favoritos</span>
          <span class="material-symbols-rounded text-sm sidebar__section-action" matTooltip="Editar favoritos">edit</span>
        </div>
        @for (fav of favorites(); track fav.route) {
          <a class="sidebar__item sidebar__item--fav" [routerLink]="fav.route"
             routerLinkActive="sidebar__item--active">
            <span class="material-symbols-rounded sidebar__item-icon">{{ fav.icon }}</span>
            <span class="sidebar__item-label">{{ fav.label }}</span>
          </a>
        }
      }

      <!-- Navigation -->
      <nav class="sidebar__nav">
        @for (section of menuSections; track section.title) {
          @if (!sidebar.collapsed()) {
            <div class="sidebar__section-title">{{ section.title }}</div>
          } @else {
            <div class="sidebar__section-divider"></div>
          }
          @for (item of section.items; track item.label) {
            @if (item.children) {
              <div class="sidebar__group" [class.sidebar__group--open]="isGroupOpen(item.label)">
                <button class="sidebar__item" (click)="toggleGroup(item.label)"
                        [matTooltip]="sidebar.collapsed() ? item.label : ''"
                        matTooltipPosition="right">
                  <span class="material-symbols-rounded sidebar__item-icon">{{ item.icon }}</span>
                  @if (!sidebar.collapsed()) {
                    <span class="sidebar__item-label">{{ item.label }}</span>
                    <span class="material-symbols-rounded sidebar__item-chevron"
                          [class.sidebar__item-chevron--open]="isGroupOpen(item.label)">chevron_right</span>
                  }
                </button>
                @if (!sidebar.collapsed() && isGroupOpen(item.label)) {
                  <div class="sidebar__children">
                    @for (child of item.children; track child.label) {
                      <a class="sidebar__child-item" [routerLink]="child.route"
                         routerLinkActive="sidebar__child-item--active">
                        <span class="sidebar__child-dot"></span>
                        <span>{{ child.label }}</span>
                      </a>
                    }
                  </div>
                }
              </div>
            } @else {
              <a class="sidebar__item" [routerLink]="item.route"
                 routerLinkActive="sidebar__item--active"
                 [matTooltip]="sidebar.collapsed() ? item.label : ''"
                 matTooltipPosition="right">
                <span class="material-symbols-rounded sidebar__item-icon">{{ item.icon }}</span>
                @if (!sidebar.collapsed()) {
                  <span class="sidebar__item-label">{{ item.label }}</span>
                }
              </a>
            }
          }
        }
      </nav>

      <!-- Bottom section -->
      <div class="sidebar__bottom">
        @if (!sidebar.collapsed()) {
          <div class="sidebar__user">
            <div class="sidebar__user-avatar-wrap">
              <div class="sidebar__user-avatar">
                {{ getInitials(authService.user()?.nome) }}
              </div>
              <span class="sidebar__user-status"></span>
            </div>
            <div class="sidebar__user-info">
              <span class="text-sm font-semibold text-slate-200 truncate">{{ authService.user()?.nome }}</span>
              <span class="text-2xs text-slate-400 truncate">{{ authService.user()?.email }}</span>
            </div>
            <button mat-icon-button [matMenuTriggerFor]="userMenu" class="!text-slate-400 !w-8 !h-8">
              <span class="material-symbols-rounded text-lg">more_horiz</span>
            </button>
          </div>
        } @else {
          <button class="sidebar__icon-btn" [matMenuTriggerFor]="userMenu"
                  matTooltip="Menu" matTooltipPosition="right">
            <div class="sidebar__user-avatar-wrap">
              <div class="sidebar__user-avatar sidebar__user-avatar--sm">
                {{ getInitials(authService.user()?.nome) }}
              </div>
              <span class="sidebar__user-status sidebar__user-status--sm"></span>
            </div>
          </button>
        }
      </div>
    </aside>

    <mat-menu #userMenu="matMenu">
      <button mat-menu-item (click)="themeService.toggle()">
        <span class="material-symbols-rounded mr-3 text-lg">{{ themeService.icon() }}</span>
        <span>{{ themeService.label() }}</span>
      </button>
      <button mat-menu-item routerLink="/configuracoes">
        <span class="material-symbols-rounded mr-3 text-lg">settings</span>
        <span>Configurações</span>
      </button>
      <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
      <button mat-menu-item (click)="authService.logout()">
        <span class="material-symbols-rounded mr-3 text-lg text-red-500">logout</span>
        <span class="text-red-500">Sair</span>
      </button>
    </mat-menu>

    <!-- ═══ Main content area ═══ -->
    <div class="main-content" [style.margin-left]="sidebar.width()">
      <!-- Toolbar -->
      <header class="toolbar">
        <div class="toolbar__left">
          <button class="toolbar__toggle" (click)="sidebar.toggle()" matTooltip="Alternar menu">
            <span class="material-symbols-rounded">{{ sidebar.collapsed() ? 'menu' : 'menu_open' }}</span>
          </button>

          <nav class="toolbar__breadcrumb">
            <a class="toolbar__breadcrumb-item toolbar__breadcrumb-item--root" routerLink="/dashboard">
              <span class="material-symbols-rounded text-sm">home</span>
            </a>
            @if (getCurrentSection()) {
              <span class="material-symbols-rounded toolbar__breadcrumb-sep">chevron_right</span>
              <span class="toolbar__breadcrumb-item toolbar__breadcrumb-item--section">{{ getCurrentSection() }}</span>
            }
            <span class="material-symbols-rounded toolbar__breadcrumb-sep">chevron_right</span>
            <span class="toolbar__breadcrumb-item toolbar__breadcrumb-item--current">{{ getCurrentPageTitle() }}</span>
          </nav>
        </div>

        <div class="toolbar__center">
          <button class="toolbar__search-trigger" (click)="openCommandPalette()">
            <span class="material-symbols-rounded text-base">search</span>
            <span class="text-sm text-text-tertiary">Buscar...</span>
            <kbd class="toolbar__search-kbd">⌘K</kbd>
          </button>
        </div>

        <div class="toolbar__right">
          <!-- Quick create -->
          <button class="toolbar__action toolbar__action--create" #quickCreateBtn
                  matTooltip="Criar novo"
                  (click)="toggleQuickCreate($event)">
            <span class="material-symbols-rounded">add</span>
          </button>

          <!-- Notifications -->
          <button class="toolbar__action" #notifBtn
                  matTooltip="Notificações"
                  (click)="toggleNotifications($event)">
            <span class="material-symbols-rounded">notifications</span>
            @if (unreadCount() > 0) {
              <span class="toolbar__badge">{{ unreadCount() }}</span>
            }
          </button>

          <button class="toolbar__action" matTooltip="Ajuda" routerLink="/ajuda">
            <span class="material-symbols-rounded">help_outline</span>
          </button>

          <!-- Theme toggle with icon transition -->
          <button class="toolbar__action toolbar__action--theme" (click)="themeService.toggle()"
                  [matTooltip]="themeService.label()">
            <span class="material-symbols-rounded toolbar__theme-icon"
                  [class.toolbar__theme-icon--dark]="themeService.isDark()">
              {{ themeService.icon() }}
            </span>
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content">
        <router-outlet />
      </main>
    </div>

    <!-- Mobile tab bar (iOS) — visible ≤768px -->
    <nav class="tab-bar">
      <a class="tab-bar__item" routerLink="/dashboard" routerLinkActive="tab-bar__item--active">
        <span class="material-symbols-rounded">home</span>
        <span>Início</span>
      </a>
      <a class="tab-bar__item" routerLink="/empresas" routerLinkActive="tab-bar__item--active">
        <span class="material-symbols-rounded">apartment</span>
        <span>Empresas</span>
      </a>
      <button class="tab-bar__fab" (click)="openCommandPalette()" aria-label="Ações rápidas">
        <span class="material-symbols-rounded">add</span>
      </button>
      <a class="tab-bar__item" routerLink="/clientes" routerLinkActive="tab-bar__item--active">
        <span class="material-symbols-rounded">groups</span>
        <span>Clientes</span>
      </a>
      <button class="tab-bar__item" (click)="openCommandPalette()">
        <span class="material-symbols-rounded">more_horiz</span>
        <span>Mais</span>
      </button>
    </nav>
  `,
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  openGroups = signal<Set<string>>(new Set());
  commandPaletteOpen = signal(false);
  commandQuery = signal('');
  selectedResultIndex = signal(0);
  notificationsOpen = signal(false);
  quickCreateOpen = signal(false);
  notifDropdownRight = signal(16);
  quickCreateRight = signal(16);

  favorites = signal([
    { label: 'Dashboard', icon: 'space_dashboard', route: '/dashboard' },
    { label: 'Tarefas', icon: 'task_alt', route: '/escritorio/tarefas' },
    { label: 'Clientes', icon: 'group', route: '/clientes' },
  ]);

  notifications = signal([
    { id: 1, title: 'NF-e #4521 autorizada', icon: 'check_circle', type: 'success', time: 'Agora', read: false },
    { id: 2, title: 'Certificado A1 expira em 15 dias', icon: 'warning', type: 'warning', time: '2h atrás', read: false },
    { id: 3, title: 'Novo cliente cadastrado', icon: 'person_add', type: 'info', time: '5h atrás', read: false },
    { id: 4, title: 'Backup concluído', icon: 'cloud_done', type: 'success', time: 'Ontem', read: true },
  ]);

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  quickCreateActions = [
    { label: 'Novo Cliente', description: 'Cadastrar cliente ou empresa', icon: 'person_add', route: '/clientes/novo', color: '#007AFF' },
    { label: 'Nova NF-e', description: 'Emitir nota fiscal eletrônica', icon: 'receipt_long', route: '/fiscal/nfe/nova', color: '#34C759' },
    { label: 'Novo Lançamento', description: 'Lançamento contábil manual', icon: 'edit_note', route: '/contabilidade/lancamentos/novo', color: '#FF9500' },
    { label: 'Nova Tarefa', description: 'Criar tarefa para equipe', icon: 'add_task', route: '/escritorio/tarefas/nova', color: '#5856D6' },
    { label: 'Conta a Pagar', description: 'Registrar conta a pagar', icon: 'money_off', route: '/financeiro/contas-pagar/nova', color: '#FF3B30' },
    { label: 'Conta a Receber', description: 'Registrar conta a receber', icon: 'attach_money', route: '/financeiro/contas-receber/nova', color: '#34C759' },
  ];

  menuSections: MenuSection[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'space_dashboard', route: '/dashboard' },
        { label: 'Empresas', icon: 'apartment', route: '/empresas' },
        { label: 'Clientes', icon: 'group', route: '/clientes' },
        { label: 'Fornecedores', icon: 'local_shipping', route: '/fornecedores' },
        { label: 'Produtos', icon: 'inventory_2', route: '/cadastros/produtos' },
      ],
    },
    {
      title: 'Contabilidade',
      items: [
        {
          label: 'Contabilidade', icon: 'account_balance',
          children: [
            { label: 'Plano de Contas', icon: 'account_tree', route: '/contabilidade/plano-contas' },
            { label: 'Lançamentos', icon: 'edit_note', route: '/contabilidade/lancamentos' },
            { label: 'Balancete', icon: 'balance', route: '/contabilidade/balancete' },
            { label: 'DRE', icon: 'trending_up', route: '/contabilidade/dre' },
            { label: 'Balanço Patrimonial', icon: 'account_balance_wallet', route: '/contabilidade/balanco-patrimonial' },
            { label: 'Centros de Custo', icon: 'hub', route: '/contabilidade/centros-custo' },
            { label: 'Contab. Automática', icon: 'auto_fix_high', route: '/contabilidade/contabilidade-automatica' },
          ],
        },
        {
          label: 'Fiscal', icon: 'receipt_long',
          children: [
            { label: 'NF-e', icon: 'description', route: '/fiscal/nfe' },
            { label: 'NFS-e', icon: 'article', route: '/fiscal/nfse' },
            { label: 'CT-e', icon: 'local_shipping', route: '/fiscal/cte' },
            { label: 'Apurações', icon: 'calculate', route: '/fiscal/apuracoes' },
            { label: 'Guias', icon: 'receipt', route: '/fiscal/guias' },
          ],
        },
        {
          label: 'Financeiro', icon: 'payments',
          children: [
            { label: 'Contas a Pagar', icon: 'money_off', route: '/financeiro/contas-pagar' },
            { label: 'Contas a Receber', icon: 'attach_money', route: '/financeiro/contas-receber' },
            { label: 'Contas Bancárias', icon: 'account_balance', route: '/financeiro/contas-bancarias' },
            { label: 'Conciliação', icon: 'compare_arrows', route: '/financeiro/conciliacao' },
            { label: 'Fluxo de Caixa', icon: 'show_chart', route: '/financeiro/fluxo-caixa' },
          ],
        },
      ],
    },
    {
      title: 'Departamento Pessoal',
      items: [
        {
          label: 'Folha', icon: 'badge',
          children: [
            { label: 'Funcionários', icon: 'person', route: '/folha/funcionarios' },
            { label: 'Holerites', icon: 'receipt', route: '/folha/holerites' },
            { label: 'Férias', icon: 'beach_access', route: '/folha/ferias' },
            { label: 'Rescisão / 13º', icon: 'person_off', route: '/folha/rescisao' },
          ],
        },
        { label: 'eSocial', icon: 'verified_user', route: '/esocial' },
        { label: 'Portal Funcionário', icon: 'badge', route: '/portal-funcionario' },
      ],
    },
    {
      title: 'Obrigações & Tributos',
      items: [
        {
          label: 'SPED', icon: 'folder_special',
          children: [
            { label: 'Obrigações Acessórias', icon: 'checklist', route: '/sped/obrigacoes' },
            { label: 'SPED Fiscal', icon: 'description', route: '/sped/sped-fiscal' },
          ],
        },
        {
          label: 'Tributário', icon: 'gavel',
          children: [
            { label: 'Simples Nacional', icon: 'store', route: '/tributario/simples' },
            { label: 'Lucro Presumido', icon: 'account_balance', route: '/tributario/lucro-presumido' },
            { label: 'Lucro Real', icon: 'analytics', route: '/tributario/lucro-real' },
            { label: 'Split Payment', icon: 'call_split', route: '/tributario/split-payment' },
          ],
        },
        {
          label: 'Patrimônio', icon: 'domain',
          children: [
            { label: 'Bens', icon: 'inventory', route: '/patrimonio/bens' },
            { label: 'Depreciação', icon: 'trending_down', route: '/patrimonio/depreciacao' },
          ],
        },
      ],
    },
    {
      title: 'Gestão',
      items: [
        {
          label: 'Escritório', icon: 'business_center',
          children: [
            { label: 'Tarefas', icon: 'task_alt', route: '/escritorio/tarefas' },
            { label: 'Honorários', icon: 'paid', route: '/escritorio/honorarios' },
          ],
        },
        { label: 'Portal do Cliente', icon: 'storefront', route: '/portal-cliente' },
        { label: 'Cobrança', icon: 'request_quote', route: '/cobranca' },
        { label: 'Site Builder', icon: 'web', route: '/site-builder' },
        { label: 'Relatórios', icon: 'assessment', route: '/relatorios' },
        { label: 'AI Contábil', icon: 'smart_toy', route: '/ai-contabil' },
        { label: 'OCR Documentos', icon: 'document_scanner', route: '/ferramentas/ocr' },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Onboarding', icon: 'rocket_launch', route: '/onboarding' },
        { label: 'Integrações', icon: 'hub', route: '/integracoes' },
        { label: 'Certificados', icon: 'verified', route: '/certificados' },
        { label: 'Auditoria', icon: 'shield', route: '/sistema/auditoria' },
        { label: 'Escritórios', icon: 'business', route: '/sistema/multi-tenancy' },
        { label: 'Configurações', icon: 'settings', route: '/configuracoes' },
      ],
    },
  ];

  // Flattened list for command palette search
  private allCommands = computed(() => {
    const commands: { label: string; icon: string; route: string; section: string }[] = [];
    for (const section of this.menuSections) {
      for (const item of section.items) {
        if (item.children) {
          for (const child of item.children) {
            commands.push({
              label: child.label,
              icon: child.icon,
              route: child.route,
              section: `${section.title} > ${item.label}`,
            });
          }
        } else if (item.route) {
          commands.push({
            label: item.label,
            icon: item.icon,
            route: item.route,
            section: section.title,
          });
        }
      }
    }
    return commands;
  });

  filteredCommands = computed(() => {
    const q = this.commandQuery().toLowerCase().trim();
    if (!q) return this.allCommands().slice(0, 12);
    return this.allCommands().filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.section.toLowerCase().includes(q)
    ).slice(0, 12);
  });

  private keydownHandler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.openCommandPalette();
    }
  };

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public sidebar: SidebarService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    document.addEventListener('keydown', this.keydownHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.keydownHandler);
  }

  openCommandPalette(): void {
    this.commandQuery.set('');
    this.selectedResultIndex.set(0);
    this.commandPaletteOpen.set(true);
    this.notificationsOpen.set(false);
    this.quickCreateOpen.set(false);
    // Focus input after DOM update
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.cmd-palette__input');
      input?.focus();
    }, 50);
  }

  navigateResults(direction: number, event: Event): void {
    event.preventDefault();
    const max = this.filteredCommands().length - 1;
    this.selectedResultIndex.update(i => {
      const next = i + direction;
      if (next < 0) return max;
      if (next > max) return 0;
      return next;
    });
  }

  executeResult(): void {
    const commands = this.filteredCommands();
    const idx = this.selectedResultIndex();
    if (commands[idx]) {
      this.goToRoute(commands[idx].route);
    }
  }

  goToRoute(route: string): void {
    this.commandPaletteOpen.set(false);
    this.router.navigateByUrl(route);
  }

  toggleNotifications(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.notifDropdownRight.set(window.innerWidth - rect.right);
    this.quickCreateOpen.set(false);
    this.notificationsOpen.update(v => !v);
  }

  toggleQuickCreate(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.quickCreateRight.set(window.innerWidth - rect.right);
    this.notificationsOpen.set(false);
    this.quickCreateOpen.update(v => !v);
  }

  markAllRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  toggleGroup(label: string): void {
    this.openGroups.update(set => {
      const next = new Set(set);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  isGroupOpen(label: string): boolean {
    return this.openGroups().has(label);
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  getCurrentSection(): string {
    const url = this.router.url;
    const sectionMap: Record<string, string> = {
      '/contabilidade': 'Contabilidade',
      '/fiscal': 'Fiscal',
      '/financeiro': 'Financeiro',
      '/folha': 'Dept. Pessoal',
      '/esocial': 'Dept. Pessoal',
      '/sped': 'Obrigações',
      '/tributario': 'Tributário',
      '/patrimonio': 'Patrimônio',
      '/escritorio': 'Gestão',
      '/sistema': 'Sistema',
    };
    for (const [prefix, section] of Object.entries(sectionMap)) {
      if (url.startsWith(prefix)) return section;
    }
    return '';
  }

  getCurrentPageTitle(): string {
    const url = this.router.url;
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/empresas': 'Empresas',
      '/clientes': 'Clientes',
      '/fornecedores': 'Fornecedores',
      '/contabilidade/plano-contas': 'Plano de Contas',
      '/contabilidade/lancamentos': 'Lançamentos',
      '/contabilidade/balancete': 'Balancete',
      '/contabilidade/dre': 'DRE',
      '/contabilidade/balanco-patrimonial': 'Balanço Patrimonial',
      '/contabilidade/centros-custo': 'Centros de Custo',
      '/contabilidade/contabilidade-automatica': 'Contabilidade Automática',
      '/fiscal/nfe': 'NF-e',
      '/fiscal/nfse': 'NFS-e',
      '/fiscal/cte': 'CT-e',
      '/fiscal/apuracoes': 'Apurações',
      '/fiscal/guias': 'Guias',
      '/financeiro/contas-pagar': 'Contas a Pagar',
      '/financeiro/contas-receber': 'Contas a Receber',
      '/financeiro/conciliacao': 'Conciliação',
      '/financeiro/fluxo-caixa': 'Fluxo de Caixa',
      '/financeiro/contas-bancarias': 'Contas Bancárias',
      '/folha/funcionarios': 'Funcionários',
      '/folha/holerites': 'Holerites',
      '/folha/ferias': 'Férias',
      '/folha/rescisao': 'Rescisão / 13º',
      '/esocial': 'eSocial',
      '/sped/obrigacoes': 'Obrigações Acessórias',
      '/sped/sped-fiscal': 'SPED Fiscal',
      '/tributario/simples': 'Simples Nacional',
      '/tributario/lucro-presumido': 'Lucro Presumido',
      '/tributario/lucro-real': 'Lucro Real',
      '/tributario/split-payment': 'Split Payment',
      '/patrimonio/bens': 'Bens',
      '/patrimonio/depreciacao': 'Depreciação',
      '/escritorio/tarefas': 'Tarefas',
      '/escritorio/honorarios': 'Honorários',
      '/integracoes': 'Integrações',
      '/certificados': 'Certificados',
      '/relatorios': 'Relatórios',
      '/ai-contabil': 'AI Contábil',
      '/cadastros/produtos': 'Produtos e Serviços',
      '/ferramentas/ocr': 'OCR de Documentos',
      '/sistema/auditoria': 'Auditoria',
      '/sistema/multi-tenancy': 'Escritórios',
      '/configuracoes': 'Configurações',
      '/portal-cliente': 'Portal do Cliente',
      '/cobranca': 'Cobrança',
      '/site-builder': 'Site Builder',
      '/onboarding': 'Onboarding',
      '/portal-funcionario': 'Portal Funcionário',
    };
    return map[url] || 'Dashboard';
  }
}
