import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';
import { AppwriteService } from '@core/services/appwrite.service';

import { MetricCardComponent } from './components/metric-card.component';
import { AlertPanelComponent } from './components/alert-panel.component';
import { FinancePerformanceComponent } from './components/finance-performance.component';
import { CashFlowCardComponent } from './components/cash-flow-card.component';
import { TopCompaniesCardComponent } from './components/top-companies-card.component';
import { RecentActivitiesCardComponent } from './components/recent-activities-card.component';
import {
  ActivityItem, AlertItem, CashFlow, FinanceSummary, MetricCardData, Periodo, TopCompany, Trend,
} from './dashboard.types';

// ── Schema (campos usados; o Appwrite devolve o documento completo) ──────────
interface Empresa { $id: string; status?: string; razaoSocial?: string; nomeFantasia?: string; $createdAt?: string; }
interface ContaPagar { valor: number; valorPago?: number; dataEmissao?: string; dataVencimento?: string; dataPagamento?: string; status?: string; }
interface ContaReceber { valor: number; valorRecebido?: number; dataEmissao?: string; dataVencimento?: string; dataRecebimento?: string; status?: string; empresaId?: string; }
interface Funcionario { status?: string; }
interface ContaBancaria { saldoAtual?: number; }
interface ApuracaoFiscal { competencia?: string; valorRecolher?: number; }
interface NotaFiscal { tipo?: string; dataEmissao?: string; }
interface Obrigacao { status?: string; }
interface Certificado { dataValidade?: string; status?: string; }
interface Tarefa { status?: string; dataVencimento?: string; }
interface Holerite { competencia?: string; valorLiquido?: number; }
interface Honorario { valor?: number; status?: string; }
interface AuditLog { $id: string; usuario?: string; acao?: string; modulo?: string; descricao?: string; timestamp?: string; $createdAt: string; }

