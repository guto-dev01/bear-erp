import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContabilidadeService } from '../contabilidade.service';

interface LinhaDre {
  descricao: string;
  valor: number;
  nivel: number;
  tipo: string; // RECEITA, DEDUCAO, CUSTO, DESPESA, RESULTADO
  destaque?: boolean;
}

@Component({
  selector: 'bear-dre',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatFormFieldModule,
    MatSelectModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">DRE - Demonstração do Resultado</h1>
          <p class="page-header__subtitle">Demonstração do resultado do exercício</p>
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
              <span class="material-symbols-rounded text-lg mr-1.5">trending_up</span> Gerar DRE
            </button>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      @if (gerado()) {
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ecfdf5"><span class="material-symbols-rounded" style="color:#059669">payments</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Receita Bruta</p><p class="text-xl font-bold" style="color:#059669">{{ receitaBruta() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#fff7ed"><span class="material-symbols-rounded" style="color:#d97706">shopping_cart</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Custos</p><p class="text-xl font-bold" style="color:#d97706">{{ custos() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#fef2f2"><span class="material-symbols-rounded" style="color:#ef4444">receipt_long</span></div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Despesas</p><p class="text-xl font-bold" style="color:#ef4444">{{ despesas() | currency:'BRL' }}</p></div>
          </div>
          <div class="bear-card p-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" [style.background]="lucro() >= 0 ? '#ecfdf5' : '#fef2f2'">
              <span class="material-symbols-rounded" [style.color]="lucro() >= 0 ? '#059669' : '#ef4444'">{{ lucro() >= 0 ? 'trending_up' : 'trending_down' }}</span>
            </div>
            <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Resultado Líquido</p>
              <p class="text-xl font-bold" [style.color]="lucro() >= 0 ? '#059669' : '#ef4444'">{{ lucro() | currency:'BRL' }}</p>
            </div>
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
      @if (!loading() && !gerado()) {
        <div class="empty-state">
          <div class="empty-state__icon"><span class="material-symbols-rounded">trending_up</span></div>
          <h3 class="empty-state__title">Selecione o período</h3>
          <p class="empty-state__description">Escolha mês e ano para gerar a Demonstração do Resultado</p>
        </div>
      }

      <!-- DRE Report -->
      @if (!loading() && gerado()) {
        <div class="bear-card overflow-hidden animate-fade-in-up">
          <div class="p-4 flex items-center justify-between" style="border-bottom:1px solid var(--border-subtle)">
            <h3 class="text-heading text-sm">DRE {{ meses[mes - 1].label }}/{{ ano }}</h3>
            <button class="bear-btn bear-btn--outline" style="padding:0.375rem 0.75rem;font-size:0.75rem;" matTooltip="Exportar PDF">
              <span class="material-symbols-rounded text-sm mr-1">picture_as_pdf</span> Exportar
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full" style="border-collapse:collapse;">
              @for (l of linhas(); track l.descricao) {
                <tr [style.background]="l.destaque ? 'var(--surface-2)' : 'transparent'"
                    [style.border-bottom]="l.destaque ? '2px solid var(--border-color)' : '1px solid var(--border-subtle)'"
                    [style.font-weight]="l.destaque || l.nivel <= 1 ? '700' : '400'">
                  <td class="p-3 text-sm" [style.padding-left.px]="16 + l.nivel * 20"
                      [style.color]="l.destaque ? 'var(--text-primary)' : 'var(--text-secondary)'">
                    {{ l.descricao }}
                  </td>
                  <td class="p-3 text-sm text-right font-mono" style="width:180px;"
                      [style.color]="l.valor >= 0 ? (l.destaque ? 'var(--text-primary)' : 'var(--text-secondary)') : '#ef4444'"
                      [style.font-size]="l.destaque ? '1rem' : '0.875rem'">
                    {{ l.valor | currency:'BRL' }}
                  </td>
                </tr>
              }
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class DreComponent {
  loading = signal(false);
  gerado = signal(false);
  linhas = signal<LinhaDre[]>([]);
  receitaBruta = signal(0);
  custos = signal(0);
  despesas = signal(0);
  lucro = signal(0);

  ano = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  anos = [2024, 2025, 2026];
  meses = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Fev' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Set' },
    { value: 10, label: 'Out' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dez' },
  ];

  constructor(private service: ContabilidadeService, private snackBar: MatSnackBar) {}

  gerar() {
    this.loading.set(true);
    this.service.gerarDre(this.ano, this.mes).subscribe({
      next: (data) => {
        const items: LinhaDre[] = data.linhas || this.buildDreFromData(data) || [];
        this.linhas.set(items);
        this.receitaBruta.set(data.receitaBruta || items.find(l => l.tipo === 'RECEITA')?.valor || 0);
        this.custos.set(Math.abs(data.custos || items.filter(l => l.tipo === 'CUSTO').reduce((s, l) => s + l.valor, 0) || 0));
        this.despesas.set(Math.abs(data.despesas || items.filter(l => l.tipo === 'DESPESA').reduce((s, l) => s + l.valor, 0) || 0));
        this.lucro.set(data.resultadoLiquido || items.find(l => l.tipo === 'RESULTADO')?.valor || 0);
        this.gerado.set(true);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.snackBar.open(e.error?.message || 'Erro ao gerar DRE', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] });
      },
    });
  }

  private buildDreFromData(data: any): LinhaDre[] {
    if (Array.isArray(data)) return data;
    const lines: LinhaDre[] = [];
    lines.push({ descricao: 'RECEITA OPERACIONAL BRUTA', valor: data.receitaBruta || 0, nivel: 0, tipo: 'RECEITA', destaque: true });
    lines.push({ descricao: '(-) Deduções da Receita', valor: -(data.deducoes || 0), nivel: 1, tipo: 'DEDUCAO' });
    lines.push({ descricao: '(=) RECEITA OPERACIONAL LÍQUIDA', valor: data.receitaLiquida || 0, nivel: 0, tipo: 'RECEITA', destaque: true });
    lines.push({ descricao: '(-) Custo dos Produtos/Serviços', valor: -(data.custos || 0), nivel: 1, tipo: 'CUSTO' });
    lines.push({ descricao: '(=) LUCRO BRUTO', valor: data.lucroBruto || 0, nivel: 0, tipo: 'RESULTADO', destaque: true });
    lines.push({ descricao: '(-) Despesas Operacionais', valor: -(data.despesasOperacionais || 0), nivel: 1, tipo: 'DESPESA' });
    lines.push({ descricao: '   Despesas Administrativas', valor: -(data.despesasAdm || 0), nivel: 2, tipo: 'DESPESA' });
    lines.push({ descricao: '   Despesas Comerciais', valor: -(data.despesasCom || 0), nivel: 2, tipo: 'DESPESA' });
    lines.push({ descricao: '   Despesas Financeiras', valor: -(data.despesasFin || 0), nivel: 2, tipo: 'DESPESA' });
    lines.push({ descricao: '(+) Receitas Financeiras', valor: data.receitasFinanceiras || 0, nivel: 1, tipo: 'RECEITA' });
    lines.push({ descricao: '(=) RESULTADO ANTES IR/CSLL', valor: data.resultadoAntesIr || 0, nivel: 0, tipo: 'RESULTADO', destaque: true });
    lines.push({ descricao: '(-) IRPJ', valor: -(data.irpj || 0), nivel: 1, tipo: 'DESPESA' });
    lines.push({ descricao: '(-) CSLL', valor: -(data.csll || 0), nivel: 1, tipo: 'DESPESA' });
    lines.push({ descricao: '(=) RESULTADO LÍQUIDO DO EXERCÍCIO', valor: data.resultadoLiquido || 0, nivel: 0, tipo: 'RESULTADO', destaque: true });
    return lines;
  }
}
