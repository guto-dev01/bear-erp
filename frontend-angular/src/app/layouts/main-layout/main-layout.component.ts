import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '@core/services/theme.service';
import { SidebarService } from '@core/services/sidebar.service';
import { EmpresaSelectorComponent } from '@core/components/empresa-selector.component';
import { AppSidebarComponent } from '../sidebar/app-sidebar.component';
import { SIDEBAR_NAV, flattenNav } from '../sidebar/sidebar-nav';

@Component({
  selector: 'bear-main-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatTooltipModule, FormsModule,
    EmpresaSelectorComponent, AppSidebarComponent,
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
          <div class="cmd-palette__hint"><kbd>↑↓</kbd> navegar</div>
          <div class="cmd-palette__hint"><kbd>↵</kbd> abrir</div>
          <div class="cmd-palette__hint"><kbd>esc</kbd> fechar</div>
        </div>
      </div>
    }

    <!-- ═══ Notification Dropdown ═══ -->
    @if (notificationsOpen()) {
      <div class="notif-backdrop" (click)="notificationsOpen.set(false)"></div>
      <div class="notif-dropdown" [style.right.px]="notifDropdownRight()">
        <div class="notif-dropdown__header">
          <span class="text-sm font-semibold text-text-primary">Notificações</span>
          @if (notifications().length > 0) {
            <button class="notif-dropdown__mark-all" (click)="markAllRead()">Marcar todas lidas</button>
          }
        </div>
        <div class="notif-dropdown__body">
          @if (notifications().length === 0) {
            <div class="flex flex-col items-center justify-center text-center py-8 px-4 gap-1.5">
              <span class="material-symbols-rounded text-3xl text-text-tertiary">notifications_off</span>
              <p class="text-sm font-medium text-text-secondary">Nenhuma notificação</p>
              <p class="text-xs text-text-tertiary">Você está em dia. Novos avisos aparecerão aqui.</p>
            </div>
          } @else {
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
          }
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

    <!-- ═══ Sidebar (fixa + drawer) ═══ -->
    <bear-app-sidebar (search)="openCommandPalette()"></bear-app-sidebar>

    <!-- ═══ Main content area ═══ -->
    <div class="main-content" [style.margin-left]="sidebar.width()">
      <!-- Toolbar -->
      <header class="toolbar">
        <div class="toolbar__left">
          <button class="toolbar__toggle" (click)="sidebar.primaryToggle()"
                  [attr.aria-label]="sidebar.usesDrawer() ? 'Abrir menu' : 'Alternar menu'"
                  [attr.aria-expanded]="sidebar.usesDrawer() ? sidebar.mobileOpen() : null"
                  matTooltip="Menu">
            <span class="material-symbols-rounded">{{ toggleIcon() }}</span>
          </button>

          <nav class="toolbar__breadcrumb">
            <a class="toolbar__breadcrumb-item toolbar__breadcrumb-item--root" routerLink="/dashboard" aria-label="Início">
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
          <bear-empresa-selector></bear-empresa-selector>

          <button class="toolbar__action toolbar__action--create" #quickCreateBtn
                  matTooltip="Criar novo" aria-label="Criar novo"
                  (click)="toggleQuickCreate($event)">
            <span class="material-symbols-rounded">add</span>
          </button>

          <button class="toolbar__action" #notifBtn
                  matTooltip="Notificações" aria-label="Notificações"
                  (click)="toggleNotifications($event)">
            <span class="material-symbols-rounded">notifications</span>
            @if (unreadCount() > 0) {
              <span class="toolbar__badge">{{ unreadCount() }}</span>
            }
          </button>

          <button class="toolbar__action toolbar__action--theme" (click)="themeService.toggle()"
                  [matTooltip]="themeService.label()" aria-label="Alternar tema">
            <span class="material-symbols-rounded toolbar__theme-icon"
                  [class.toolbar__theme-icon--dark]="themeService.isDark()">
              {{ themeService.icon() }}
            </span>
          </button>

          <a class="toolbar__action" routerLink="/configuracoes"
             matTooltip="Configurações" aria-label="Configurações">
            <span class="material-symbols-rounded">settings</span>
          </a>
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
      <button class="tab-bar__item" (click)="sidebar.openMobile()" aria-label="Abrir menu completo">
        <span class="material-symbols-rounded">menu</span>
        <span>Menu</span>
      </button>
    </nav>
  `,
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  commandPaletteOpen = signal(false);
  commandQuery = signal('');
  selectedResultIndex = signal(0);
  notificationsOpen = signal(false);
  quickCreateOpen = signal(false);
  notifDropdownRight = signal(16);
  quickCreateRight = signal(16);

  // Sem fonte real de notificações wired no frontend → lista vazia (nada de dados
  // fictícios). Quando houver um feed real, basta popular este signal.
  notifications = signal<{ id: number; title: string; icon: string; type: string; time: string; read: boolean }[]>([]);

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  quickCreateActions = [
    { label: 'Novo Cliente', description: 'Cadastrar cliente ou empresa', icon: 'person_add', route: '/clientes', color: '#0A84FF' },
    { label: 'Nova NF-e', description: 'Emitir nota fiscal eletrônica', icon: 'receipt_long', route: '/fiscal/nfe', color: '#30D158' },
    { label: 'Novo Lançamento', description: 'Lançamento contábil manual', icon: 'edit_note', route: '/contabilidade/lancamentos', color: '#FF9F0A' },
    { label: 'Nova Tarefa', description: 'Criar tarefa para equipe', icon: 'add_task', route: '/escritorio/tarefas', color: '#BF5AF2' },
    { label: 'Conta a Pagar', description: 'Registrar conta a pagar', icon: 'money_off', route: '/financeiro/contas-pagar', color: '#FF453A' },
    { label: 'Conta a Receber', description: 'Registrar conta a receber', icon: 'attach_money', route: '/financeiro/contas-receber', color: '#30D158' },
  ];

  /** Itens navegáveis para a paleta ⌘K, derivados da mesma config da sidebar. */
  private readonly commands = flattenNav(SIDEBAR_NAV);

  filteredCommands = computed(() => {
    const q = this.commandQuery().toLowerCase().trim();
    if (!q) return this.commands.slice(0, 12);
    return this.commands
      .filter(c => c.label.toLowerCase().includes(q) || c.section.toLowerCase().includes(q))
      .slice(0, 12);
  });

  private keydownHandler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.openCommandPalette();
    }
  };

  constructor(
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

  toggleIcon(): string {
    if (this.sidebar.usesDrawer()) return this.sidebar.mobileOpen() ? 'menu_open' : 'menu';
    return this.sidebar.collapsed() ? 'menu' : 'menu_open';
  }

  openCommandPalette(): void {
    this.commandQuery.set('');
    this.selectedResultIndex.set(0);
    this.commandPaletteOpen.set(true);
    this.notificationsOpen.set(false);
    this.quickCreateOpen.set(false);
    setTimeout(() => document.querySelector<HTMLInputElement>('.cmd-palette__input')?.focus(), 50);
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
    if (commands[idx]) this.goToRoute(commands[idx].route);
  }

  goToRoute(route: string): void {
    this.commandPaletteOpen.set(false);
    this.router.navigateByUrl(route);
  }

  toggleNotifications(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.notifDropdownRight.set(window.innerWidth - rect.right);
    this.quickCreateOpen.set(false);
    this.notificationsOpen.update(v => !v);
  }

  toggleQuickCreate(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.quickCreateRight.set(window.innerWidth - rect.right);
    this.notificationsOpen.set(false);
    this.quickCreateOpen.update(v => !v);
  }

  markAllRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
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
    const url = this.router.url.split('?')[0].split('#')[0];
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
      '/contabilidade/teste-bear': 'Teste Bear',
      '/fiscal/importar-nfe': 'Importar NF-e',
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
    };
    return map[url] || 'Dashboard';
  }
}
