import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';
import { FaixaInss, FaixaIrrf, calcularInss, calcularIrrf, round2 } from '../folha-calc';

interface FuncionarioDoc {
  $id: string;
  nome: string;
  salario: number;
  dependentes?: number;
}

interface FeriasDoc {
  $id: string;
  funcionarioId: string;
  funcionarioNome?: string;
  periodoAquisitivoInicio?: string;
  periodoAquisitivoFim?: string;
  dataInicio: string;
  dataFim?: string;
  diasGozo: number;
  diasAbono?: number;
  abonoSolicitado?: boolean;
  valorFerias?: number;
  valorTerco?: number;
  valorAbono?: number;
  totalBruto?: number;
  descontoInss?: number;
  descontoIrrf?: number;
  valorLiquido?: number;
  status: string;
  $createdAt: string;
}

@Component({
  selector: 'bear-ferias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Férias</h1>
          <p class="page-header__subtitle">Gestão e programação de férias dos funcionários</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded">add</span> Programar Férias
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      @if (!showForm()) {
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-yellow-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-yellow-700">warning</span>
              </div>
              <div>
                <p class="text-label">Férias Vencidas</p>
                <p class="text-heading">{{ feriasVencidas().length }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-blue-700">event</span>
              </div>
              <div>
                <p class="text-label">Programadas</p>
                <p class="text-heading">{{ feriasProgramadas().length }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-green-700">beach_access</span>
              </div>
              <div>
                <p class="text-label">Em Gozo</p>
                <p class="text-heading">{{ feriasEmGozo().length }}</p>
              </div>
            </div>
          </div>
        </div>

        @if (feriasVencidas().length > 0) {
          <div class="bear-card mb-4">
            <div class="p-5 border-b border-[var(--border-subtle)]">
              <h2 class="text-heading" style="color: var(--color-warning, #b45309);">Férias Vencidas</h2>
            </div>
            <div class="p-0">
              <table mat-table [dataSource]="feriasVencidas()" class="w-full">
                <ng-container matColumnDef="funcionario"><th mat-header-cell *matHeaderCellDef class="!font-bold">Funcionário</th><td mat-cell *matCellDef="let f">{{ f.funcionarioNome }}</td></ng-container>
                <ng-container matColumnDef="periodoAquisitivo"><th mat-header-cell *matHeaderCellDef class="!font-bold">Período Aquisitivo</th><td mat-cell *matCellDef="let f">{{ f.periodoAquisitivoInicio | date:'dd/MM/yyyy' }} - {{ f.periodoAquisitivoFim | date:'dd/MM/yyyy' }}</td></ng-container>
                <ng-container matColumnDef="limiteConcessao"><th mat-header-cell *matHeaderCellDef class="!font-bold">Limite Concessão</th><td mat-cell *matCellDef="let f">{{ f.limiteConcessao | date:'dd/MM/yyyy' }}</td></ng-container>
                <ng-container matColumnDef="diasPendentes"><th mat-header-cell *matHeaderCellDef class="!font-bold">Dias Pendentes</th><td mat-cell *matCellDef="let f">{{ f.diasPendentes }}</td></ng-container>
                <tr mat-header-row *matHeaderRowDef="feriasVencidasCols"></tr>
                <tr mat-row *matRowDef="let row; columns: feriasVencidasCols;"></tr>
              </table>
            </div>
          </div>
        }

        <div class="bear-card">
          <div class="p-5 border-b border-[var(--border-subtle)]">
            <h2 class="text-heading">Férias Programadas e em Gozo</h2>
          </div>
          <div class="p-0">
            <table mat-table [dataSource]="ferias()" class="w-full">
              <ng-container matColumnDef="funcionario"><th mat-header-cell *matHeaderCellDef class="!font-bold">Funcionário</th><td mat-cell *matCellDef="let f">{{ f.funcionarioNome }}</td></ng-container>
              <ng-container matColumnDef="inicio"><th mat-header-cell *matHeaderCellDef class="!font-bold">Início</th><td mat-cell *matCellDef="let f">{{ f.dataInicio | date:'dd/MM/yyyy' }}</td></ng-container>
              <ng-container matColumnDef="fim"><th mat-header-cell *matHeaderCellDef class="!font-bold">Fim</th><td mat-cell *matCellDef="let f">{{ f.dataFim | date:'dd/MM/yyyy' }}</td></ng-container>
              <ng-container matColumnDef="dias"><th mat-header-cell *matHeaderCellDef class="!font-bold">Dias</th><td mat-cell *matCellDef="let f">{{ f.diasGozo }}</td></ng-container>
              <ng-container matColumnDef="abono"><th mat-header-cell *matHeaderCellDef class="!font-bold">Abono</th><td mat-cell *matCellDef="let f">{{ f.diasAbono || 0 }} dias</td></ng-container>
              <ng-container matColumnDef="valor"><th mat-header-cell *matHeaderCellDef class="!font-bold">Valor Total</th><td mat-cell *matCellDef="let f">{{ f.valorTotal | currency:'BRL' }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="!font-bold">Status</th>
                <td mat-cell *matCellDef="let f">
                  <span class="badge" [ngClass]="getStatusBadge(f.status)">
                    <span class="badge__dot"></span>{{ f.status }}
                  </span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card">
          <div class="p-5 border-b border-[var(--border-subtle)]">
            <h2 class="text-heading">Programar Férias</h2>
          </div>
          <div class="p-6">
            <form [formGroup]="form" (ngSubmit)="salvar()" class="grid grid-cols-2 gap-4">
              <mat-form-field appearance="outline"><mat-label>Funcionário (ID)</mat-label><input matInput formControlName="funcionarioId"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Data Início</mat-label><input matInput type="date" formControlName="dataInicio"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Dias de Gozo</mat-label><input matInput type="number" formControlName="diasGozo" min="5" max="30"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Dias Abono Pecuniário</mat-label><input matInput type="number" formControlName="diasAbono" min="0" max="10"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Adiantamento 13º</mat-label>
                <mat-select formControlName="adiantamento13"><mat-option [value]="true">Sim</mat-option><mat-option [value]="false">Não</mat-option></mat-select>
              </mat-form-field>
              <div></div>
              <div class="col-span-2 flex gap-3 justify-end">
                <button class="bear-btn bear-btn--ghost" type="button" (click)="showForm.set(false)">Cancelar</button>
                <button class="bear-btn bear-btn--primary" type="submit" [disabled]="form.invalid">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class FeriasComponent {
  ferias = signal<any[]>([]); feriasVencidas = signal<any[]>([]); feriasProgramadas = signal<any[]>([]);
  feriasEmGozo = signal<any[]>([]); loading = signal(false); showForm = signal(false);
  displayedColumns = ['funcionario', 'inicio', 'fim', 'dias', 'abono', 'valor', 'status'];
  feriasVencidasCols = ['funcionario', 'periodoAquisitivo', 'limiteConcessao', 'diasPendentes'];
  form!: FormGroup;
  private faixasInss: FaixaInss[] = [];
  private faixasIrrf: FaixaIrrf[] = [];

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      funcionarioId: ['', Validators.required], dataInicio: ['', Validators.required],
      diasGozo: [30, [Validators.required, Validators.min(5), Validators.max(30)]],
      diasAbono: [0, [Validators.min(0), Validators.max(10)]],
      adiantamento13: [false],
    });
    this.carregarTabelas();
    this.carregar();
  }

  private carregarTabelas() {
    const Q = this.appwrite.query;
    const tenant = this.auth.tenantId() || 'default';
    this.appwrite.listDocuments<FaixaInss>('tabela_inss', [Q.limit(100), Q.equal('tenantId', tenant)])
      .subscribe({ next: d => this.faixasInss = d, error: () => {} });
    this.appwrite.listDocuments<FaixaIrrf>('tabela_irrf', [Q.limit(100), Q.equal('tenantId', tenant)])
      .subscribe({ next: d => this.faixasIrrf = d, error: () => {} });
  }

  /** Mapeia documento Appwrite -> objeto de visualização compatível com o template. */
  private toView(d: FeriasDoc) {
    return {
      ...d,
      id: d.$id,
      valorTotal: d.totalBruto ?? 0,
      limiteConcessao: d.periodoAquisitivoFim,
      diasPendentes: d.diasGozo,
    };
  }

  carregar() {
    this.loading.set(true);
    const Q = this.appwrite.query;
    const queries = [Q.limit(100), Q.orderDesc('$createdAt'), Q.equal('tenantId', this.auth.tenantId() || 'default')];
    const empresaId = this.auth.empresaId();
    if (empresaId) queries.push(Q.equal('empresaId', empresaId));
    this.appwrite.listDocuments<FeriasDoc>('ferias', queries).subscribe({
      next: (docs) => {
        const all = docs.map(d => this.toView(d));
        this.ferias.set(all);
        this.feriasVencidas.set(all.filter(f => f.status === 'VENCIDA'));
        this.feriasProgramadas.set(all.filter(f => f.status === 'PROGRAMADA'));
        this.feriasEmGozo.set(all.filter(f => f.status === 'EM_GOZO'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ diasGozo: 30, diasAbono: 0, adiantamento13: false }); }

  salvar() {
    if (!this.form.valid) return;
    const v = this.form.value;
    // Busca o funcionário para obter salário e nome para o cálculo.
    this.appwrite.getDocument<FuncionarioDoc>('funcionarios', v.funcionarioId).subscribe({
      next: (func) => this.persistir(v, func),
      error: () => this.persistir(v, null),
    });
  }

  private persistir(v: any, func: FuncionarioDoc | null) {
    const salario = func?.salario ?? 0;
    const dependentes = func?.dependentes ?? 0;
    const calc = this.calcularFerias(salario, v.diasGozo, v.diasAbono || 0, dependentes);

    const inicio = new Date(v.dataInicio);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + (Number(v.diasGozo) || 0) - 1);

    const data: Record<string, unknown> = {
      funcionarioId: v.funcionarioId,
      funcionarioNome: func?.nome ?? '',
      dataInicio: v.dataInicio,
      dataFim: fim.toISOString().slice(0, 10),
      diasGozo: Number(v.diasGozo) || 0,
      diasAbono: Number(v.diasAbono) || 0,
      abonoSolicitado: (Number(v.diasAbono) || 0) > 0,
      valorFerias: calc.valorFerias,
      valorTerco: calc.valorTerco,
      valorAbono: calc.valorAbono,
      totalBruto: calc.totalBruto,
      descontoInss: calc.descontoInss,
      descontoIrrf: calc.descontoIrrf,
      valorLiquido: calc.valorLiquido,
      status: 'PROGRAMADA',
      empresaId: this.auth.empresaId() || '',
      tenantId: this.auth.tenantId() || 'default',
    };
    this.appwrite.createDocument('ferias', data).subscribe({
      next: () => { this.snackBar.open('Férias programadas!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
      error: (e) => this.snackBar.open(e?.message || 'Erro ao programar férias', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  /** Cálculo de férias: (salário/30 * diasGozo) + 1/3 + abono pecuniário; descontos de INSS/IRRF. */
  private calcularFerias(salario: number, diasGozo: number, diasAbono: number, dependentes: number) {
    const diaria = salario / 30;
    const valorFerias = round2(diaria * diasGozo);
    const valorTerco = round2(valorFerias / 3);
    const valorAbono = round2(diaria * diasAbono * (4 / 3)); // abono + 1/3 sobre o abono
    // Tributação incide sobre férias gozadas + 1/3 (o abono pecuniário é isento).
    const baseTributavel = round2(valorFerias + valorTerco);
    const descontoInss = calcularInss(baseTributavel, this.faixasInss);
    const descontoIrrf = calcularIrrf(baseTributavel, descontoInss, dependentes, this.faixasIrrf).valor;
    const totalBruto = round2(valorFerias + valorTerco + valorAbono);
    const valorLiquido = round2(totalBruto - descontoInss - descontoIrrf);
    return { valorFerias, valorTerco, valorAbono, totalBruto, descontoInss, descontoIrrf, valorLiquido };
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'PROGRAMADA': 'badge--info',
      'EM_GOZO': 'badge--success',
      'CONCLUIDA': 'badge--neutral',
      'VENCIDA': 'badge--warning',
      'CANCELADA': 'badge--error',
    };
    return map[s] || 'badge--neutral';
  }
}
