import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface BemPatrimonial {
  $id: string;
  codigo: string;
  descricao: string;
  valorAquisicao: number;
  valorResidual?: number;
  vidaUtil?: number;
  taxaDepreciacao?: number;
  depreciacaoAcumulada?: number;
  valorAtual?: number;
  status: string;
}

interface DepreciacaoDoc {
  $id: string;
  bemId: string;
  competencia: string;
  valorDepreciacao: number;
  depreciacaoAcumulada: number;
  valorAtual: number;
  empresaId?: string;
  tenantId?: string;
  $createdAt?: string;
}

// Linha exibida na tabela (mapeia campos derivados esperados pelo template).
interface DepreciacaoRow extends DepreciacaoDoc {
  valorResidualAtual: number;
  taxaAplicada: number;
}

@Component({
  selector: 'bear-depreciacao',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatTableModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Depreciação</h1>
          <p class="page-header__subtitle">Cálculo e consulta de depreciação dos bens patrimoniais</p>
        </div>
        <div class="page-header__actions">
          <mat-form-field appearance="outline" style="width:140px;" subscriptSizing="dynamic">
            <mat-label>Competência</mat-label>
            <input matInput [(ngModel)]="competencia" placeholder="YYYY-MM">
          </mat-form-field>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="calcular()">
            <span class="material-symbols-rounded text-lg mr-1.5">calculate</span> Calcular
          </button>
          <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem;font-size:0.8125rem;" (click)="consultar()">
            <span class="material-symbols-rounded text-base mr-1">search</span> Consultar
          </button>
        </div>
      </div>

      <!-- Summary -->
      @if (depreciacoes().length > 0) {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-in-up">
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">inventory_2</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Bens Depreciados</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ depreciacoes().length }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFECEB"><span class="material-symbols-rounded" style="color:#FF3B30">trending_down</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Deprec. Período</p><p class="text-xl font-bold" style="color:#FF3B30">{{ totalPeriodo() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E6F8FB"><span class="material-symbols-rounded" style="color:#30B0C7">account_balance</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Valor Residual Total</p><p class="text-xl font-bold" style="color:#30B0C7">{{ totalResidual() | currency:'BRL' }}</p></div>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- Empty -->
      @if (!loading() && depreciacoes().length === 0) {
        <div class="empty-state">
          <div class="empty-state__icon"><span class="material-symbols-rounded">calculate</span></div>
          <h3 class="empty-state__title">Nenhuma depreciação calculada</h3>
          <p class="empty-state__description">Selecione a competência e clique em Calcular ou Consultar</p>
        </div>
      }

      <!-- Table -->
      @if (!loading() && depreciacoes().length > 0) {
        <div class="bear-card overflow-hidden animate-fade-in-up">
          <div class="p-4 flex items-center justify-between" style="border-bottom:1px solid var(--border-subtle)">
            <h3 class="text-heading text-sm">Depreciação {{ competencia }}</h3>
            <button class="bear-btn bear-btn--outline" style="padding:0.375rem 0.75rem;font-size:0.75rem;" matTooltip="Exportar">
              <span class="material-symbols-rounded text-sm mr-1">download</span> Exportar
            </button>
          </div>
          <table mat-table [dataSource]="depreciacoes()" class="w-full">
            <ng-container matColumnDef="bemId"><th mat-header-cell *matHeaderCellDef>Bem</th><td mat-cell *matCellDef="let d" class="font-mono text-xs">{{ d.bemId }}</td></ng-container>
            <ng-container matColumnDef="competencia"><th mat-header-cell *matHeaderCellDef>Competência</th><td mat-cell *matCellDef="let d">{{ d.competencia }}</td></ng-container>
            <ng-container matColumnDef="valorDepreciacao"><th mat-header-cell *matHeaderCellDef>Valor Deprec.</th><td mat-cell *matCellDef="let d" class="font-semibold" style="color:#FF3B30">{{ d.valorDepreciacao | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="depreciacaoAcumulada"><th mat-header-cell *matHeaderCellDef>Acumulada</th><td mat-cell *matCellDef="let d">{{ d.depreciacaoAcumulada | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="valorResidualAtual"><th mat-header-cell *matHeaderCellDef>Valor Residual</th><td mat-cell *matCellDef="let d" style="color:#30B0C7">{{ d.valorResidualAtual | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="taxa"><th mat-header-cell *matHeaderCellDef>Taxa a.a.</th><td mat-cell *matCellDef="let d">{{ d.taxaAplicada }}%</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      }
    </div>
  `,
})
export class DepreciacaoComponent {
  depreciacoes = signal<DepreciacaoRow[]>([]);
  loading = signal(false);
  totalPeriodo = signal(0);
  totalResidual = signal(0);
  competencia = '';
  displayedColumns = ['bemId', 'competencia', 'valorDepreciacao', 'depreciacaoAcumulada', 'valorResidualAtual', 'taxa'];

  constructor(
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    const hoje = new Date();
    this.competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Calcula a depreciação linear de todos os bens ativos na competência informada.
   * Reimplementa a lógica que o backend Java fazia: para cada bem, calcula a parcela
   * mensal de depreciação a partir da vida útil / taxa, atualiza depreciacaoAcumulada
   * e valorAtual do bem (updateDocument) e persiste o registro em `depreciacoes`.
   */
  calcular() {
    if (!/^\d{4}-\d{2}$/.test(this.competencia)) {
      this.snackBar.open('Competência inválida (use YYYY-MM)', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }
    this.loading.set(true);
    const tenantId = this.auth.tenantId() || 'default';
    const empresaId = this.auth.empresaId() || '';

    this.appwrite.listDocuments<BemPatrimonial>('bens_patrimoniais', [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', tenantId),
    ]).subscribe({
      next: (bens) => {
        const ativos = bens.filter(b => b.status === 'ATIVO');
        if (ativos.length === 0) {
          this.loading.set(false);
          this.snackBar.open('Nenhum bem ativo para depreciar', 'OK', { duration: 3000 });
          return;
        }

        const ops = ativos.map(bem => {
          const valorAquisicao = bem.valorAquisicao || 0;
          const valorResidual = bem.valorResidual || 0;
          const baseDepreciavel = Math.max(valorAquisicao - valorResidual, 0);
          const acumuladaAnterior = bem.depreciacaoAcumulada || 0;

          // Parcela mensal: prioriza vida útil (meses); senão usa taxa anual.
          let parcela = 0;
          let taxaAplicada = bem.taxaDepreciacao || 0;
          if (bem.vidaUtil && bem.vidaUtil > 0) {
            parcela = baseDepreciavel / bem.vidaUtil;
            if (!taxaAplicada) taxaAplicada = Number((1200 / bem.vidaUtil).toFixed(4));
          } else if (taxaAplicada > 0) {
            parcela = (baseDepreciavel * (taxaAplicada / 100)) / 12;
          }

          // Não deprecia além da base depreciável.
          const restante = Math.max(baseDepreciavel - acumuladaAnterior, 0);
          const valorDepreciacao = Number(Math.min(parcela, restante).toFixed(2));
          const novaAcumulada = Number((acumuladaAnterior + valorDepreciacao).toFixed(2));
          const novoValorAtual = Number((valorAquisicao - novaAcumulada).toFixed(2));

          const registro: Record<string, unknown> = {
            bemId: bem.$id,
            competencia: this.competencia,
            valorDepreciacao,
            depreciacaoAcumulada: novaAcumulada,
            valorAtual: novoValorAtual,
            tenantId,
            empresaId,
          };

          const row: DepreciacaoRow = {
            $id: '',
            bemId: bem.$id,
            competencia: this.competencia,
            valorDepreciacao,
            depreciacaoAcumulada: novaAcumulada,
            valorAtual: novoValorAtual,
            valorResidualAtual: novoValorAtual,
            taxaAplicada,
          };

          // 1) atualiza o bem; 2) persiste o registro de depreciação.
          return this.appwrite.updateDocument('bens_patrimoniais', bem.$id, {
            depreciacaoAcumulada: novaAcumulada,
            valorAtual: novoValorAtual,
          }).pipe(
            switchMap(() => this.appwrite.createDocument<DepreciacaoDoc>('depreciacoes', registro)),
            map(created => ({ ...row, $id: created.$id })),
          );
        });

        forkJoin(ops).subscribe({
          next: (rows) => {
            this.aplicar(rows);
            this.loading.set(false);
            this.snackBar.open(`${rows.length} depreciações calculadas`, 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
          },
          error: (e) => {
            this.loading.set(false);
            this.snackBar.open(e?.message || 'Erro ao calcular', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] });
          },
        });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erro ao carregar bens', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] });
      },
    });
  }

  consultar() {
    if (!/^\d{4}-\d{2}$/.test(this.competencia)) {
      this.snackBar.open('Competência inválida (use YYYY-MM)', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }
    this.loading.set(true);
    const tenantId = this.auth.tenantId() || 'default';
    this.appwrite.listDocuments<DepreciacaoDoc>('depreciacoes', [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', tenantId),
      this.appwrite.query.equal('competencia', this.competencia),
    ]).subscribe({
      next: (docs) => {
        // A coleção `depreciacoes` não armazena a taxa; ela é derivada apenas no cálculo.
        const rows: DepreciacaoRow[] = docs.map(d => ({
          ...d,
          valorResidualAtual: d.valorAtual,
          taxaAplicada: 0,
        }));
        this.aplicar(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private aplicar(rows: DepreciacaoRow[]) {
    this.depreciacoes.set(rows);
    this.totalPeriodo.set(rows.reduce((s, d) => s + (d.valorDepreciacao || 0), 0));
    this.totalResidual.set(rows.reduce((s, d) => s + (d.valorResidualAtual || 0), 0));
  }
}
