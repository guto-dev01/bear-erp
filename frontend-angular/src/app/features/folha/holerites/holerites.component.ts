import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { forkJoin } from 'rxjs';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';
import { FaixaInss, FaixaIrrf, calcularInss, calcularIrrf, calcularFgts, round2 } from '../folha-calc';

interface FuncionarioDoc {
  $id: string;
  nome: string;
  cargo?: string;
  salario: number;
  dependentes?: number;
  status: string;
  valeTransporte?: number;
  valeRefeicao?: number;
}

interface HoleriteDoc {
  $id: string;
  funcionarioId: string;
  funcionarioNome?: string;
  competencia: string;
  salarioBase: number;
  totalProventos?: number;
  totalDescontos?: number;
  valorLiquido?: number;
  inss?: number;
  irrf?: number;
  fgts?: number;
  status: string;
  $createdAt: string;
}

@Component({
  selector: 'bear-holerites',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSnackBarModule, MatExpansionModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Holerites</h1>
          <p class="page-header__subtitle">Processamento e consulta da folha de pagamento</p>
        </div>
      </div>

      <div class="bear-card mb-6">
        <div class="p-6">
          <h2 class="text-heading mb-4">Processar Folha</h2>
          <form [formGroup]="form" class="flex gap-4 items-end">
            <mat-form-field appearance="outline"><mat-label>Ano</mat-label><input matInput type="number" formControlName="ano"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Mês</mat-label><input matInput type="number" formControlName="mes" min="1" max="12"></mat-form-field>
            <button class="bear-btn bear-btn--primary" (click)="calcular()" [disabled]="form.invalid || processing()">
              <span class="material-symbols-rounded">calculate</span> Calcular Folha
            </button>
            <button class="bear-btn bear-btn--outline" (click)="fechar()" [disabled]="form.invalid || processing()">
              <span class="material-symbols-rounded">lock</span> Fechar Folha
            </button>
            <button class="bear-btn bear-btn--ghost" (click)="buscarHolerites()" [disabled]="form.invalid">
              <span class="material-symbols-rounded">search</span> Buscar Holerites
            </button>
          </form>
        </div>
      </div>

      @if (processing()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      @if (resumo()) {
        <div class="grid grid-cols-4 gap-4 mb-6 animate-fade-in-up">
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-blue-700">group</span>
              </div>
              <div>
                <p class="text-label">Funcionários</p>
                <p class="text-heading">{{ resumo().totalFuncionarios }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-green-700">trending_up</span>
              </div>
              <div>
                <p class="text-label">Total Proventos</p>
                <p class="text-heading">{{ resumo().totalProventos | currency:'BRL' }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-red-700">trending_down</span>
              </div>
              <div>
                <p class="text-label">Total Descontos</p>
                <p class="text-heading">{{ resumo().totalDescontos | currency:'BRL' }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-amber-700">account_balance_wallet</span>
              </div>
              <div>
                <p class="text-label">Total Líquido</p>
                <p class="text-heading">{{ resumo().totalLiquido | currency:'BRL' }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-indigo-700">shield</span>
              </div>
              <div>
                <p class="text-label">INSS Empregado</p>
                <p class="text-heading">{{ resumo().totalInss | currency:'BRL' }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-purple-700">receipt_long</span>
              </div>
              <div>
                <p class="text-label">IRRF</p>
                <p class="text-heading">{{ resumo().totalIrrf | currency:'BRL' }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-teal-700">savings</span>
              </div>
              <div>
                <p class="text-label">FGTS</p>
                <p class="text-heading">{{ resumo().totalFgts | currency:'BRL' }}</p>
              </div>
            </div>
          </div>
        </div>
      }

      @if (holerites().length > 0) {
        <div class="bear-card">
          <div class="p-5 border-b border-[var(--border-subtle)]">
            <h2 class="text-heading">Holerites - {{ form.value.mes }}/{{ form.value.ano }}</h2>
          </div>
          <div class="p-0">
            @for (h of holerites(); track h.id) {
              <mat-expansion-panel>
                <mat-expansion-panel-header>
                  <mat-panel-title>{{ h.funcionarioNome }} ({{ h.funcionarioMatricula }})</mat-panel-title>
                  <mat-panel-description>{{ h.cargo }} - Líquido: {{ h.salarioLiquido | currency:'BRL' }}</mat-panel-description>
                </mat-expansion-panel-header>
                <div class="grid grid-cols-2 gap-6 p-4">
                  <div>
                    <h4 class="font-bold text-green-700 mb-2">Proventos</h4>
                    <table mat-table [dataSource]="h.proventos || []" class="w-full">
                      <ng-container matColumnDef="descricao"><th mat-header-cell *matHeaderCellDef>Descrição</th><td mat-cell *matCellDef="let r">{{ r.descricao }}</td></ng-container>
                      <ng-container matColumnDef="referencia"><th mat-header-cell *matHeaderCellDef>Ref.</th><td mat-cell *matCellDef="let r">{{ r.referencia }}</td></ng-container>
                      <ng-container matColumnDef="valor"><th mat-header-cell *matHeaderCellDef>Valor</th><td mat-cell *matCellDef="let r">{{ r.valor | currency:'BRL' }}</td></ng-container>
                      <tr mat-header-row *matHeaderRowDef="rubricaCols"></tr>
                      <tr mat-row *matRowDef="let row; columns: rubricaCols;"></tr>
                    </table>
                    <p class="text-right font-bold mt-2 text-green-700">Total: {{ h.totalProventos | currency:'BRL' }}</p>
                  </div>
                  <div>
                    <h4 class="font-bold text-red-700 mb-2">Descontos</h4>
                    <table mat-table [dataSource]="h.descontos || []" class="w-full">
                      <ng-container matColumnDef="descricao"><th mat-header-cell *matHeaderCellDef>Descrição</th><td mat-cell *matCellDef="let r">{{ r.descricao }}</td></ng-container>
                      <ng-container matColumnDef="referencia"><th mat-header-cell *matHeaderCellDef>Ref.</th><td mat-cell *matCellDef="let r">{{ r.referencia }}</td></ng-container>
                      <ng-container matColumnDef="valor"><th mat-header-cell *matHeaderCellDef>Valor</th><td mat-cell *matCellDef="let r">{{ r.valor | currency:'BRL' }}</td></ng-container>
                      <tr mat-header-row *matHeaderRowDef="rubricaCols"></tr>
                      <tr mat-row *matRowDef="let row; columns: rubricaCols;"></tr>
                    </table>
                    <p class="text-right font-bold mt-2 text-red-700">Total: {{ h.totalDescontos | currency:'BRL' }}</p>
                  </div>
                </div>
                <div class="p-4 border-t bg-gray-50 grid grid-cols-4 gap-4 text-center">
                  <div><span class="text-label">Base INSS</span><p class="font-bold">{{ h.baseInss | currency:'BRL' }}</p></div>
                  <div><span class="text-label">INSS</span><p class="font-bold">{{ h.valorInss | currency:'BRL' }}</p></div>
                  <div><span class="text-label">Base IRRF</span><p class="font-bold">{{ h.baseIrrf | currency:'BRL' }}</p></div>
                  <div><span class="text-label">IRRF</span><p class="font-bold">{{ h.valorIrrf | currency:'BRL' }}</p></div>
                </div>
              </mat-expansion-panel>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class HoleritesComponent {
  form: FormGroup;
  resumo = signal<any>(null); holerites = signal<any[]>([]); processing = signal(false);
  rubricaCols = ['descricao', 'referencia', 'valor'];

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    const now = new Date();
    this.form = this.fb.group({
      ano: [now.getFullYear(), Validators.required],
      mes: [now.getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    });
  }

  private competencia(): string {
    const { ano, mes } = this.form.value;
    return `${String(mes).padStart(2, '0')}/${ano}`;
  }

  private baseQueries() {
    const Q = this.appwrite.query;
    const queries = [Q.limit(100), Q.orderDesc('$createdAt'), Q.equal('tenantId', this.auth.tenantId() || 'default')];
    const empresaId = this.auth.empresaId();
    if (empresaId) queries.push(Q.equal('empresaId', empresaId));
    return queries;
  }

  /** Calcula a folha do mês para todos os funcionários ativos e persiste os holerites. */
  calcular() {
    if (this.form.invalid) return;
    this.processing.set(true);
    const Q = this.appwrite.query;
    const tenant = this.auth.tenantId() || 'default';
    forkJoin({
      funcionarios: this.appwrite.listDocuments<FuncionarioDoc>('funcionarios', this.baseQueries()),
      inss: this.appwrite.listDocuments<FaixaInss>('tabela_inss', [Q.limit(100), Q.equal('tenantId', tenant)]),
      irrf: this.appwrite.listDocuments<FaixaIrrf>('tabela_irrf', [Q.limit(100), Q.equal('tenantId', tenant)]),
    }).subscribe({
      next: ({ funcionarios, inss, irrf }) => {
        const ativos = funcionarios.filter(f => f.status === 'ATIVO');
        if (!ativos.length) {
          this.processing.set(false);
          this.snackBar.open('Nenhum funcionário ativo para processar', 'OK', { duration: 3000 });
          return;
        }
        const competencia = this.competencia();
        const persists = ativos.map(f => {
          const calc = this.calcularHolerite(f, inss, irrf);
          const data: Record<string, unknown> = {
            funcionarioId: f.$id,
            funcionarioNome: f.nome,
            competencia,
            salarioBase: f.salario,
            totalProventos: calc.totalProventos,
            totalDescontos: calc.totalDescontos,
            valorLiquido: calc.valorLiquido,
            inss: calc.inss,
            irrf: calc.irrf,
            fgts: calc.fgts,
            valeTransporte: calc.valeTransporte,
            valeRefeicao: calc.valeRefeicao,
            status: 'CALCULADO',
            empresaId: this.auth.empresaId() || '',
            tenantId: tenant,
          };
          return this.appwrite.createDocument<HoleriteDoc>('holerites', data);
        });
        forkJoin(persists).subscribe({
          next: () => {
            this.processing.set(false);
            this.snackBar.open('Folha calculada!', 'OK', { duration: 3000 });
            this.buscarHolerites();
          },
          error: (e) => { this.processing.set(false); this.snackBar.open(e?.message || 'Erro ao calcular folha', 'OK', { duration: 3000 }); },
        });
      },
      error: () => { this.processing.set(false); this.snackBar.open('Erro ao calcular folha', 'OK', { duration: 3000 }); },
    });
  }

  /** Cálculo de um holerite individual: salário base, INSS, IRRF, FGTS, líquido. */
  private calcularHolerite(f: FuncionarioDoc, inss: FaixaInss[], irrf: FaixaIrrf[]) {
    const salarioBase = f.salario || 0;
    const valorInss = calcularInss(salarioBase, inss);
    const { base: baseIrrf, valor: valorIrrf } = calcularIrrf(salarioBase, valorInss, f.dependentes ?? 0, irrf);
    const fgts = calcularFgts(salarioBase);
    const valeTransporte = round2(salarioBase * 0.06); // desconto VT (máx. 6% do salário)
    const valeRefeicao = f.valeRefeicao ?? 0;
    const totalProventos = round2(salarioBase);
    const totalDescontos = round2(valorInss + valorIrrf + valeTransporte);
    const valorLiquido = round2(totalProventos - totalDescontos);
    return {
      inss: valorInss, irrf: valorIrrf, fgts, baseIrrf,
      valeTransporte, valeRefeicao,
      totalProventos, totalDescontos, valorLiquido,
    };
  }

  /** "Fechar folha" = marca todos os holerites da competência como FECHADO. */
  fechar() {
    if (this.form.invalid) return;
    this.processing.set(true);
    const Q = this.appwrite.query;
    const queries = [...this.baseQueries(), Q.equal('competencia', this.competencia())];
    this.appwrite.listDocuments<HoleriteDoc>('holerites', queries).subscribe({
      next: (docs) => {
        if (!docs.length) {
          this.processing.set(false);
          this.snackBar.open('Nenhum holerite para fechar nesta competência', 'OK', { duration: 3000 });
          return;
        }
        forkJoin(docs.map(d => this.appwrite.updateDocument('holerites', d.$id, { status: 'FECHADO' }))).subscribe({
          next: () => { this.processing.set(false); this.snackBar.open('Folha fechada!', 'OK', { duration: 3000 }); this.buscarHolerites(); },
          error: () => { this.processing.set(false); this.snackBar.open('Erro ao fechar folha', 'OK', { duration: 3000 }); },
        });
      },
      error: () => { this.processing.set(false); this.snackBar.open('Erro ao fechar folha', 'OK', { duration: 3000 }); },
    });
  }

  buscarHolerites() {
    const Q = this.appwrite.query;
    const queries = [...this.baseQueries(), Q.equal('competencia', this.competencia())];
    this.appwrite.listDocuments<HoleriteDoc>('holerites', queries).subscribe({
      next: (docs) => {
        const view = docs.map(h => this.toView(h));
        this.holerites.set(view);
        this.resumo.set(this.montarResumo(docs));
      },
      error: () => { this.holerites.set([]); this.resumo.set(null); },
    });
  }

  /** Monta o objeto de visualização do holerite (proventos/descontos para as tabelas). */
  private toView(h: HoleriteDoc) {
    const inss = h.inss ?? 0;
    const irrf = h.irrf ?? 0;
    const vt = round2((h.salarioBase || 0) * 0.06);
    const proventos = [
      { descricao: 'Salário Base', referencia: '30 dias', valor: h.salarioBase },
    ];
    const descontos = [
      { descricao: 'INSS', referencia: '', valor: inss },
      { descricao: 'IRRF', referencia: '', valor: irrf },
      { descricao: 'Vale Transporte', referencia: '6%', valor: vt },
    ].filter(d => d.valor > 0);
    return {
      ...h,
      id: h.$id,
      cargo: '',
      funcionarioMatricula: h.funcionarioId?.slice(-4) ?? '',
      salarioLiquido: h.valorLiquido,
      baseInss: h.salarioBase,
      valorInss: inss,
      baseIrrf: round2((h.salarioBase || 0) - inss),
      valorIrrf: irrf,
      proventos,
      descontos,
      totalProventos: h.totalProventos,
      totalDescontos: h.totalDescontos,
    };
  }

  private montarResumo(docs: HoleriteDoc[]) {
    return {
      totalFuncionarios: docs.length,
      totalProventos: round2(docs.reduce((s, d) => s + (d.totalProventos || 0), 0)),
      totalDescontos: round2(docs.reduce((s, d) => s + (d.totalDescontos || 0), 0)),
      totalLiquido: round2(docs.reduce((s, d) => s + (d.valorLiquido || 0), 0)),
      totalInss: round2(docs.reduce((s, d) => s + (d.inss || 0), 0)),
      totalIrrf: round2(docs.reduce((s, d) => s + (d.irrf || 0), 0)),
      totalFgts: round2(docs.reduce((s, d) => s + (d.fgts || 0), 0)),
    };
  }
}
