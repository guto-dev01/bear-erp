import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContabilidadeService } from '../contabilidade.service';

interface LinhaBalancete {
  codigo: string;
  descricao: string;
  natureza: string;
  classificacao: string;
  nivel: number;
  saldoAnterior: number;
  debitos: number;
  creditos: number;
  saldoAtual: number;
}

@Component({
  selector: 'bear-balancete',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Balancete de Verificação</h1>
          <p class="page-header__subtitle">Demonstrativo dos saldos das contas contábeis</p>
        </div>
        <div class="page-header__actions">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <mat-form-field appearance="outline" style="width:100px;" subscriptSizing="dynamic">
              <mat-label>Mês</mat-label>
              <mat-select [(ngModel)]="mes">
                @for (m of meses; track m.value) { <mat-option [value]="m.value">{{ m.label }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:100px;" subscriptSizing="dynamic">
              <mat-label>Ano</mat-label>
              <mat-select [(ngModel)]="ano">
                @for (a of anos; track a) { <mat-option [value]="a">{{ a }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="gerar()">
              <span class="material-symbols-rounded text-lg mr-1.5">analytics</span> Gerar
            </button>
          </div>
        </div>
      </div>

      <!-- Summary -->
      @if (gerado()) {
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">account_balance</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Contas</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ linhas().length }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">trending_up</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Débitos</p><p class="text-xl font-bold" style="color:var(--text-primary)">{{ sumDebitos() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFECEB"><span class="material-symbols-rounded" style="color:#FF3B30">trending_down</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Créditos</p><p class="text-xl font-bold" style="color:var(--text-primary)">{{ sumCreditos() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" [style.background]="balanced() ? '#E9FAEF' : '#FFECEB'">
              <span class="material-symbols-rounded" [style.color]="balanced() ? '#34C759' : '#FF3B30'">{{ balanced() ? 'check_circle' : 'error' }}</span>
            </div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Verificação</p><p class="text-xl font-bold" style="color:var(--text-primary)">{{ balanced() ? 'Equilibrado' : 'Divergente' }}</p></div>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && !gerado()) {
        <div class="empty-state">
          <div class="empty-state__icon"><span class="material-symbols-rounded">balance</span></div>
          <h3 class="empty-state__title">Selecione o período</h3>
          <p class="empty-state__description">Escolha mês e ano para gerar o balancete de verificação</p>
        </div>
      }

      <!-- Balancete Table -->
      @if (!loading() && gerado() && linhas().length > 0) {
        <div class="bear-card overflow-hidden animate-fade-in-up">
          <div class="p-4 flex items-center justify-between" style="border-bottom:1px solid var(--border-subtle)">
            <h3 class="text-heading text-sm">Balancete {{ meses[mes - 1]?.label }}/{{ ano }}</h3>
            <button class="bear-btn bear-btn--outline" style="padding:0.375rem 0.75rem;font-size:0.75rem;" matTooltip="Exportar PDF">
              <span class="material-symbols-rounded text-sm mr-1">picture_as_pdf</span> Exportar
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full" style="border-collapse:collapse;">
              <thead>
                <tr style="background:var(--surface-1);">
                  <th class="text-left text-xs font-semibold p-3" style="color:var(--text-secondary);width:80px;">Código</th>
                  <th class="text-left text-xs font-semibold p-3" style="color:var(--text-secondary);">Descrição</th>
                  <th class="text-right text-xs font-semibold p-3" style="color:var(--text-secondary);width:130px;">Saldo Anterior</th>
                  <th class="text-right text-xs font-semibold p-3" style="color:var(--text-secondary);width:130px;">Débitos</th>
                  <th class="text-right text-xs font-semibold p-3" style="color:var(--text-secondary);width:130px;">Créditos</th>
                  <th class="text-right text-xs font-semibold p-3" style="color:var(--text-secondary);width:130px;">Saldo Atual</th>
                </tr>
              </thead>
              <tbody>
                @for (l of linhas(); track l.codigo) {
                  <tr style="border-bottom:1px solid var(--border-subtle);"
                      [style.background]="l.nivel <= 2 ? 'var(--surface-1)' : 'transparent'"
                      [style.font-weight]="l.nivel <= 2 ? '600' : '400'">
                    <td class="p-3 font-mono text-xs" style="color:var(--text-tertiary)">{{ l.codigo }}</td>
                    <td class="p-3 text-sm" [style.padding-left.px]="12 + l.nivel * 16" style="color:var(--text-primary)">{{ l.descricao }}</td>
                    <td class="p-3 text-sm text-right font-mono" style="color:var(--text-secondary)">{{ l.saldoAnterior | currency:'BRL' }}</td>
                    <td class="p-3 text-sm text-right font-mono" style="color:#34C759">{{ l.debitos | currency:'BRL' }}</td>
                    <td class="p-3 text-sm text-right font-mono" style="color:#FF3B30">{{ l.creditos | currency:'BRL' }}</td>
                    <td class="p-3 text-sm text-right font-mono font-semibold" [style.color]="l.saldoAtual >= 0 ? 'var(--text-primary)' : '#FF3B30'">
                      {{ l.saldoAtual | currency:'BRL' }}
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr style="background:var(--surface-2);border-top:2px solid var(--border-color);">
                  <td class="p-3 font-bold text-sm" colspan="2" style="color:var(--text-primary)">TOTAIS</td>
                  <td class="p-3 text-sm text-right font-mono font-bold" style="color:var(--text-primary)">{{ sumSaldoAnterior() | currency:'BRL' }}</td>
                  <td class="p-3 text-sm text-right font-mono font-bold" style="color:#34C759">{{ sumDebitos() | currency:'BRL' }}</td>
                  <td class="p-3 text-sm text-right font-mono font-bold" style="color:#FF3B30">{{ sumCreditos() | currency:'BRL' }}</td>
                  <td class="p-3 text-sm text-right font-mono font-bold" style="color:var(--text-primary)">{{ sumSaldoAtual() | currency:'BRL' }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class BalanceteComponent {
  loading = signal(false);
  gerado = signal(false);
  linhas = signal<LinhaBalancete[]>([]);
  balanced = signal(true);

  ano = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  anos = [2024, 2025, 2026];
  meses = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Fev' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Set' },
    { value: 10, label: 'Out' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dez' },
  ];

  sumDebitos = signal(0);
  sumCreditos = signal(0);
  sumSaldoAnterior = signal(0);
  sumSaldoAtual = signal(0);

  constructor(private service: ContabilidadeService, private snackBar: MatSnackBar) {}

  gerar() {
    this.loading.set(true);
    this.service.gerarBalancete(this.ano, this.mes).subscribe({
      next: (data) => {
        const items: LinhaBalancete[] = data.linhas || data || [];
        this.linhas.set(items);
        const deb = items.reduce((s, l) => s + (l.debitos || 0), 0);
        const cred = items.reduce((s, l) => s + (l.creditos || 0), 0);
        this.sumDebitos.set(deb);
        this.sumCreditos.set(cred);
        this.sumSaldoAnterior.set(items.reduce((s, l) => s + (l.saldoAnterior || 0), 0));
        this.sumSaldoAtual.set(items.reduce((s, l) => s + (l.saldoAtual || 0), 0));
        this.balanced.set(Math.abs(deb - cred) < 0.01);
        this.gerado.set(true);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.snackBar.open(e.error?.message || 'Erro ao gerar balancete', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] });
      },
    });
  }
}