interface RawData {
  empresas: Empresa[];
  contasPagar: ContaPagar[];
  contasReceber: ContaReceber[];
  funcionarios: Funcionario[];
  contasBancarias: ContaBancaria[];
  apuracoes: ApuracaoFiscal[];
  notasFiscais: NotaFiscal[];
  obrigacoes: Obrigacao[];
  certificados: Certificado[];
  tarefas: Tarefa[];
  holerites: Holerite[];
  honorarios: Honorario[];
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

@Component({
  selector: 'bear-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatTooltipModule,
    MetricCardComponent, AlertPanelComponent, FinancePerformanceComponent,
    CashFlowCardComponent, TopCompaniesCardComponent, RecentActivitiesCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  errorState = signal(false);
  activitiesLoading = signal(true);

  private raw = signal<RawData | null>(null);
  activities = signal<ActivityItem[]>([]);

  financePeriodo = signal<Periodo>('atual');
  cashPeriodo = signal<Periodo>('atual');

  // ── View-models derivados (recomputam com os dados e os seletores de período) ──
  metricCards = computed<MetricCardData[]>(() => this.buildMetricCards(this.raw()));
  alerts = computed<AlertItem[]>(() => this.buildAlerts(this.raw()));
  topCompanies = computed<TopCompany[]>(() => this.buildTopCompanies(this.raw()));
  financeSummary = computed<FinanceSummary>(() => this.buildFinance(this.raw(), this.financePeriodo()));
  cashFlow = computed<CashFlow>(() => this.buildCashFlow(this.raw(), this.cashPeriodo()));

  constructor(public authService: AuthService, private appwrite: AppwriteService) {}

  ngOnInit(): void {
    this.load();
    this.loadAtividades();
  }

  // ═══ Carregamento ═══════════════════════════════════════════════════════════
  refresh(): void {
    this.loading.set(true);
    this.activitiesLoading.set(true);
    this.load();
    this.loadAtividades();
  }

  private load(): void {
    const Q = this.appwrite.query;
    const list = [Q.limit(100), Q.orderDesc('$createdAt')];
    const col = <T>(name: string) => this.appwrite.listDocuments<T>(name, list).pipe(catchError(() => of([] as T[])));

    this.errorState.set(false);
    forkJoin({
      empresas: col<Empresa>('empresas'),
      contasPagar: col<ContaPagar>('contas_pagar'),
      contasReceber: col<ContaReceber>('contas_receber'),
      funcionarios: col<Funcionario>('funcionarios'),
      contasBancarias: col<ContaBancaria>('contas_bancarias'),
      apuracoes: col<ApuracaoFiscal>('apuracoes_fiscais'),
      notasFiscais: col<NotaFiscal>('notas_fiscais'),
      obrigacoes: col<Obrigacao>('obrigacoes'),
      certificados: col<Certificado>('certificados'),
      tarefas: col<Tarefa>('tarefas'),
      holerites: col<Holerite>('holerites'),
      honorarios: col<Honorario>('honorarios'),
    }).subscribe({
      next: (d) => { this.raw.set(d); this.loading.set(false); },
      error: () => { this.errorState.set(true); this.loading.set(false); },
    });
  }

  private loadAtividades(): void {
    const Q = this.appwrite.query;
    const tenant = this.authService.tenantId() || 'default';
    this.appwrite.listDocuments<AuditLog>('audit_logs', [
      Q.equal('tenantId', tenant), Q.limit(6), Q.orderDesc('$createdAt'),
    ]).pipe(catchError(() => of([] as AuditLog[]))).subscribe((logs) => {
      this.activities.set(logs.map(a => ({
        id: a.$id,
        user: a.usuario || 'Sistema',
        action: a.descricao || a.acao || 'registrou uma ação',
        icon: this.auditIcon(a.acao),
        type: this.auditType(a.modulo),
        time: this.getRelativeTime(new Date(a.timestamp || a.$createdAt)),
      })));
      this.activitiesLoading.set(false);
    });
  }

  // ═══ Competências ═══════════════════════════════════════════════════════════
  /** "YYYY-MM" relativa ao mês atual (monthsBack = 0 → mês corrente). */
  private competencia(monthsBack: number): string {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private compFor(p: Periodo): string {
    return this.competencia(p === 'anterior' ? 1 : 0);
  }

  private prevComp(comp: string): string {
    const [y, m] = comp.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // ═══ Indicadores principais (5 cards) ═══════════════════════════════════════
  private buildMetricCards(d: RawData | null): MetricCardData[] {
    const comp = this.competencia(0);
    const prev = this.competencia(1);

    const empresasAtivas = d ? d.empresas.filter(e => (e.status || 'ATIVA') === 'ATIVA').length : 0;
    const empresasNovas = d ? d.empresas.filter(e => (e.$createdAt || '').slice(0, 7) === comp).length : 0;

    const isNfe = (n: NotaFiscal) => (n.tipo || '').toUpperCase() === 'NFE' || (n.tipo || '') === '';
    const nfe30 = d ? d.notasFiscais.filter(n => isNfe(n) && this.diasAtras(n.dataEmissao) <= 30 && this.diasAtras(n.dataEmissao) >= 0).length : 0;
    const nfePrev30 = d ? d.notasFiscais.filter(n => isNfe(n) && this.diasAtras(n.dataEmissao) > 30 && this.diasAtras(n.dataEmissao) <= 60).length : 0;

    const obrigacoesPend = d ? d.obrigacoes.filter(o => (o.status || '') !== 'ENTREGUE').length : 0;

    const folhaMes = d ? d.holerites.filter(h => h.competencia === comp).reduce((s, h) => s + (h.valorLiquido || 0), 0) : 0;
    const folhaPrev = d ? d.holerites.filter(h => h.competencia === prev).reduce((s, h) => s + (h.valorLiquido || 0), 0) : 0;

    const honorariosAbertos = d ? d.honorarios.filter(h => !this.isPago(h.status)).reduce((s, h) => s + (h.valor || 0), 0) : 0;
    const honorariosPend = d ? d.honorarios.filter(h => !this.isPago(h.status)).length : 0;

    return [
      {
        title: 'Empresas Ativas', value: String(empresasAtivas), sublabel: 'Total cadastradas',
        icon: 'apartment', theme: 'blue', route: '/empresas',
        trend: empresasNovas > 0 ? { value: `+${empresasNovas} este mês`, up: true } : null,
        spark: d ? this.empresasSpark(d.empresas) : [],
      },
      {
        title: 'NF-e Emitidas', value: String(nfe30), sublabel: 'Últimos 30 dias',
        icon: 'receipt_long', theme: 'purple', route: '/fiscal/nfe',
        trend: this.trendPct(nfe30, nfePrev30),
        spark: d ? this.nfeSpark(d.notasFiscais) : [],
      },
      {
        title: 'Obrigações Pendentes', value: String(obrigacoesPend), sublabel: 'A vencer',
        icon: 'pending_actions', theme: 'orange', route: '/sped/obrigacoes',
        trend: null, spark: [],
      },
      {
        title: 'Folha (Mês)', value: this.formatCurrency(folhaMes), sublabel: 'Total de despesas',
        icon: 'payments', theme: 'green', route: '/folha/holerites',
        trend: this.trendPct(folhaMes, folhaPrev),
        spark: d ? this.folhaSpark(d.holerites) : [],
      },
      {
        title: 'Honorários Abertos', value: this.formatCurrency(honorariosAbertos),
        sublabel: honorariosPend ? `${honorariosPend} a receber` : 'A receber',
        icon: 'account_balance_wallet', theme: 'pink', route: '/escritorio/honorarios',
        trend: null, spark: [],
      },
    ];
  }

  private empresasSpark(empresas: Empresa[]): number[] {
    // Total acumulado de empresas ao fim de cada um dos últimos 8 meses.
    const out: number[] = [];
    for (let k = 7; k >= 0; k--) {
      const comp = this.competencia(k);
      out.push(empresas.filter(e => (e.$createdAt || '9999').slice(0, 7) <= comp).length);
    }
    return out.some(v => v > 0) ? out : [];
  }

  private nfeSpark(notas: NotaFiscal[]): number[] {
    // Contagem diária de NF-e nos últimos 14 dias.
    const isNfe = (n: NotaFiscal) => (n.tipo || '').toUpperCase() === 'NFE' || (n.tipo || '') === '';
    const out: number[] = [];
    for (let k = 13; k >= 0; k--) {
      out.push(notas.filter(n => isNfe(n) && this.diasAtras(n.dataEmissao) === k).length);
    }
    return out.some(v => v > 0) ? out : [];
  }

  private folhaSpark(holerites: Holerite[]): number[] {
    const out: number[] = [];
    for (let k = 5; k >= 0; k--) {
      const comp = this.competencia(k);
      out.push(holerites.filter(h => h.competencia === comp).reduce((s, h) => s + (h.valorLiquido || 0), 0));
    }
    return out.some(v => v > 0) ? out : [];
  }

  // ═══ Alertas ════════════════════════════════════════════════════════════════
  private buildAlerts(d: RawData | null): AlertItem[] {
    const hoje = new Date().toISOString().slice(0, 10);
    const cpVenc = d ? d.contasPagar.filter(c => !this.isPago(c.status) && (c.dataVencimento || '') && (c.dataVencimento as string) < hoje).length : 0;
    const crVenc = d ? d.contasReceber.filter(c => !this.isRecebido(c.status) && (c.dataVencimento || '') && (c.dataVencimento as string) < hoje).length : 0;
    const certVenc = d ? d.certificados.filter(c => { const n = this.diasAte(c.dataValidade); return n >= 0 && n <= 30; }).length : 0;
    const tarAtras = d ? d.tarefas.filter(t => (t.status || '') !== 'CONCLUIDA' && (t.dataVencimento || '') && (t.dataVencimento as string) < hoje).length : 0;

    return [
      { label: 'Contas a Pagar Vencidas', count: cpVenc, icon: 'trending_down', type: 'error', route: '/financeiro/contas-pagar' },
      { label: 'Contas a Receber Vencidas', count: crVenc, icon: 'schedule', type: 'warning', route: '/financeiro/contas-receber' },
      { label: 'Certidões a Vencer', count: certVenc, icon: 'verified_user', type: 'info', route: '/certificados' },
      { label: 'Tarefas Atrasadas', count: tarAtras, icon: 'task_alt', type: 'purple', route: '/escritorio/tarefas' },
    ];
  }

  // ═══ Desempenho financeiro ══════════════════════════════════════════════════
  private buildFinance(d: RawData | null, p: Periodo): FinanceSummary {
    const comp = this.compFor(p);
    const prev = this.prevComp(comp);
    const empty: FinanceSummary = {
      receita: 0, despesa: 0, lucro: 0,
      receitaTrend: null, despesaTrend: null, lucroTrend: null,
      serieReceita: [], serieDespesa: [], labels: [],
    };
    if (!d) return empty;

    const noMes = (data: string | undefined, c: string) => (data || '').slice(0, 7) === c;
    const receita = d.contasReceber.filter(c => noMes(c.dataEmissao, comp)).reduce((s, c) => s + (c.valor || 0), 0);
    const despesa = d.contasPagar.filter(c => noMes(c.dataEmissao, comp)).reduce((s, c) => s + (c.valor || 0), 0);
    const receitaPrev = d.contasReceber.filter(c => noMes(c.dataEmissao, prev)).reduce((s, c) => s + (c.valor || 0), 0);
    const despesaPrev = d.contasPagar.filter(c => noMes(c.dataEmissao, prev)).reduce((s, c) => s + (c.valor || 0), 0);
    const lucro = receita - despesa;
    const lucroPrev = receitaPrev - despesaPrev;

    // Séries diárias acumuladas.
    const [y, m] = comp.split('-').map(Number);
    const dias = new Date(y, m, 0).getDate();
    const serieReceita: number[] = [];
    const serieDespesa: number[] = [];
    const labels: string[] = [];
    let accR = 0, accD = 0;
    for (let dia = 1; dia <= dias; dia++) {
      const dd = String(dia).padStart(2, '0');
      const key = `${comp}-${dd}`;
      accR += d.contasReceber.filter(c => (c.dataEmissao || '').slice(0, 10) === key).reduce((s, c) => s + (c.valor || 0), 0);
      accD += d.contasPagar.filter(c => (c.dataEmissao || '').slice(0, 10) === key).reduce((s, c) => s + (c.valor || 0), 0);
      serieReceita.push(accR);
      serieDespesa.push(accD);
      labels.push(`${dd}/${String(m).padStart(2, '0')}`);
    }

    return {
      receita, despesa, lucro,
      receitaTrend: this.trendPct(receita, receitaPrev),
      despesaTrend: this.trendPct(despesa, despesaPrev),
      lucroTrend: this.trendPct(lucro, lucroPrev),
      serieReceita, serieDespesa, labels,
    };
  }

  // ═══ Fluxo de caixa ═════════════════════════════════════════════════════════
  private buildCashFlow(d: RawData | null, p: Periodo): CashFlow {
    if (!d) return { entrada: 0, saida: 0, saldo: 0 };
    const comp = this.compFor(p);
    const entrada = d.contasReceber
      .filter(c => this.isRecebido(c.status) && (c.dataRecebimento || '').slice(0, 7) === comp)
      .reduce((s, c) => s + (c.valorRecebido ?? c.valor ?? 0), 0);
    const saida = d.contasPagar
      .filter(c => this.isPago(c.status) && (c.dataPagamento || '').slice(0, 7) === comp)
      .reduce((s, c) => s + (c.valorPago ?? c.valor ?? 0), 0);
    return { entrada, saida, saldo: entrada - saida };
  }

  // ═══ Top empresas ═══════════════════════════════════════════════════════════
  private buildTopCompanies(d: RawData | null): TopCompany[] {
    if (!d) return [];
    const nomes = new Map<string, string>();
    for (const e of d.empresas) nomes.set(e.$id, e.nomeFantasia || e.razaoSocial || '(sem nome)');

    const porEmpresa = new Map<string, number>();
    for (const c of d.contasReceber) {
      const id = c.empresaId || '';
      if (!id) continue;
      porEmpresa.set(id, (porEmpresa.get(id) || 0) + (c.valor || 0));
    }

    const lista = Array.from(porEmpresa.entries())
      .filter(([, v]) => v > 0)
      .map(([id, valor]) => ({ nome: nomes.get(id) || 'Empresa', valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    const max = lista[0]?.valor || 1;
    return lista.map(c => ({ ...c, pct: Math.round((c.valor / max) * 100) }));
  }

  // ═══ Ações do cabeçalho ═════════════════════════════════════════════════════
  /** Exporta os indicadores atuais para CSV (Excel pt-BR). Ação real, sem back-end. */
  exportar(): void {
    if (this.loading()) return;
    const fmt = (v: number) => this.formatCurrency(v);
    const fin = this.financeSummary();
    const cf = this.cashFlow();
    const rows: string[][] = [
      ['Bear ERP — Painel', this.dateLabel()],
      [],
      ['Indicador', 'Valor'],
      ...this.metricCards().map(c => [c.title, c.value]),
      [],
      ['Financeiro (mês)', 'Valor'],
      ['Receita Bruta', fmt(fin.receita)],
      ['Despesas', fmt(fin.despesa)],
      ['Lucro Líquido', fmt(fin.lucro)],
      [],
      ['Fluxo de Caixa (mês)', 'Valor'],
      ['Entrada', fmt(cf.entrada)],
      ['Saída', fmt(cf.saida)],
      ['Saldo', fmt(cf.saldo)],
      [],
      ['Alertas', 'Quantidade'],
      ...this.alerts().map(a => [a.label, String(a.count)]),
    ];
    const csv = rows.map(r => r.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bear-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ═══ Helpers de tendência/formatação ════════════════════════════════════════
  private trendPct(atual: number, anterior: number): Trend {
    if (!anterior) return null;
    const p = Math.round(((atual - anterior) / anterior) * 100);
    return { value: `${p >= 0 ? '+' : ''}${p}%`, up: p >= 0 };
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
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  }

  private diasAtras(data?: string): number {
    if (!data) return Number.NaN;
    const alvo = new Date((data || '').slice(0, 10) + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return Math.round((hoje.getTime() - alvo.getTime()) / 86400000);
  }

  private auditIcon(acao?: string): string {
    const m: Record<string, string> = {
      CRIAR: 'add_circle', EDITAR: 'edit', EXCLUIR: 'delete',
      LOGIN: 'login', LOGOUT: 'logout', EXPORTAR: 'download',
    };
    return m[(acao || '').toUpperCase()] || 'bolt';
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
    if (mins < 60) return `há ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `há ${hrs}h`;
    return `há ${Math.floor(hrs / 24)}d`;
  }

  // ═══ Cabeçalho (dinâmico) ═══════════════════════════════════════════════════
  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  firstName(): string {
    return this.authService.user()?.nome?.split(' ')[0] || 'Usuário';
  }

  dateLabel(): string {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  periodChip(): string {
    const now = new Date();
    return `${MESES_CURTOS[now.getMonth()].replace(/^\w/, c => c.toUpperCase())} de ${now.getFullYear()}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }
}
