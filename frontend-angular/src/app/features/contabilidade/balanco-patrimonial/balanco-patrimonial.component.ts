import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ContabilidadeService, ContaBP } from '../contabilidade.service';

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
            <div class="stat-icon stat-icon--brand"><span class="material-symbols-rounded">account_balance</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Ativo</p><p class="text-xl font-bold ink-brand">{{ totalAtivo() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="stat-icon stat-icon--error"><span class="material-symbols-rounded">credit_card</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Passivo</p><p class="text-xl font-bold ink-error">{{ totalPassivo() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="stat-icon stat-icon--success"><span class="material-symbols-rounded">savings</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Patrimônio Líquido</p><p class="text-xl font-bold ink-success">{{ totalPL() | currency:'BRL' }}</p></div>
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
            <h3 class="text-heading text-sm">Balanço Patrimonial — {{ meses[mes - 1].label }}/{{ ano }}</h3>
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
              <tr style="background:#ECEBFB;border-bottom:2px solid #007AFF;">
                <td colspan="2" style="padding:0.75rem 1rem;font-weight:700;color:#007AFF;">TOTAL DO ATIVO</td>
                <td style="padding:0.75rem 1rem;text-align:right;font-weight:700;color:#007AFF;">{{ totalAtivo() | currency:'BRL' }}</td>
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
              <tr style="background:#FFECEB;border-bottom:2px solid #FF3B30;">
                <td colspan="2" style="padding:0.75rem 1rem;font-weight:700;color:#FF3B30;">TOTAL DO PASSIVO</td>
                <td style="padding:0.75rem 1rem;text-align:right;font-weight:700;color:#FF3B30;">{{ totalPassivo() | currency:'BRL' }}</td>
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
              <tr style="background:#E9FAEF;border-bottom:2px solid #34C759;">
                <td colspan="2" style="padding:0.75rem 1rem;font-weight:700;color:#34C759;">TOTAL PATRIMÔNIO LÍQUIDO</td>
                <td style="padding:0.75rem 1rem;text-align:right;font-weight:700;color:#34C759;">{{ totalPL() | currency:'BRL' }}</td>
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

  constructor(private service: ContabilidadeService, private snackBar: MatSnackBar) {}

  gerar() {
    this.loading.set(true);
    this.service.gerarBalancoMensal(this.ano, this.mes).subscribe({
      next: (res) => {
        this.contas.set(res.contas);
        this.loading.set(false);
        this.snackBar.open('Balanço gerado com sucesso', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: (e) => {
        this.loading.set(false);
        this.snackBar.open(e?.message || 'Erro ao gerar balanço', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] });
      },
    });
  }
}
