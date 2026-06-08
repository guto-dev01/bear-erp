import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

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
      @if (dashboard()) {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style="background: #E9FAEF;">
              <span class="material-symbols-rounded text-lg" style="color: #34C759;">trending_up</span>
            </div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Receita Bruta</p>
            <p class="text-lg font-bold" style="color: #34C759;">{{ dashboard().receitaBruta | currency:'BRL' }}</p>
          </div>
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style="background: #FFECEB;">
              <span class="material-symbols-rounded text-lg" style="color: #FF3B30;">trending_down</span>
            </div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Despesas</p>
            <p class="text-lg font-bold" style="color: #FF3B30;">{{ dashboard().despesasTotais | currency:'BRL' }}</p>
          </div>
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style="background: #ECEBFB;">
              <span class="material-symbols-rounded text-lg" style="color: #007AFF;">account_balance_wallet</span>
            </div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Lucro Líquido</p>
            <p class="text-lg font-bold" style="color: #007AFF;">{{ dashboard().lucroLiquido | currency:'BRL' }}</p>
          </div>
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style="background: #E5F1FF;">
              <span class="material-symbols-rounded text-lg" style="color: #007AFF;">analytics</span>
            </div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Margem Lucro</p>
            <p class="text-lg font-bold" style="color: #007AFF;">{{ dashboard().margemLucro }}%</p>
          </div>
          <div class="bear-card p-4 flex flex-col gap-1">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style="background: #F2EBFB;">
              <span class="material-symbols-rounded text-lg" style="color: #5856D6;">account_balance</span>
            </div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Saldo Bancário</p>
            <p class="text-lg font-bold" style="color: #5856D6;">{{ dashboard().saldoBancario | currency:'BRL' }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #FFECEB;">
              <span class="material-symbols-rounded" style="color: #FF3B30;">money_off</span>
            </div>
            <div>
              <p class="text-xs font-medium" style="color: var(--text-secondary);">Contas a Pagar Vencidas</p>
              <p class="text-2xl font-bold" style="color: #FF3B30;">{{ dashboard().contasPagarVencidas }}</p>
            </div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #FFF4E5;">
              <span class="material-symbols-rounded" style="color: #FF9500;">attach_money</span>
            </div>
            <div>
              <p class="text-xs font-medium" style="color: var(--text-secondary);">Contas a Receber Vencidas</p>
              <p class="text-2xl font-bold" style="color: #FF9500;">{{ dashboard().contasReceberVencidas }}</p>
            </div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #E5F1FF;">
              <span class="material-symbols-rounded" style="color: #007AFF;">badge</span>
            </div>
            <div>
              <p class="text-xs font-medium" style="color: var(--text-secondary);">Total Funcionários</p>
              <p class="text-2xl font-bold" style="color: #007AFF;">{{ dashboard().totalFuncionarios }}</p>
            </div>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
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
  relatorios = signal<any[]>([]); loading = signal(false); showForm = signal(false);
  totalElements = signal(0); dashboard = signal<any>(null);
  displayedColumns = ['titulo', 'tipo', 'formato', 'periodo', 'status', 'data'];
  form!: FormGroup;
  private apiUrl = `${environment.apiUrl}/relatorios`;

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

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      titulo: ['', Validators.required], tipo: ['', Validators.required],
      formato: ['PDF', Validators.required], periodoInicio: ['', Validators.required],
      periodoFim: ['', Validators.required],
    });
    this.carregarDashboard();
    this.carregar();
  }

  carregarDashboard() {
    this.http.get<any>(`${this.apiUrl}/dashboard`).subscribe({
      next: (res) => this.dashboard.set(res),
    });
  }

  carregar(page = 0) {
    this.loading.set(true);
    const params = new HttpParams().set('page', page).set('size', 20);
    this.http.get<any>(this.apiUrl, { params }).subscribe({
      next: (res) => { this.relatorios.set(res.content || []); this.totalElements.set(res.totalElements || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ formato: 'PDF' }); }
  onPage(event: PageEvent) { this.carregar(event.pageIndex); }

  gerar() {
    if (this.form.valid) {
      this.loading.set(true);
      this.http.post<any>(this.apiUrl, this.form.value).subscribe({
        next: () => { this.snackBar.open('Relatório gerado!', 'OK', { duration: 3000 }); this.showForm.set(false); this.carregar(); },
        error: () => { this.loading.set(false); this.snackBar.open('Erro ao gerar', 'OK', { duration: 3000 }); },
      });
    }
  }

  gerarRapido(tipo: string, titulo: string) {
    const now = new Date();
    const inicio = `${now.getFullYear()}-01`;
    const fim = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.loading.set(true);
    this.http.post<any>(this.apiUrl, { titulo, tipo, formato: 'PDF', periodoInicio: inicio, periodoFim: fim }).subscribe({
      next: () => { this.snackBar.open(`${titulo} gerado!`, 'OK', { duration: 3000 }); this.carregar(); },
      error: () => { this.loading.set(false); this.snackBar.open('Erro ao gerar', 'OK', { duration: 3000 }); },
    });
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
