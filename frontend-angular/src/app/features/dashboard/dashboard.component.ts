import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';

@Component({
  selector: 'bear-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="dashboard">

      <!-- ═══ Page Header ═══ -->
      <header class="header">
        <div class="header__left">
          <h1 class="header__greeting">{{ getGreeting() }}, {{ getFirstName() }}</h1>
          <p class="header__context">
            <span class="header__dot"></span>
            Visão geral do escritório &middot; {{ getCurrentDateFormatted() }}
          </p>
        </div>
        <div class="header__actions">
          <button class="header-btn header-btn--ghost" matTooltip="Atualizar dados" (click)="ngOnInit()">
            <span class="material-symbols-rounded">refresh</span>
          </button>
          <button class="header-btn header-btn--outline">
            <span class="material-symbols-rounded">calendar_today</span>
            {{ getCurrentMonth() }}
          </button>
          <button class="header-btn header-btn--primary">
            <span class="material-symbols-rounded">download</span>
            Exportar
          </button>
        </div>
      </header>

      <!-- ═══ KPI Strip ═══ -->
      <section class="kpi-strip">
        @for (kpi of kpiCards; track kpi.title; let i = $index) {
          <a [routerLink]="kpi.route"
             class="kpi-card"
             [class]="'kpi-card kpi-card--' + kpi.theme"
             [style.animation-delay]="(i * 80) + 'ms'">
            <div class="kpi-card__top">
              <div class="kpi-card__icon-wrap" [style.background]="kpi.gradientBg">
                <span class="material-symbols-rounded" [style.color]="kpi.color">{{ kpi.icon }}</span>
              </div>
              <span class="material-symbols-rounded kpi-card__arrow">north_east</span>
            </div>
            <div class="kpi-card__value">{{ kpi.value }}</div>
            <div class="kpi-card__title">{{ kpi.title }}</div>
            @if (kpi.change) {
              <div class="kpi-card__trend" [class.kpi-card__trend--up]="kpi.changeUp"
                   [class.kpi-card__trend--down]="!kpi.changeUp">
                <span class="material-symbols-rounded">
                  {{ kpi.changeUp ? 'trending_up' : 'trending_down' }}
                </span>
                <span>{{ kpi.change }}</span>
                <!-- sparkline decoration -->
                <svg class="kpi-card__spark" viewBox="0 0 40 16" fill="none">
                  @if (kpi.changeUp) {
                    <polyline points="0,14 8,10 16,12 24,6 32,8 40,2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  } @else {
                    <polyline points="0,2 8,6 16,4 24,10 32,8 40,14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  }
                </svg>
              </div>
            }
          </a>
        }
      </section>

      <!-- ═══ Financial Overview + Alerts ═══ -->
      <section class="grid-main">
        <!-- Financial Cards -->
        <div class="finance-row">
          <div class="finance-card finance-card--green">
            <div class="finance-card__pattern"></div>
            <div class="finance-card__content">
              <div class="finance-card__head">
                <div class="finance-card__icon-wrap">
                  <span class="material-symbols-rounded">trending_up</span>
                </div>
                <span class="finance-card__badge finance-card__badge--green">
                  <span class="material-symbols-rounded">arrow_upward</span> +12.5%
                </span>
              </div>
              <span class="finance-card__label">Receita Bruta</span>
              <span class="finance-card__value">{{ formatCurrency(dashboard()?.receitaBruta || 0) }}</span>
            </div>
          </div>

          <div class="finance-card finance-card--rose">
            <div class="finance-card__pattern"></div>
            <div class="finance-card__content">
              <div class="finance-card__head">
                <div class="finance-card__icon-wrap">
                  <span class="material-symbols-rounded">trending_down</span>
                </div>
                <span class="finance-card__badge finance-card__badge--rose">
                  <span class="material-symbols-rounded">arrow_upward</span> +3.2%
                </span>
              </div>
              <span class="finance-card__label">Despesas</span>
              <span class="finance-card__value">{{ formatCurrency(dashboard()?.despesasTotais || 0) }}</span>
            </div>
          </div>

          <div class="finance-card finance-card--indigo">
            <div class="finance-card__pattern"></div>
            <div class="finance-card__content">
              <div class="finance-card__head">
                <div class="finance-card__icon-wrap">
                  <span class="material-symbols-rounded">account_balance_wallet</span>
                </div>
                <span class="finance-card__badge finance-card__badge--indigo">
                  <span class="material-symbols-rounded">arrow_upward</span> +8.7%
                </span>
              </div>
              <span class="finance-card__label">Lucro Líquido</span>
              <span class="finance-card__value">{{ formatCurrency(dashboard()?.lucroLiquido || 0) }}</span>
            </div>
          </div>
        </div>

        <!-- Alerts Panel -->
        <div class="alerts-panel">
          <div class="alerts-panel__header">
            <h3 class="alerts-panel__title">
              <span class="material-symbols-rounded">notifications_active</span>
              Alertas
            </h3>
            <div class="alerts-panel__header-right">
              <span class="alerts-panel__total-badge">{{ getTotalAlerts() }}</span>
              <a routerLink="/alertas" class="alerts-panel__link">Ver tudo</a>
            </div>
          </div>
          <div class="alerts-panel__list">
            @for (alert of alertItems(); track alert.label) {
              <a [routerLink]="alert.route" class="alert-row" [class]="'alert-row alert-row--' + alert.type">
                <div class="alert-row__border"></div>
                <div class="alert-row__body">
                  <span class="material-symbols-rounded alert-row__icon">{{ alert.icon }}</span>
                  <span class="alert-row__label">{{ alert.label }}</span>
                  <span class="alert-row__count" [class]="'alert-row__count--' + alert.type">{{ alert.count }}</span>
                </div>
              </a>
            }
          </div>
        </div>
      </section>

      <!-- ═══ Quick Access + Operational KPIs ═══ -->
      <section class="grid-secondary">
        <!-- Quick Access -->
        <div class="section-card">
          <div class="section-card__header">
            <h3 class="section-card__title">
              <span class="material-symbols-rounded">grid_view</span>
              Acesso Rápido
            </h3>
          </div>
          <div class="quick-grid">
            @for (atalho of atalhos; track atalho.label; let i = $index) {
              <a [routerLink]="atalho.route" class="quick-item" [class]="'quick-item quick-item--' + atalho.theme">
                <div class="quick-item__icon-wrap">
                  <span class="material-symbols-rounded">{{ atalho.icon }}</span>
                </div>
                <span class="quick-item__label">{{ atalho.label }}</span>
              </a>
            }
          </div>
        </div>

        <!-- Operational KPIs -->
        <div class="ops-grid">
          <div class="ops-card">
            <div class="ops-card__ring ops-card__ring--blue">
              <svg viewBox="0 0 36 36">
                <path class="ops-card__ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="ops-card__ring-fill" stroke-dasharray="75, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              </svg>
              <span class="material-symbols-rounded ops-card__ring-icon">badge</span>
            </div>
            <span class="ops-card__value">{{ dashboard()?.totalFuncionarios || 0 }}</span>
            <span class="ops-card__label">Funcionários</span>
          </div>

          <div class="ops-card">
            <div class="ops-card__ring ops-card__ring--green">
              <svg viewBox="0 0 36 36">
                <path class="ops-card__ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="ops-card__ring-fill" stroke-dasharray="60, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              </svg>
              <span class="material-symbols-rounded ops-card__ring-icon">account_balance</span>
            </div>
            <span class="ops-card__value ops-card__value--sm">{{ formatCurrency(dashboard()?.saldoBancario || 0) }}</span>
            <span class="ops-card__label">Saldo Bancário</span>
          </div>

          <div class="ops-card">
            <div class="ops-card__ring ops-card__ring--amber">
              <svg viewBox="0 0 36 36">
                <path class="ops-card__ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="ops-card__ring-fill" stroke-dasharray="45, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              </svg>
              <span class="material-symbols-rounded ops-card__ring-icon">gavel</span>
            </div>
            <span class="ops-card__value ops-card__value--sm">{{ formatCurrency(dashboard()?.impostosMes || 0) }}</span>
            <span class="ops-card__label">Impostos (Mês)</span>
          </div>

          <div class="ops-card">
            <div class="ops-card__ring ops-card__ring--purple">
              <svg viewBox="0 0 36 36">
                <path class="ops-card__ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="ops-card__ring-fill" [attr.stroke-dasharray]="(dashboard()?.margemLucro || 0) + ', 100'" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              </svg>
              <span class="material-symbols-rounded ops-card__ring-icon">analytics</span>
            </div>
            <span class="ops-card__value">{{ dashboard()?.margemLucro || 0 }}%</span>
            <span class="ops-card__label">Margem Lucro</span>
          </div>
        </div>
      </section>

      <!-- ═══ Activity Timeline ═══ -->
      <section class="timeline-section">
        <div class="section-card">
          <div class="section-card__header">
            <h3 class="section-card__title">
              <span class="material-symbols-rounded">history</span>
              Atividade Recente
            </h3>
            <a routerLink="/atividades" class="section-card__link">Ver histórico</a>
          </div>
          <div class="timeline">
            @for (event of activityTimeline; track event.id; let last = $last) {
              <div class="timeline__item" [class.timeline__item--last]="last">
                <div class="timeline__line"></div>
                <div class="timeline__dot" [class]="'timeline__dot--' + event.type"></div>
                <div class="timeline__content">
                  <div class="timeline__avatar" [class]="'timeline__avatar--' + event.type">
                    <span class="material-symbols-rounded">{{ event.icon }}</span>
                  </div>
                  <div class="timeline__body">
                    <p class="timeline__desc">
                      <strong>{{ event.user }}</strong> {{ event.action }}
                    </p>
                    <span class="timeline__time">{{ event.time }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

    </div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  dashboard = signal<any>(null);
  alertItems = signal([
    { label: 'Contas a Pagar Vencidas', count: 0, icon: 'money_off', type: 'error', route: '/financeiro/contas-pagar' },
    { label: 'Contas a Receber Vencidas', count: 0, icon: 'attach_money', type: 'warning', route: '/financeiro/contas-receber' },
    { label: 'Certificados Próx. Vencimento', count: 0, icon: 'verified', type: 'info', route: '/certificados' },
    { label: 'Tarefas Atrasadas', count: 0, icon: 'task_alt', type: 'purple', route: '/escritorio/tarefas' },
  ]);

  kpiCards = [
    { title: 'Empresas Ativas', value: '12', icon: 'apartment', color: '#4f46e5', gradientBg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', route: '/empresas', change: '+2 este mês', changeUp: true, theme: 'indigo' },
    { title: 'NF-e Emitidas', value: '847', icon: 'receipt_long', color: '#059669', gradientBg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', route: '/fiscal/nfe', change: '+18.3%', changeUp: true, theme: 'green' },
    { title: 'Obrigações Pendentes', value: '5', icon: 'pending_actions', color: '#d97706', gradientBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', route: '/sped/obrigacoes', change: '-3 vs mês ant.', changeUp: true, theme: 'amber' },
    { title: 'Folha (Mês)', value: 'R$ 85k', icon: 'badge', color: '#7c3aed', gradientBg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', route: '/folha/holerites', change: '+2.1%', changeUp: false, theme: 'purple' },
    { title: 'Honorários Abertos', value: 'R$ 32k', icon: 'paid', color: '#0d9488', gradientBg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', route: '/escritorio/honorarios', change: '4 pendentes', changeUp: true, theme: 'teal' },
  ];

  atalhos = [
    { label: 'Lançamento', icon: 'edit_note', route: '/contabilidade/lancamentos', theme: 'indigo' },
    { label: 'NF-e', icon: 'receipt_long', route: '/fiscal/nfe', theme: 'green' },
    { label: 'Contas Pagar', icon: 'money_off', route: '/financeiro/contas-pagar', theme: 'red' },
    { label: 'Contas Receber', icon: 'attach_money', route: '/financeiro/contas-receber', theme: 'emerald' },
    { label: 'Folha', icon: 'badge', route: '/folha/holerites', theme: 'purple' },
    { label: 'Simples', icon: 'store', route: '/tributario/simples', theme: 'amber' },
    { label: 'Simulador', icon: 'calculate', route: '/tributario/simulador', theme: 'blue' },
    { label: 'Robô NF-e', icon: 'smart_toy', route: '/fiscal/robo-nfe', theme: 'teal' },
    { label: 'Portal Cliente', icon: 'group', route: '/portal-cliente', theme: 'rose' },
  ];

  activityTimeline = [
    { id: 1, user: 'Ana Silva', action: 'emitiu NF-e #4521 para Empresa ABC Ltda', icon: 'receipt_long', type: 'fiscal', time: 'Há 5 min' },
    { id: 2, user: 'Carlos Souza', action: 'registrou pagamento de R$ 2.450,00', icon: 'payments', type: 'finance', time: 'Há 12 min' },
    { id: 3, user: 'Maria Santos', action: 'concluiu obrigação SPED Fiscal - Mar/2026', icon: 'task_alt', type: 'task', time: 'Há 34 min' },
    { id: 4, user: 'João Lima', action: 'importou extrato bancário do Banco do Brasil', icon: 'upload_file', type: 'import', time: 'Há 1h' },
    { id: 5, user: 'Sistema', action: 'sincronizou 23 documentos via Robô NF-e', icon: 'sync', type: 'system', time: 'Há 2h' },
  ];

  constructor(public authService: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/relatorios/dashboard`).subscribe({
      next: (res) => {
        this.dashboard.set(res);
        this.alertItems.set([
          { label: 'Contas a Pagar Vencidas', count: res.contasPagarVencidas || 0, icon: 'money_off', type: 'error', route: '/financeiro/contas-pagar' },
          { label: 'Contas a Receber Vencidas', count: res.contasReceberVencidas || 0, icon: 'attach_money', type: 'warning', route: '/financeiro/contas-receber' },
          { label: 'Certificados Próx. Vencimento', count: 0, icon: 'verified', type: 'info', route: '/certificados' },
          { label: 'Tarefas Atrasadas', count: 0, icon: 'task_alt', type: 'purple', route: '/escritorio/tarefas' },
        ]);
      },
    });
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  getFirstName(): string {
    return this.authService.user()?.nome?.split(' ')[0] || 'Usuário';
  }

  getCurrentMonth(): string {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  getCurrentDateFormatted(): string {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getTotalAlerts(): number {
    return this.alertItems().reduce((sum, a) => sum + a.count, 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
}
