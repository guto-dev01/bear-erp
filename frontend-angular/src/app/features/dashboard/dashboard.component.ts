import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { AppwriteService } from '@core/services/appwrite.service';

interface DashboardMetrics {
  receitaBruta: number;
  despesasTotais: number;
  lucroLiquido: number;
  margemLucro: number;
  totalFuncionarios: number;
  saldoBancario: number;
  impostosMes: number;
  contasPagarVencidas: number;
  contasReceberVencidas: number;
}

interface ContaPagar { valor: number; valorPago?: number; dataEmissao: string; dataVencimento: string; status: string; }
interface ContaReceber { valor: number; valorRecebido?: number; dataEmissao: string; dataVencimento: string; status: string; }
interface Funcionario { status: string; }
interface ContaBancaria { saldoAtual?: number; }
interface ApuracaoFiscal { competencia: string; valorRecolher?: number; }
interface Empresa { status: string; $createdAt?: string; }
interface NotaFiscal { tipo: string; dataEmissao?: string; }
interface Obrigacao { status: string; }
interface Certificado { dataValidade: string; status: string; }
interface Tarefa { status: string; dataVencimento?: string; }
interface Holerite { competencia: string; valorLiquido?: number; }
interface Honorario { valor: number; status: string; }
interface AuditLog { $id: string; usuario: string; acao: string; modulo: string; descricao: string; timestamp?: string; $createdAt: string; }
interface TimelineEvent { id: string; user: string; action: string; icon: string; type: string; time: string; }

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
              <div class="kpi-card__icon-wrap" [class]="'kpi-card__icon-wrap kpi-card__icon-wrap--' + kpi.theme">
                <span class="material-symbols-rounded">{{ kpi.icon }}</span>
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
        <!-- Desempenho Financeiro -->
        <div class="finance-panel">
          <div class="finance-panel__header">
            <h3 class="finance-panel__title">Desempenho Financeiro</h3>
            <button class="finance-panel__period" type="button">
              Este mês
              <span class="material-symbols-rounded">expand_more</span>
            </button>
          </div>

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

          <!-- Line chart -->
          <div class="finance-chart">
            <div class="finance-chart__legend">
              <span class="finance-chart__legend-item"><i style="background:var(--green)"></i>Receita</span>
              <span class="finance-chart__legend-item"><i style="background:var(--brand)"></i>Despesa</span>
            </div>
            <svg class="finance-chart__svg" viewBox="0 0 640 200" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="recFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--green)" stop-opacity="0.22"/>
                  <stop offset="100%" stop-color="var(--green)" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="despFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--brand)" stop-opacity="0.16"/>
                  <stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <line class="finance-chart__grid" x1="0" y1="20" x2="640" y2="20"/>
              <line class="finance-chart__grid" x1="0" y1="70" x2="640" y2="70"/>
              <line class="finance-chart__grid" x1="0" y1="120" x2="640" y2="120"/>
              <line class="finance-chart__grid" x1="0" y1="170" x2="640" y2="170"/>
              <polygon fill="url(#recFill)" points="0,120 53,108 106,112 160,92 213,98 266,78 320,62 373,72 426,58 480,46 533,40 586,50 640,36 640,170 0,170"/>
              <polyline class="finance-chart__line finance-chart__line--rec" points="0,120 53,108 106,112 160,92 213,98 266,78 320,62 373,72 426,58 480,46 533,40 586,50 640,36"/>
              <polygon fill="url(#despFill)" points="0,150 53,146 106,148 160,138 213,142 266,134 320,128 373,132 426,126 480,122 533,124 586,118 640,120 640,170 0,170"/>
              <polyline class="finance-chart__line finance-chart__line--desp" points="0,150 53,146 106,148 160,138 213,142 266,134 320,128 373,132 426,126 480,122 533,124 586,118 640,120"/>
            </svg>
            <div class="finance-chart__axis">
              <span>01 Jun</span><span>08 Jun</span><span>15 Jun</span><span>22 Jun</span><span>30 Jun</span>
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
            @for (event of activityTimeline(); track event.id; let last = $last) {
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
            } @empty {
              <p style="padding:1rem 0;color:var(--text-tertiary);font-size:0.875rem;">Nenhuma atividade recente.</p>
            }
          </div>
        </div>
      </section>

    </div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  dashboard = signal<DashboardMetrics | null>(null);
  alertItems = signal([
    { label: 'Contas a Pagar Vencidas', count: 0, icon: 'money_off', type: 'error', route: '/financeiro/contas-pagar' },
    { label: 'Contas a Receber Vencidas', count: 0, icon: 'attach_money', type: 'warning', route: '/financeiro/contas-receber' },
    { label: 'Certificados Próx. Vencimento', count: 0, icon: 'verified', type: 'info', route: '/certificados' },
    { label: 'Tarefas Atrasadas', count: 0, icon: 'task_alt', type: 'purple', route: '/escritorio/tarefas' },
  ]);

  kpiCards = [
    { title: 'Empresas Ativas', value: '—', icon: 'apartment', route: '/empresas', change: '', changeUp: true, theme: 'indigo' },
    { title: 'NF-e Emitidas', value: '—', icon: 'receipt_long', route: '/fiscal/nfe', change: '', changeUp: true, theme: 'green' },
    { title: 'Obrigações Pendentes', value: '—', icon: 'pending_actions', route: '/sped/obrigacoes', change: '', changeUp: true, theme: 'amber' },
    { title: 'Folha (Mês)', value: '—', icon: 'badge', route: '/folha/holerites', change: '', changeUp: false, theme: 'purple' },
    { title: 'Honorários Abertos', value: '—', icon: 'paid', route: '/escritorio/honorarios', change: '', changeUp: true, theme: 'teal' },
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

  activityTimeline = signal<TimelineEvent[]>([]);

  constructor(public authService: AuthService, private appwrite: AppwriteService) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    const Q = this.appwrite.query;
    const list = [Q.limit(100), Q.orderDesc('$createdAt')];

    forkJoin({
      empresas: this.appwrite.listDocuments<Empresa>('empresas', list),
      contasPagar: this.appwrite.listDocuments<ContaPagar>('contas_pagar', list),
      contasReceber: this.appwrite.listDocuments<ContaReceber>('contas_receber', list),
      funcionarios: this.appwrite.listDocuments<Funcionario>('funcionarios', list),
      contasBancarias: this.appwrite.listDocuments<ContaBancaria>('contas_bancarias', list),
      apuracoes: this.appwrite.listDocuments<ApuracaoFiscal>('apuracoes_fiscais', list),
      notasFiscais: this.appwrite.listDocuments<NotaFiscal>('notas_fiscais', list),
      obrigacoes: this.appwrite.listDocuments<Obrigacao>('obrigacoes', list),
      certificados: this.appwrite.listDocuments<Certificado>('certificados', list),
      tarefas: this.appwrite.listDocuments<Tarefa>('tarefas', list),
      holerites: this.appwrite.listDocuments<Holerite>('holerites', list),
      honorarios: this.appwrite.listDocuments<Honorario>('honorarios', list),
    }).subscribe({
      next: (d) => {
        const comp = this.currentCompetencia();
        const hoje = new Date().toISOString().slice(0, 10);

        // ── Financeiro: receita/despesa da competência atual (mês corrente) ──
        const receitaBruta = d.contasReceber
          .filter(c => (c.dataEmissao || '').slice(0, 7) === comp)
          .reduce((s, c) => s + (c.valor || 0), 0);
        const despesasTotais = d.contasPagar
          .filter(c => (c.dataEmissao || '').slice(0, 7) === comp)
          .reduce((s, c) => s + (c.valor || 0), 0);
        const lucroLiquido = receitaBruta - despesasTotais;
        const margemLucro = receitaBruta > 0
          ? Math.round((lucroLiquido / receitaBruta) * 100)
          : 0;

        // ── Operacional ──
        const totalFuncionarios = d.funcionarios.filter(f => (f.status || 'ATIVO') === 'ATIVO').length;
        const saldoBancario = d.contasBancarias.reduce((s, c) => s + (c.saldoAtual || 0), 0);
        const impostosMes = d.apuracoes
          .filter(a => a.competencia === comp)
          .reduce((s, a) => s + (a.valorRecolher || 0), 0);

        // ── Alertas ──
        const contasPagarVencidas = d.contasPagar
          .filter(c => !this.isPago(c.status) && (c.dataVencimento || '') < hoje).length;
        const contasReceberVencidas = d.contasReceber
          .filter(c => !this.isRecebido(c.status) && (c.dataVencimento || '') < hoje).length;
        const certificadosVencendo = d.certificados
          .filter(c => this.diasAte(c.dataValidade) >= 0 && this.diasAte(c.dataValidade) <= 30).length;
        const tarefasAtrasadas = d.tarefas
          .filter(t => (t.status || '') !== 'CONCLUIDA' && (t.dataVencimento || '') && (t.dataVencimento as string) < hoje).length;

        const metrics: DashboardMetrics = {
          receitaBruta, despesasTotais, lucroLiquido, margemLucro,
          totalFuncionarios, saldoBancario, impostosMes,
          contasPagarVencidas, contasReceberVencidas,
        };
        this.dashboard.set(metrics);

        this.alertItems.set([
          { label: 'Contas a Pagar Vencidas', count: contasPagarVencidas, icon: 'money_off', type: 'error', route: '/financeiro/contas-pagar' },
          { label: 'Contas a Receber Vencidas', count: contasReceberVencidas, icon: 'attach_money', type: 'warning', route: '/financeiro/contas-receber' },
          { label: 'Certificados Próx. Vencimento', count: certificadosVencendo, icon: 'verified', type: 'info', route: '/certificados' },
          { label: 'Tarefas Atrasadas', count: tarefasAtrasadas, icon: 'task_alt', type: 'purple', route: '/escritorio/tarefas' },
        ]);

        // ── KPI strip: valores e tendências reais (mês corrente vs anterior) ──
        const prevComp = this.previousCompetencia();
        const isNfe = (n: NotaFiscal) => (n.tipo || '').toUpperCase() === 'NFE';

        const empresasAtivas = d.empresas.filter(e => (e.status || 'ATIVA') === 'ATIVA').length;
        const empresasNovas = d.empresas.filter(e => (e.$createdAt || '').slice(0, 7) === comp).length;
        const nfeEmitidas = d.notasFiscais.filter(isNfe).length || d.notasFiscais.length;
        const nfeAtual = d.notasFiscais.filter(n => isNfe(n) && (n.dataEmissao || '').slice(0, 7) === comp).length;
        const nfePrev = d.notasFiscais.filter(n => isNfe(n) && (n.dataEmissao || '').slice(0, 7) === prevComp).length;
        const obrigacoesPendentes = d.obrigacoes.filter(o => (o.status || '') !== 'ENTREGUE').length;
        const folhaMes = d.holerites.filter(h => h.competencia === comp).reduce((s, h) => s + (h.valorLiquido || 0), 0);
        const folhaPrev = d.holerites.filter(h => h.competencia === prevComp).reduce((s, h) => s + (h.valorLiquido || 0), 0);
        const honorariosAbertos = d.honorarios.filter(h => !this.isPago(h.status)).reduce((s, h) => s + (h.valor || 0), 0);
        const honorariosPendentes = d.honorarios.filter(h => !this.isPago(h.status)).length;

        this.kpiCards[0] = { ...this.kpiCards[0], value: String(empresasAtivas), ...this.trendNovos(empresasNovas) };
        this.kpiCards[1] = { ...this.kpiCards[1], value: String(nfeEmitidas), ...this.trendPct(nfeAtual, nfePrev) };
        this.kpiCards[2] = { ...this.kpiCards[2], value: String(obrigacoesPendentes), change: '', changeUp: true };
        this.kpiCards[3] = { ...this.kpiCards[3], value: this.formatCurrency(folhaMes), ...this.trendPct(folhaMes, folhaPrev) };
        this.kpiCards[4] = { ...this.kpiCards[4], value: this.formatCurrency(honorariosAbertos), change: honorariosPendentes ? `${honorariosPendentes} pendentes` : '', changeUp: false };
      },
    });

    this.loadAtividades();
  }

  private currentCompetencia(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private previousCompetencia(): string {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /** Variação percentual mês a mês (vazio quando não há base de comparação). */
  private trendPct(atual: number, anterior: number): { change: string; changeUp: boolean } {
    if (!anterior) return { change: '', changeUp: true };
    const p = Math.round(((atual - anterior) / anterior) * 100);
    return { change: `${p >= 0 ? '+' : ''}${p}%`, changeUp: p >= 0 };
  }

  private trendNovos(n: number): { change: string; changeUp: boolean } {
    return { change: n > 0 ? `+${n} este mês` : '', changeUp: true };
  }

  /** Atividade recente real, a partir da trilha de auditoria (audit_logs). */
  private loadAtividades() {
    const Q = this.appwrite.query;
    const tenant = this.authService.tenantId() || 'default';
    this.appwrite.listDocuments<AuditLog>('audit_logs', [
      Q.equal('tenantId', tenant), Q.limit(8), Q.orderDesc('$createdAt'),
    ]).subscribe({
      next: (logs) => this.activityTimeline.set(logs.map(a => ({
        id: a.$id,
        user: a.usuario || 'Sistema',
        action: a.descricao || a.acao || '',
        icon: this.auditIcon(a.acao),
        type: this.auditType(a.modulo),
        time: this.getRelativeTime(new Date(a.timestamp || a.$createdAt)),
      }))),
      error: () => this.activityTimeline.set([]),
    });
  }

  private auditIcon(acao?: string): string {
    const m: Record<string, string> = {
      CRIAR: 'add_circle', EDITAR: 'edit', EXCLUIR: 'delete',
      LOGIN: 'login', LOGOUT: 'logout', EXPORTAR: 'download',
    };
    return m[(acao || '').toUpperCase()] || 'sync';
  }

  private auditType(modulo?: string): string {
    const m: Record<string, string> = {
      FISCAL: 'fiscal', FINANCEIRO: 'finance', CONTABILIDADE: 'finance',
      FOLHA: 'task', SISTEMA: 'system',
    };
    return m[(modulo || '').toUpperCase()] || 'system';
  }

  private getRelativeTime(ts: Date): string {
    const diff = Date.now() - ts.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `Há ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Há ${hrs}h`;
    return `Há ${Math.floor(hrs / 24)}d`;
  }

  private isPago(status?: string): boolean {
    return ['PAGO', 'PAGA', 'QUITADO', 'QUITADA'].includes((status || '').toUpperCase());
  }

  private isRecebido(status?: string): boolean {
    return ['RECEBIDO', 'RECEBIDA', 'PAGO', 'PAGA', 'QUITADO', 'QUITADA'].includes((status || '').toUpperCase());
  }

  private diasAte(data?: string): number {
    if (!data) return Number.NaN;
    const alvo = new Date(data + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
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
