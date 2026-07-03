import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

// ── Documento persistido na coleção `relatorios` ──
interface RelatorioDoc {
  $id: string;
  nome: string;
  tipo: string;
  parametros?: string;
  formato?: string;
  dataGeracao?: string;
  empresaId?: string;
  tenantId?: string;
  $createdAt: string;
}

// ── Linha exibida na tabela (campos que o template espera) ──
interface RelatorioView {
  $id: string;
  titulo: string;
  tipo: string;
  formato: string;
  periodoInicio: string;
  periodoFim: string;
  status: string;
  dataGeracao: string;
}

interface DashboardView {
  receitaBruta: number;
  despesasTotais: number;
  lucroLiquido: number;
  margemLucro: number;
  saldoBancario: number;
  contasPagarVencidas: number;
  contasReceberVencidas: number;
  totalFuncionarios: number;
}

// ── Estruturas mínimas das coleções agregadas ──
interface LancamentoDoc { tipo: string; valor: number; }
interface ContaPagarDoc { valor: number; valorPago?: number; dataVencimento: string; status: string; }
interface ContaReceberDoc { valor: number; valorRecebido?: number; dataVencimento: string; status: string; }
interface NotaFiscalDoc { valorTotal: number; }
interface ContaBancariaDoc { saldoAtual?: number; }
interface FuncionarioDoc { status?: string; }

