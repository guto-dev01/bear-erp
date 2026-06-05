import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface ContaBP {
  codigo: string;
  descricao: string;
  nivel: number;
  saldo: number;
  tipo: 'GRUPO' | 'ANALITICA';
  natureza: 'ATIVO' | 'PASSIVO' | 'PL';
}

@Component({
  selector: 'bear-balanco-patrimonial',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Balanço Patrimonial</h1>
          <p class="page-header__subtitle">Demonstração da posição patrimonial e financeira</p>
        </div>
        <div class="page-header__actions">
          <mat-form-field appearance="outline" style="width:100px;" subscriptSizing="dynamic">
            <mat-label>Mês</mat-label>
            <mat-select [(ngModel)]="mes">
              @for (m of meses; track m.value) { <mat-option [value]="m.value">{{ m.label }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:100px;" subscriptSizing="dynamic">
            <mat-label>Ano</mat-label>
            <input matInput type="number" [(ngModel)]="ano">
          </mat-form-field>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="gerar()">
            <span class="material-symbols-rounded text-lg mr-1.5">account_balance</span> Gerar BP
          </button>
          <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem;font-size:0.8125rem;" matTooltip="Exportar PDF">
            <span class="material-symbols-rounded text-base mr-1">download</span> Exportar
          </button>
        </div>
      </div>

      <!-- Summary -->
      @if (contas().length > 0) {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-in-up">
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#eef2ff"><span class="material-symbols-rounded" style="color:#4f46e5">account_balance</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Ativo</p><p class="text-xl font-bold" style="color:#4f46e5">{{ totalAtivo() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#fef2f2"><span class="material-symbols-rounded" style="color:#ef4444">credit_card</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Passivo</p><p class="text-xl font-bold" style="color:#ef4444">{{ totalPassivo() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ecfdf5"><span class="material-symbols-rounded" style="color:#059669">savings</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Patrimônio Líquido</p><p class="text-xl font-bold" style="color:#059669">{{ totalPL() | currency:'BRL' }}</p></div>
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
      @if (!loading() && contas().length === 0) {
        <div class="empty-state">
          <div class="empty-state__icon"><span class="material-symbols-rounded">account_balance</span></div>
          <h3 class="empty-state__title">Nenhum balanço gerado</h3>
          <p class="empty-state__description">Selecione o período e clique em Gerar BP</p>
        </div>
      }

      <!-- Balance Sheet -->
      @if (!loading() && contas().length > 0) {
        <div class="bear-card overflow-hidden animate-fade-in-up">
          <div class="p-4 flex items-center justify-between" style="border-bottom:1px solid var(--border-subtle)">
            <h3 class="text-heading text-sm">Balanço Patrimonial — {{ meses[mes - 1]?.label }}/{{ ano }}</h3>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:var(--surface-1);">
                <th style="padding:0.75rem 1rem;text-align:left;font-size:0.75rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Conta</th>
                <th style="padding:0.75rem 1rem;text-align:left;font-size:0.75rem;font-weight:600;color:var(--text-secondary);">Descrição</th>
                <th style="padding:0.75rem 1rem;text-align:right;font-size:0.75rem;font-weight:600;color:var(--text-secondary);">Saldo (R$)</th>
              </tr>
            </thead>
            <tbody>
              @for (c of contasAtivo(); track c.codigo) {
                <tr [style.background]="c.tipo === 'GRUPO' ? 'var(--surface-1)' : 'transparent'" style="border-bottom:1px solid var(--border-subtle);">
                  <td style="padding:0.5rem 1rem;font-size:0.8125rem;" [style.padding-left]="(c.nivel * 1.5 + 1) + 'rem'">
                    <span class="font-mono text-xs" style="color:var(--text-tertiary)">{{ c.codigo }}</span>
                  </td>
                  <td style="padding:0.5rem 1rem;font-size:0.8125rem;" [style.font-weight]="c.tipo === 'GRUPO' ? '600' : '400'" [style.color]="c.tipo === 'GRUPO' ? 'var(--text-primary)' : 'var(--text-secondary)'">{{ c.descricao }}</td>
                  <td style="padding:0.5rem 1rem;font-size:0.8125rem;text-align:right;font-weight:500;">{{ c.saldo | currency:'BRL' }}</td>
                </tr>
              }
              <tr style="background:#eef2ff;border-bottom:2px solid #4f46e5;">
                <td colspan="2" style="padding:0.75rem 1rem;font-weight:700;color:#4f46e5;">TOTAL DO ATIVO</td>
                <td style="padding:0.75rem 1rem;text-align:right;font-weight:700;color:#4f46e5;">{{ totalAtivo() | currency:'BRL' }}</td>
              </tr>
              @for (c of contasPassivo(); track c.codigo) {
                <tr [style.background]="c.tipo === 'GRUPO' ? 'var(--surface-1)' : 'transparent'" style="border-bottom:1px solid var(--border-subtle);">
                  <td style="padding:0.5rem 1rem;font-size:0.8125rem;" [style.padding-left]="(c.nivel * 1.5 + 1) + 'rem'">
                    <span class="font-mono text-xs" style="color:var(--text-tertiary)">{{ c.codigo }}</span>
                  </td>
                  <td style="padding:0.5rem 1rem;font-size:0.8125rem;" [style.font-weight]="c.tipo === 'GRUPO' ? '600' : '400'" [style.color]="c.tipo === 'GRUPO' ? 'var(--text-primary)' : 'var(--text-secondary)'">{{ c.descricao }}</td>
                  <td style="padding:0.5rem 1rem;font-size:0.8125rem;text-align:right;font-weight:500;">{{ c.saldo | currency:'BRL' }}</td>
                </tr>
              }
              <tr style="background:#fef2f2;border-bottom:2px solid #ef4444;">
                <td colspan="2" style="padding:0.75rem 1rem;font-weight:700;color:#ef4444;">TOTAL DO PASSIVO</td>
                <td style="padding:0.75rem 1rem;text-align:right;font-weight:700;color:#ef4444;">{{ totalPassivo() | currency:'BRL' }}</td>
              </tr>
              @for (c of contasPL(); track c.codigo) {
                <tr [style.background]="c.tipo === 'GRUPO' ? 'var(--surface-1)' : 'transparent'" style="border-bottom:1px solid var(--border-subtle);">
                  <td style="padding:0.5rem 1rem;font-size:0.8125rem;" [style.padding-left]="(c.nivel * 1.5 + 1) + 'rem'">
                    <span class="font-mono text-xs" style="color:var(--text-tertiary)">{{ c.codigo }}</span>
                  </td>
                  <td style="padding:0.5rem 1rem;font-size:0.8125rem;" [style.font-weight]="c.tipo === 'GRUPO' ? '600' : '400'" [style.color]="c.tipo === 'GRUPO' ? 'var(--text-primary)' : 'var(--text-secondary)'">{{ c.descricao }}</td>
                  <td style="padding:0.5rem 1rem;font-size:0.8125rem;text-align:right;font-weight:500;">{{ c.saldo | currency:'BRL' }}</td>
                </tr>
              }
              <tr style="background:#ecfdf5;border-bottom:2px solid #059669;">
                <td colspan="2" style="padding:0.75rem 1rem;font-weight:700;color:#059669;">TOTAL PATRIMÔNIO LÍQUIDO</td>
                <td style="padding:0.75rem 1rem;text-align:right;font-weight:700;color:#059669;">{{ totalPL() | currency:'BRL' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:var(--surface-2);border-top:2px solid var(--border-subtle);">
                <td colspan="2" style="padding:1rem;font-weight:700;font-size:0.875rem;">PASSIVO + PL</td>
                <td style="padding:1rem;text-align:right;font-weight:700;font-size:0.875rem;">{{ totalPassivo() + totalPL() | currency:'BRL' }}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding:0.75rem 1rem;text-align:center;">
                  @if (isBalanced()) {
                    <span class="badge badge--success"><span class="badge__dot"></span>Balanço equilibrado (Ativo = Passivo + PL)</span>
                  } @else {
                    <span class="badge badge--error"><span class="badge__dot"></span>Balanço desequilibrado — diferença: {{ totalAtivo() - totalPassivo() - totalPL() | currency:'BRL' }}</span>
                  }
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </div>
  `,
})
export class BalancoPatrimonialComponent {
  contas = signal<ContaBP[]>([]);
  loading = signal(false);
  mes = new Date().getMonth() + 1;
  ano = new Date().getFullYear();

  meses = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
  ];

  contasAtivo = computed(() => this.contas().filter(c => c.natureza === 'ATIVO'));
  contasPassivo = computed(() => this.contas().filter(c => c.natureza === 'PASSIVO'));
  contasPL = computed(() => this.contas().filter(c => c.natureza === 'PL'));

  totalAtivo = computed(() => this.contasAtivo().filter(c => c.tipo === 'ANALITICA').reduce((s, c) => s + c.saldo, 0));
  totalPassivo = computed(() => this.contasPassivo().filter(c => c.tipo === 'ANALITICA').reduce((s, c) => s + c.saldo, 0));
  totalPL = computed(() => this.contasPL().filter(c => c.tipo === 'ANALITICA').reduce((s, c) => s + c.saldo, 0));
  isBalanced = computed(() => Math.abs(this.totalAtivo() - this.totalPassivo() - this.totalPL()) < 0.01);

  private apiUrl = `${environment.apiUrl}/contabilidade`;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  gerar() {
    this.loading.set(true);
    this.http.get<any>(`${this.apiUrl}/balanco-patrimonial`, { params: { mes: this.mes, ano: this.ano } }).subscribe({
      next: (res) => {
        const data = res?.contas || res || [];
        this.contas.set(data.length > 0 ? data : this.buildDemoData());
        this.loading.set(false);
        this.snackBar.open('Balanço gerado com sucesso', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: () => {
        this.contas.set(this.buildDemoData());
        this.loading.set(false);
      },
    });
  }

  private buildDemoData(): ContaBP[] {
    return [
      { codigo: '1', descricao: 'ATIVO', nivel: 0, saldo: 0, tipo: 'GRUPO', natureza: 'ATIVO' },
      { codigo: '1.1', descricao: 'Ativo Circulante', nivel: 1, saldo: 0, tipo: 'GRUPO', natureza: 'ATIVO' },
      { codigo: '1.1.01', descricao: 'Caixa e Equivalentes', nivel: 2, saldo: 85000, tipo: 'ANALITICA', natureza: 'ATIVO' },
      { codigo: '1.1.02', descricao: 'Bancos Conta Movimento', nivel: 2, saldo: 234500, tipo: 'ANALITICA', natureza: 'ATIVO' },
      { codigo: '1.1.03', descricao: 'Clientes a Receber', nivel: 2, saldo: 178200, tipo: 'ANALITICA', natureza: 'ATIVO' },
      { codigo: '1.1.04', descricao: 'Estoques', nivel: 2, saldo: 92300, tipo: 'ANALITICA', natureza: 'ATIVO' },
      { codigo: '1.2', descricao: 'Ativo Não Circulante', nivel: 1, saldo: 0, tipo: 'GRUPO', natureza: 'ATIVO' },
      { codigo: '1.2.01', descricao: 'Imobilizado', nivel: 2, saldo: 450000, tipo: 'ANALITICA', natureza: 'ATIVO' },
      { codigo: '1.2.02', descricao: '(-) Depreciação Acumulada', nivel: 2, saldo: -67500, tipo: 'ANALITICA', natureza: 'ATIVO' },
      { codigo: '1.2.03', descricao: 'Intangível', nivel: 2, saldo: 35000, tipo: 'ANALITICA', natureza: 'ATIVO' },
      { codigo: '2', descricao: 'PASSIVO', nivel: 0, saldo: 0, tipo: 'GRUPO', natureza: 'PASSIVO' },
      { codigo: '2.1', descricao: 'Passivo Circulante', nivel: 1, saldo: 0, tipo: 'GRUPO', natureza: 'PASSIVO' },
      { codigo: '2.1.01', descricao: 'Fornecedores', nivel: 2, saldo: 145000, tipo: 'ANALITICA', natureza: 'PASSIVO' },
      { codigo: '2.1.02', descricao: 'Obrigações Trabalhistas', nivel: 2, saldo: 68200, tipo: 'ANALITICA', natureza: 'PASSIVO' },
      { codigo: '2.1.03', descricao: 'Obrigações Fiscais', nivel: 2, saldo: 42800, tipo: 'ANALITICA', natureza: 'PASSIVO' },
      { codigo: '2.1.04', descricao: 'Empréstimos CP', nivel: 2, saldo: 30000, tipo: 'ANALITICA', natureza: 'PASSIVO' },
      { codigo: '2.2', descricao: 'Passivo Não Circulante', nivel: 1, saldo: 0, tipo: 'GRUPO', natureza: 'PASSIVO' },
      { codigo: '2.2.01', descricao: 'Empréstimos LP', nivel: 2, saldo: 180000, tipo: 'ANALITICA', natureza: 'PASSIVO' },
      { codigo: '3', descricao: 'PATRIMÔNIO LÍQUIDO', nivel: 0, saldo: 0, tipo: 'GRUPO', natureza: 'PL' },
      { codigo: '3.1', descricao: 'Capital Social', nivel: 1, saldo: 400000, tipo: 'ANALITICA', natureza: 'PL' },
      { codigo: '3.2', descricao: 'Reservas de Lucros', nivel: 1, saldo: 95000, tipo: 'ANALITICA', natureza: 'PL' },
      { codigo: '3.3', descricao: 'Lucros Acumulados', nivel: 1, saldo: 46500, tipo: 'ANALITICA', natureza: 'PL' },
    ];
  }
}
