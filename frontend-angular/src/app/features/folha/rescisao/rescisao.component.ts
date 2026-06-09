import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';
import { FaixaInss, FaixaIrrf, calcularInss, calcularIrrf, round2 } from '../folha-calc';

interface FuncionarioDoc {
  $id: string;
  nome: string;
  salario: number;
  dependentes?: number;
  dataAdmissao: string;
  status: string;
}

@Component({
  selector: 'bear-rescisao',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTableModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Rescisão e 13º Salário</h1>
          <p class="page-header__subtitle">Cálculo de rescisão contratual e décimo terceiro</p>
        </div>
      </div>

      <!-- Tab Toggle -->
      <div class="flex gap-2 mb-6">
        <button class="bear-btn" [ngClass]="activeTab() === 'rescisao' ? 'bear-btn--primary' : 'bear-btn--outline'"
                style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="activeTab.set('rescisao')">
          <span class="material-symbols-rounded text-lg mr-1.5">person_off</span> Rescisão
        </button>
        <button class="bear-btn" [ngClass]="activeTab() === 'decimo' ? 'bear-btn--primary' : 'bear-btn--outline'"
                style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="activeTab.set('decimo')">
          <span class="material-symbols-rounded text-lg mr-1.5">card_giftcard</span> 13º Salário
        </button>
      </div>

      <!-- RESCISÃO TAB -->
      @if (activeTab() === 'rescisao') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Form -->
          <div class="bear-card p-6 animate-fade-in-up">
            <h2 class="text-heading text-lg mb-4">Dados da Rescisão</h2>
            <form [formGroup]="formRescisao">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Nome do Funcionário</mat-label><input matInput formControlName="funcionarioNome"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Data Admissão</mat-label><input matInput type="date" formControlName="dataAdmissao"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Data Demissão</mat-label><input matInput type="date" formControlName="dataDemissao"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Salário Base</mat-label><input matInput type="number" formControlName="salarioBase"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Motivo</mat-label>
                  <mat-select formControlName="motivoRescisao">
                    <mat-option value="SEM_JUSTA_CAUSA">Sem Justa Causa</mat-option>
                    <mat-option value="JUSTA_CAUSA">Justa Causa</mat-option>
                    <mat-option value="PEDIDO_DEMISSAO">Pedido de Demissão</mat-option>
                    <mat-option value="ACORDO_MUTUO">Acordo Mútuo</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="flex justify-end mt-4">
                <button type="button" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" (click)="calcularRescisao()" [disabled]="formRescisao.invalid">
                  <span class="material-symbols-rounded text-lg mr-1">calculate</span> Calcular
                </button>
              </div>
            </form>
          </div>

          <!-- Results -->
          @if (resultadoRescisao()) {
            <div class="bear-card p-6 animate-fade-in-up">
              <h2 class="text-heading text-lg mb-4">Resultado da Rescisão</h2>
              <div class="flex flex-col gap-3">
                @for (item of resultadoRescisao()!.itens; track item.descricao) {
                  <div class="flex items-center justify-between py-2" [style.border-bottom]="'1px solid var(--border-subtle)'">
                    <span class="text-sm" style="color:var(--text-secondary)">{{ item.descricao }}</span>
                    <span class="text-sm font-semibold" [style.color]="item.valor < 0 ? '#FF3B30' : 'var(--text-primary)'">{{ item.valor | currency:'BRL' }}</span>
                  </div>
                }
                <div class="flex items-center justify-between py-3 mt-2" style="border-top:2px solid var(--border-subtle);">
                  <span class="text-base font-bold" style="color:var(--text-primary)">Total Líquido</span>
                  <span class="text-xl font-bold" style="color:#34C759">{{ resultadoRescisao()!.totalLiquido | currency:'BRL' }}</span>
                </div>
              </div>
            </div>
          }
        </div>

        @if (loading()) {
          <div class="flex justify-center py-12">
            <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
          </div>
        }
      }

      <!-- 13º SALÁRIO TAB -->
      @if (activeTab() === 'decimo') {
        <div class="bear-card p-6 mb-6 animate-fade-in-up">
          <div class="flex items-center gap-4">
            <mat-form-field appearance="outline" style="width:120px;" subscriptSizing="dynamic">
              <mat-label>Ano</mat-label>
              <input matInput type="number" [(ngModel)]="anoDecimo">
            </mat-form-field>
            <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="calcularDecimo()">
              <span class="material-symbols-rounded text-lg mr-1.5">calculate</span> Calcular 13º
            </button>
          </div>
        </div>

        <!-- 13th Summary -->
        @if (decimoResultados().length > 0) {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-in-up">
            <div class="bear-card p-4 flex items-center gap-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">payments</span></div>
              <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Bruto</p><p class="text-xl font-bold" style="color:#007AFF">{{ decimoBruto() | currency:'BRL' }}</p></div>
            </div>
            <div class="bear-card p-4 flex items-center gap-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFECEB"><span class="material-symbols-rounded" style="color:#FF3B30">remove_circle</span></div>
              <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Descontos</p><p class="text-xl font-bold" style="color:#FF3B30">{{ decimoDescontos() | currency:'BRL' }}</p></div>
            </div>
            <div class="bear-card p-4 flex items-center gap-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">check_circle</span></div>
              <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Líquido</p><p class="text-xl font-bold" style="color:#34C759">{{ decimoLiquido() | currency:'BRL' }}</p></div>
            </div>
          </div>

          <div class="bear-card overflow-hidden animate-fade-in-up">
            <table mat-table [dataSource]="decimoResultados()" class="w-full">
              <ng-container matColumnDef="funcionario"><th mat-header-cell *matHeaderCellDef>Funcionário</th><td mat-cell *matCellDef="let d"><span class="font-medium">{{ d.funcionarioNome }}</span></td></ng-container>
              <ng-container matColumnDef="salarioBase"><th mat-header-cell *matHeaderCellDef>Salário Base</th><td mat-cell *matCellDef="let d">{{ d.salarioBase | currency:'BRL' }}</td></ng-container>
              <ng-container matColumnDef="meses"><th mat-header-cell *matHeaderCellDef>Meses</th><td mat-cell *matCellDef="let d" class="font-mono">{{ d.mesesTrabalhados }}/12</td></ng-container>
              <ng-container matColumnDef="valor13"><th mat-header-cell *matHeaderCellDef>Valor 13º</th><td mat-cell *matCellDef="let d" class="font-semibold">{{ d.valorDecimo | currency:'BRL' }}</td></ng-container>
              <ng-container matColumnDef="inss"><th mat-header-cell *matHeaderCellDef>INSS</th><td mat-cell *matCellDef="let d" style="color:#FF3B30">{{ d.inss | currency:'BRL' }}</td></ng-container>
              <ng-container matColumnDef="irrf"><th mat-header-cell *matHeaderCellDef>IRRF</th><td mat-cell *matCellDef="let d" style="color:#FF3B30">{{ d.irrf | currency:'BRL' }}</td></ng-container>
              <ng-container matColumnDef="liquido"><th mat-header-cell *matHeaderCellDef>Líquido</th><td mat-cell *matCellDef="let d" style="color:#34C759;font-weight:600;">{{ d.liquido | currency:'BRL' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="decimoColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: decimoColumns;"></tr>
            </table>
          </div>
        }

        @if (loading()) {
          <div class="flex justify-center py-12">
            <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
          </div>
        }

        @if (!loading() && decimoResultados().length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon"><span class="material-symbols-rounded">card_giftcard</span></div>
            <h3 class="empty-state__title">Nenhum cálculo realizado</h3>
            <p class="empty-state__description">Selecione o ano e clique em Calcular 13º</p>
          </div>
        }
      }
    </div>
  `,
})
export class RescisaoComponent {
  activeTab = signal<'rescisao' | 'decimo'>('rescisao');
  loading = signal(false);
  resultadoRescisao = signal<{ itens: { descricao: string; valor: number }[]; totalLiquido: number } | null>(null);
  decimoResultados = signal<any[]>([]);
  decimoBruto = signal(0);
  decimoDescontos = signal(0);
  decimoLiquido = signal(0);
  anoDecimo = new Date().getFullYear();
  decimoColumns = ['funcionario', 'salarioBase', 'meses', 'valor13', 'inss', 'irrf', 'liquido'];
  formRescisao!: FormGroup;
  private faixasInss: FaixaInss[] = [];
  private faixasIrrf: FaixaIrrf[] = [];

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.formRescisao = this.fb.group({
      funcionarioNome: ['', Validators.required],
      dataAdmissao: ['', Validators.required],
      dataDemissao: ['', Validators.required],
      salarioBase: [null, [Validators.required, Validators.min(1)]],
      motivoRescisao: ['SEM_JUSTA_CAUSA', Validators.required],
    });
    this.carregarTabelas();
  }

  private carregarTabelas() {
    const Q = this.appwrite.query;
    const tenant = this.auth.tenantId() || 'default';
    this.appwrite.listDocuments<FaixaInss>('tabela_inss', [Q.limit(100), Q.equal('tenantId', tenant)])
      .subscribe({ next: d => this.faixasInss = d, error: () => {} });
    this.appwrite.listDocuments<FaixaIrrf>('tabela_irrf', [Q.limit(100), Q.equal('tenantId', tenant)])
      .subscribe({ next: d => this.faixasIrrf = d, error: () => {} });
  }

  calcularRescisao() {
    if (this.formRescisao.invalid) return;
    this.loading.set(true);
    const data = this.formRescisao.value;
    const calc = this.calcularRescisaoLocal(data);
    this.resultadoRescisao.set(calc);
    // Persiste a rescisão calculada na coleção `rescisoes`.
    const doc = this.toRescisaoDoc(data, calc);
    this.appwrite.createDocument('rescisoes', doc).subscribe({
      next: () => { this.loading.set(false); this.snackBar.open('Rescisão calculada e salva!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); },
      error: (e) => { this.loading.set(false); this.snackBar.open(e?.message || 'Erro ao salvar rescisão', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }); },
    });
  }

  private valor(itens: { descricao: string; valor: number }[], desc: string): number {
    return Math.abs(itens.find(i => i.descricao === desc)?.valor ?? 0);
  }

  private toRescisaoDoc(data: any, calc: { itens: { descricao: string; valor: number }[]; totalLiquido: number }): Record<string, unknown> {
    const i = calc.itens;
    const proventos = i.filter(x => x.valor > 0).reduce((s, x) => s + x.valor, 0);
    const descontos = i.filter(x => x.valor < 0).reduce((s, x) => s + Math.abs(x.valor), 0);
    return {
      funcionarioId: data.funcionarioId || '',
      funcionarioNome: data.funcionarioNome,
      dataDesligamento: data.dataDemissao,
      tipo: data.motivoRescisao,
      saldoSalario: this.valor(i, 'Saldo de Salário'),
      avisoPreviolIndenizado: this.valor(i, 'Aviso Prévio Indenizado'),
      decimoTerceiroProporcional: this.valor(i, '13º Proporcional'),
      feriasProporcionais: this.valor(i, 'Férias Proporcionais'),
      tercoFerias: this.valor(i, '1/3 Constitucional Férias'),
      multaFgts: this.valor(i, 'Multa FGTS'),
      descontoInss: this.valor(i, 'INSS'),
      descontoIrrf: this.valor(i, 'IRRF'),
      totalProventos: round2(proventos),
      totalDescontos: round2(descontos),
      valorLiquido: round2(calc.totalLiquido),
      status: 'CALCULADA',
      empresaId: this.auth.empresaId() || '',
      tenantId: this.auth.tenantId() || 'default',
    };
  }

  private calcularRescisaoLocal(data: any): { itens: { descricao: string; valor: number }[]; totalLiquido: number } {
    const salario = data.salarioBase;
    const admissao = new Date(data.dataAdmissao);
    const demissao = new Date(data.dataDemissao);
    const diasMes = demissao.getDate();
    const mesesAno = demissao.getMonth() + 1;
    const anosTrabalho = (demissao.getTime() - admissao.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const motivo = data.motivoRescisao;

    const saldoSalario = round2((salario / 30) * diasMes);
    const avisoIndenizado = round2(motivo === 'SEM_JUSTA_CAUSA' ? salario : motivo === 'ACORDO_MUTUO' ? salario * 0.5 : 0);
    const feriasProp = round2((salario / 12) * mesesAno);
    const tercoFerias = round2(feriasProp / 3);
    const decimoProp = round2((salario / 12) * mesesAno);
    const fgtsMes = round2(salario * 0.08);
    const fgtsSaldo = fgtsMes * Math.max(anosTrabalho * 12, 1);
    const multa40 = round2(motivo === 'SEM_JUSTA_CAUSA' ? fgtsSaldo * 0.40 : motivo === 'ACORDO_MUTUO' ? fgtsSaldo * 0.20 : 0);

    // Descontos de INSS/IRRF incidem sobre o saldo de salário (verbas salariais).
    const inss = calcularInss(saldoSalario, this.faixasInss);
    const irrf = calcularIrrf(saldoSalario, inss, 0, this.faixasIrrf).valor;

    const itens = [
      { descricao: 'Saldo de Salário', valor: saldoSalario },
      { descricao: 'Aviso Prévio Indenizado', valor: avisoIndenizado },
      { descricao: 'Férias Proporcionais', valor: feriasProp },
      { descricao: '1/3 Constitucional Férias', valor: tercoFerias },
      { descricao: '13º Proporcional', valor: decimoProp },
      { descricao: 'FGTS sobre verbas', valor: fgtsMes },
      { descricao: 'Multa FGTS', valor: multa40 },
      { descricao: 'INSS', valor: -inss },
      { descricao: 'IRRF', valor: -irrf },
    ];
    const totalLiquido = round2(itens.reduce((s, i) => s + i.valor, 0));
    return { itens, totalLiquido };
  }

  calcularDecimo() {
    this.loading.set(true);
    const Q = this.appwrite.query;
    const tenant = this.auth.tenantId() || 'default';
    const queries = [Q.limit(100), Q.orderDesc('$createdAt'), Q.equal('tenantId', tenant)];
    const empresaId = this.auth.empresaId();
    if (empresaId) queries.push(Q.equal('empresaId', empresaId));
    this.appwrite.listDocuments<FuncionarioDoc>('funcionarios', queries).subscribe({
      next: (funcionarios) => {
        const ativos = funcionarios.filter(f => f.status === 'ATIVO');
        const res = ativos.map(f => this.calcularDecimoFuncionario(f));
        this.decimoResultados.set(res);
        this.decimoBruto.set(round2(res.reduce((s, d) => s + d.valorDecimo, 0)));
        this.decimoDescontos.set(round2(res.reduce((s, d) => s + d.inss + d.irrf, 0)));
        this.decimoLiquido.set(round2(res.reduce((s, d) => s + d.liquido, 0)));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.snackBar.open('Erro ao calcular 13º', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }); },
    });
  }

  /** 13º proporcional: meses trabalhados no ano (>= 15 dias conta o mês). */
  private calcularDecimoFuncionario(f: FuncionarioDoc) {
    const salarioBase = f.salario || 0;
    const admissao = new Date(f.dataAdmissao);
    let mesesTrabalhados = 12;
    if (admissao.getFullYear() === this.anoDecimo) {
      // mês de admissão conta se admitido até dia 15
      const mesAdm = admissao.getMonth() + (admissao.getDate() <= 15 ? 0 : 1);
      mesesTrabalhados = Math.max(0, 12 - mesAdm);
    } else if (admissao.getFullYear() > this.anoDecimo) {
      mesesTrabalhados = 0;
    }
    const valorDecimo = round2((salarioBase / 12) * mesesTrabalhados);
    const inss = calcularInss(valorDecimo, this.faixasInss);
    const irrf = calcularIrrf(valorDecimo, inss, f.dependentes ?? 0, this.faixasIrrf).valor;
    const liquido = round2(valorDecimo - inss - irrf);
    return { funcionarioNome: f.nome, salarioBase, mesesTrabalhados, valorDecimo, inss, irrf, liquido };
  }
}