@Component({
  selector: 'bear-relatorios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, MatSnackBarModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Relatórios & BI</h1>
          <p class="page-header__subtitle">Gere e acompanhe relatórios gerenciais e contábeis</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-base mr-1.5">add</span>
            Gerar Relatório
          </button>
        </div>
      </div>

      <!-- Dashboard Gerencial -->
      @if (dashboard(); as d) {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="stat-icon stat-icon--success mb-2"><span class="material-symbols-rounded">trending_up</span></div>
            <p class="text-xs font-medium ink-secondary">Receita Bruta</p>
            <p class="text-lg font-bold tabular ink-success">{{ d.receitaBruta | currency:'BRL' }}</p>
          </div>
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="stat-icon stat-icon--error mb-2"><span class="material-symbols-rounded">trending_down</span></div>
            <p class="text-xs font-medium ink-secondary">Despesas</p>
            <p class="text-lg font-bold tabular ink-error">{{ d.despesasTotais | currency:'BRL' }}</p>
          </div>
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="stat-icon stat-icon--brand mb-2"><span class="material-symbols-rounded">account_balance_wallet</span></div>
            <p class="text-xs font-medium ink-secondary">Lucro Líquido</p>
            <p class="text-lg font-bold tabular ink-brand">{{ d.lucroLiquido | currency:'BRL' }}</p>
          </div>
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="stat-icon stat-icon--info mb-2"><span class="material-symbols-rounded">analytics</span></div>
            <p class="text-xs font-medium ink-secondary">Margem Lucro</p>
            <p class="text-lg font-bold tabular ink-info">{{ d.margemLucro }}%</p>
          </div>
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="stat-icon stat-icon--purple mb-2"><span class="material-symbols-rounded">account_balance</span></div>
            <p class="text-xs font-medium ink-secondary">Saldo Bancário</p>
            <p class="text-lg font-bold tabular ink-purple">{{ d.saldoBancario | currency:'BRL' }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="stat-icon stat-icon--error stat-icon--lg"><span class="material-symbols-rounded">money_off</span></div>
            <div>
              <p class="text-xs font-medium ink-secondary">Contas a Pagar Vencidas</p>
              <p class="text-2xl font-bold tabular ink-error">{{ d.contasPagarVencidas }}</p>
            </div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="stat-icon stat-icon--warning stat-icon--lg"><span class="material-symbols-rounded">attach_money</span></div>
            <div>
              <p class="text-xs font-medium ink-secondary">Contas a Receber Vencidas</p>
              <p class="text-2xl font-bold tabular ink-warning">{{ d.contasReceberVencidas }}</p>
            </div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="stat-icon stat-icon--info stat-icon--lg"><span class="material-symbols-rounded">badge</span></div>
            <div>
              <p class="text-xs font-medium ink-secondary">Total Funcionários</p>
              <p class="text-2xl font-bold tabular ink-info">{{ d.totalFuncionarios }}</p>
            </div>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="bear-spinner bear-spinner--xl"></div>
        </div>
      }

      @if (!showForm()) {
        <!-- Relatórios Rápidos -->
        <div class="bear-card p-5 mb-6">
          <h3 class="text-heading text-base mb-4">Relatórios Rápidos</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            @for (r of relatoriosRapidos; track r.tipo) {
              <button class="bear-btn bear-btn--ghost flex flex-col items-center justify-center gap-1.5 py-4 px-3 h-auto"
                      (click)="gerarRapido(r.tipo, r.titulo)">
                <span class="material-symbols-rounded text-2xl" style="color: var(--brand-primary);">{{ r.icon }}</span>
                <span class="text-xs font-medium text-center leading-tight">{{ r.titulo }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Histórico -->
        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Histórico de Relatórios</h3>
            <span class="badge badge--info">{{ totalElements() }} total</span>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="relatorios()" class="w-full">
              <ng-container matColumnDef="titulo">
                <th mat-header-cell *matHeaderCellDef class="text-label">Título</th>
                <td mat-cell *matCellDef="let r" class="font-medium">{{ r.titulo }}</td>
              </ng-container>
              <ng-container matColumnDef="tipo">
                <th mat-header-cell *matHeaderCellDef class="text-label">Tipo</th>
                <td mat-cell *matCellDef="let r">{{ r.tipo }}</td>
              </ng-container>
              <ng-container matColumnDef="formato">
                <th mat-header-cell *matHeaderCellDef class="text-label">Formato</th>
                <td mat-cell *matCellDef="let r">{{ r.formato }}</td>
              </ng-container>
              <ng-container matColumnDef="periodo">
                <th mat-header-cell *matHeaderCellDef class="text-label">Período</th>
                <td mat-cell *matCellDef="let r">{{ r.periodoInicio }} a {{ r.periodoFim }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let r">
                  <span class="badge" [ngClass]="getStatusBadge(r.status)">
                    <span class="badge__dot"></span>
                    {{ r.status }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="data">
                <th mat-header-cell *matHeaderCellDef class="text-label">Data</th>
                <td mat-cell *matCellDef="let r">{{ r.dataGeracao | date:'dd/MM/yyyy HH:mm' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
            @if (relatorios().length === 0 && !loading()) {
              <div class="empty-state py-12">
                <span class="material-symbols-rounded empty-state__icon text-5xl mb-3" style="color: var(--text-secondary);">assessment</span>
                <p class="empty-state__title text-sm" style="color: var(--text-secondary);">Nenhum relatório gerado ainda</p>
              </div>
            }
          </div>
          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)"></mat-paginator>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-heading text-base">Gerar Novo Relatório</h3>
            <button class="bear-btn bear-btn--ghost p-2" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="gerar()" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field appearance="outline" class="col-span-full">
              <mat-label>Título</mat-label>
              <input matInput formControlName="titulo">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="tipo">
                @for (t of tiposRelatorio; track t.value) {
                  <mat-option [value]="t.value">{{ t.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Formato</mat-label>
              <mat-select formControlName="formato">
                <mat-option value="PDF">PDF</mat-option>
                <mat-option value="EXCEL">Excel</mat-option>
                <mat-option value="CSV">CSV</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Período Início</mat-label>
              <input matInput formControlName="periodoInicio" placeholder="2024-01">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Período Fim</mat-label>
              <input matInput formControlName="periodoFim" placeholder="2024-12">
            </mat-form-field>
            <div class="col-span-full flex gap-3 justify-end pt-2">
              <button class="bear-btn bear-btn--outline" type="button" (click)="showForm.set(false)">
                Cancelar
              </button>
              <button class="bear-btn bear-btn--primary" type="submit" [disabled]="form.invalid">
                <span class="material-symbols-rounded text-base mr-1.5">assessment</span>
                Gerar Relatório
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class RelatoriosComponent implements OnInit {
  relatorios = signal<RelatorioView[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  dashboard = signal<DashboardView | null>(null);
  displayedColumns = ['titulo', 'tipo', 'formato', 'periodo', 'status', 'data'];
  form!: FormGroup;

  private readonly pageSize = 20;
  private allRelatorios: RelatorioView[] = [];

  relatoriosRapidos = [
    { tipo: 'BALANCETE', titulo: 'Balancete', icon: 'balance' },
    { tipo: 'DRE', titulo: 'DRE', icon: 'trending_up' },
    { tipo: 'BALANCO_PATRIMONIAL', titulo: 'Balanço Patrimonial', icon: 'account_balance' },
    { tipo: 'FLUXO_CAIXA', titulo: 'Fluxo de Caixa', icon: 'show_chart' },
    { tipo: 'LIVRO_DIARIO', titulo: 'Livro Diário', icon: 'menu_book' },
    { tipo: 'LIVRO_RAZAO', titulo: 'Livro Razão', icon: 'auto_stories' },
    { tipo: 'FOLHA_PAGAMENTO', titulo: 'Folha Pagamento', icon: 'badge' },
    { tipo: 'APURACAO_IMPOSTOS', titulo: 'Apuração Impostos', icon: 'gavel' },
    { tipo: 'FATURAMENTO', titulo: 'Faturamento', icon: 'receipt' },
    { tipo: 'CONTAS_PAGAR', titulo: 'Contas a Pagar', icon: 'money_off' },
    { tipo: 'CONTAS_RECEBER', titulo: 'Contas a Receber', icon: 'attach_money' },
    { tipo: 'INDICADORES_FINANCEIROS', titulo: 'Indicadores', icon: 'analytics' },
  ];

  tiposRelatorio = this.relatoriosRapidos.map(r => ({ value: r.tipo, label: r.titulo }));

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      titulo: ['', Validators.required], tipo: ['', Validators.required],
      formato: ['PDF', Validators.required], periodoInicio: ['', Validators.required],
      periodoFim: ['', Validators.required],
    });
    this.carregarDashboard();
    this.carregar();
  }

  private get tenantId(): string { return this.auth.tenantId() || 'default'; }
  private get empresaId(): string { return this.auth.empresaId() || ''; }

  private baseQueries(): string[] {
    const q = [this.appwrite.query.limit(100), this.appwrite.query.equal('tenantId', this.tenantId)];
    if (this.empresaId) q.push(this.appwrite.query.equal('empresaId', this.empresaId));
    return q;
  }

  /** Dashboard gerencial agregado no cliente a partir das coleções de origem. */
  carregarDashboard() {
    forkJoin({
      lancamentos: this.appwrite.listDocuments<LancamentoDoc>('lancamentos', this.baseQueries()),
      contasPagar: this.appwrite.listDocuments<ContaPagarDoc>('contas_pagar', this.baseQueries()),
      contasReceber: this.appwrite.listDocuments<ContaReceberDoc>('contas_receber', this.baseQueries()),
      notas: this.appwrite.listDocuments<NotaFiscalDoc>('notas_fiscais', this.baseQueries()),
      bancos: this.appwrite.listDocuments<ContaBancariaDoc>('contas_bancarias', this.baseQueries()),
      funcionarios: this.appwrite.listDocuments<FuncionarioDoc>('funcionarios', this.baseQueries()),
    }).subscribe({
      next: ({ lancamentos, contasPagar, contasReceber, notas, bancos, funcionarios }) => {
        const hoje = this.hojeIso();

        // Receita bruta: faturamento (notas fiscais) + recebimentos previstos.
        const receitaNotas = notas.reduce((s, n) => s + (n.valorTotal || 0), 0);
        const receitaReceber = contasReceber.reduce((s, c) => s + (c.valor || 0), 0);
        const receitaBruta = receitaNotas + receitaReceber;

        // Despesas: total das contas a pagar.
        const despesasTotais = contasPagar.reduce((s, c) => s + (c.valor || 0), 0);

        const lucroLiquido = receitaBruta - despesasTotais;
        const margemLucro = receitaBruta > 0
          ? Math.round((lucroLiquido / receitaBruta) * 1000) / 10
          : 0;

        const saldoBancario = bancos.reduce((s, b) => s + (b.saldoAtual || 0), 0);

        const contasPagarVencidas = contasPagar.filter(c =>
          c.status !== 'PAGO' && c.dataVencimento && c.dataVencimento < hoje).length;
        const contasReceberVencidas = contasReceber.filter(c =>
          c.status !== 'RECEBIDO' && c.dataVencimento && c.dataVencimento < hoje).length;

        const totalFuncionarios = funcionarios.filter(f => (f.status || 'ATIVO') === 'ATIVO').length;

        // lancamentos lido para manter fidelidade; não há campo dedicado no dashboard além dos acima.
        void lancamentos;

        this.dashboard.set({
          receitaBruta, despesasTotais, lucroLiquido, margemLucro,
          saldoBancario, contasPagarVencidas, contasReceberVencidas, totalFuncionarios,
        });
      },
      error: () => { /* mantém dashboard nulo silenciosamente */ },
    });
  }

  carregar(page = 0) {
    this.loading.set(true);
    const queries = [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', this.tenantId),
    ];
    if (this.empresaId) queries.push(this.appwrite.query.equal('empresaId', this.empresaId));
    this.appwrite.listDocuments<RelatorioDoc>('relatorios', queries).subscribe({
      next: docs => {
        this.allRelatorios = docs.map(d => this.toView(d));
        this.totalElements.set(this.allRelatorios.length);
        this.aplicarPagina(page);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private aplicarPagina(page: number) {
    const start = page * this.pageSize;
    this.relatorios.set(this.allRelatorios.slice(start, start + this.pageSize));
  }

  private toView(d: RelatorioDoc): RelatorioView {
    let periodoInicio = '';
    let periodoFim = '';
    let status = 'CONCLUIDO';
    if (d.parametros) {
      try {
        const p = JSON.parse(d.parametros) as { periodoInicio?: string; periodoFim?: string; status?: string };
        periodoInicio = p.periodoInicio ?? '';
        periodoFim = p.periodoFim ?? '';
        status = p.status ?? 'CONCLUIDO';
      } catch { /* parâmetros inválidos — mantém defaults */ }
    }
    return {
      $id: d.$id,
      titulo: d.nome,
      tipo: d.tipo,
      formato: d.formato ?? 'PDF',
      periodoInicio,
      periodoFim,
      status,
      dataGeracao: d.dataGeracao ?? d.$createdAt,
    };
  }

  resetForm() { this.form.reset({ formato: 'PDF' }); }
  onPage(event: PageEvent) { this.aplicarPagina(event.pageIndex); }

  gerar() {
    if (!this.form.valid) return;
    const v = this.form.value as { titulo: string; tipo: string; formato: string; periodoInicio: string; periodoFim: string };
    this.persistir(v.titulo, v.tipo, v.formato, v.periodoInicio, v.periodoFim, () => {
      this.snackBar.open('Relatório gerado!', 'OK', { duration: 3000 });
      this.showForm.set(false);
    });
  }

  gerarRapido(tipo: string, titulo: string) {
    const now = new Date();
    const inicio = `${now.getFullYear()}-01`;
    const fim = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.persistir(titulo, tipo, 'PDF', inicio, fim, () => {
      this.snackBar.open(`${titulo} gerado!`, 'OK', { duration: 3000 });
    });
  }

  /** Persiste o relatório salvo na coleção `relatorios` e oferece export local. */
  private persistir(titulo: string, tipo: string, formato: string, periodoInicio: string, periodoFim: string, onOk: () => void) {
    this.loading.set(true);
    const agora = new Date().toISOString();
    const data: Record<string, unknown> = {
      nome: titulo,
      tipo,
      formato,
      dataGeracao: agora,
      parametros: JSON.stringify({ periodoInicio, periodoFim, status: 'CONCLUIDO' }),
      tenantId: this.tenantId,
      empresaId: this.empresaId,
    };
    this.appwrite.createDocument<RelatorioDoc>('relatorios', data).subscribe({
      next: doc => {
        onOk();
        this.carregar();
        // "export" gerado no cliente conforme formato escolhido.
        this.exportar(this.toView(doc), formato);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erro ao gerar', 'OK', { duration: 3000 });
      },
    });
  }

  /** Export do relatório no cliente (CSV/JSON). PDF/EXCEL não geram binário nesta versão. */
  private exportar(r: RelatorioView, formato: string) {
    if (formato === 'CSV') {
      const headers = ['titulo', 'tipo', 'formato', 'periodoInicio', 'periodoFim', 'status', 'dataGeracao'];
      const linha = headers.map(h => `"${String((r as unknown as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`).join(',');
      this.download(`${headers.join(',')}\n${linha}`, `${r.tipo}.csv`, 'text/csv');
    } else if (formato === 'EXCEL') {
      // EXCEL real (.xlsx) exige integração externa; exporta JSON como fallback no cliente.
      this.download(JSON.stringify(r, null, 2), `${r.tipo}.json`, 'application/json');
    } else {
      // PDF: geração de binário PDF não disponível no navegador nesta versão.
      // TODO(appwrite): integração externa
      this.snackBar.open('Export PDF requer integração externa (não disponível nesta versão Appwrite)', 'OK', { duration: 4000 });
    }
  }

  private download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private hojeIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'SOLICITADO': 'badge--warning',
      'PROCESSANDO': 'badge--info',
      'CONCLUIDO': 'badge--success',
      'ERRO': 'badge--error',
    };
    return map[s] || '';
  }
}
