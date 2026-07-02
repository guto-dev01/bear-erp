import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ContabilidadeService, RegraView, LancamentoView } from '../contabilidade.service';

interface LancamentoAutoView {
  data: string;
  regraNome: string;
  historico: string;
  contaDebito: string;
  contaCredito: string;
  valor: number;
}

@Component({
  selector: 'bear-contabilidade-automatica',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTableModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Contabilidade Automática</h1>
          <p class="page-header__subtitle">Motor de regras para lançamentos contábeis automáticos</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem;font-size:0.8125rem;" (click)="executarRegras()">
            <span class="material-symbols-rounded text-base mr-1">play_arrow</span> Executar Regras
          </button>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Nova Regra
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="stat-icon stat-icon--brand"><span class="material-symbols-rounded">rule</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Regras</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ regras().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="stat-icon stat-icon--success"><span class="material-symbols-rounded">check_circle</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Ativas</p><p class="text-2xl font-bold ink-success">{{ countAtivas() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="stat-icon stat-icon--warning"><span class="material-symbols-rounded">auto_fix_high</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Lanç. Automáticos</p><p class="text-2xl font-bold ink-warning">{{ lancamentosAuto().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="stat-icon stat-icon--teal"><span class="material-symbols-rounded">speed</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Taxa Automação</p><p class="text-2xl font-bold ink-teal">{{ taxaAutomacao() }}%</p></div>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      @if (!loading() && !showForm()) {
        <!-- Rules Table -->
        <div class="bear-card overflow-hidden animate-fade-in-up mb-6">
          <div class="p-4 flex items-center justify-between" style="border-bottom:1px solid var(--border-subtle)">
            <h3 class="text-heading text-sm">Regras de Contabilização</h3>
          </div>
          <table mat-table [dataSource]="regras()" class="w-full">
            <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Nome</th><td mat-cell *matCellDef="let r"><span class="font-medium">{{ r.nome }}</span></td></ng-container>
            <ng-container matColumnDef="tipoEvento"><th mat-header-cell *matHeaderCellDef>Evento</th>
              <td mat-cell *matCellDef="let r"><span class="badge badge--info">{{ formatTipo(r.tipoEvento) }}</span></td>
            </ng-container>
            <ng-container matColumnDef="contaDebito"><th mat-header-cell *matHeaderCellDef>Débito</th><td mat-cell *matCellDef="let r" class="font-mono text-xs">{{ r.contaDebito }}</td></ng-container>
            <ng-container matColumnDef="contaCredito"><th mat-header-cell *matHeaderCellDef>Crédito</th><td mat-cell *matCellDef="let r" class="font-mono text-xs">{{ r.contaCredito }}</td></ng-container>
            <ng-container matColumnDef="condicao"><th mat-header-cell *matHeaderCellDef>Condição</th><td mat-cell *matCellDef="let r" class="text-xs" style="color:var(--text-tertiary)">{{ r.condicao || 'Sempre' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let r">
                <span class="badge" [ngClass]="r.ativa ? 'badge--success' : 'badge--neutral'"><span class="badge__dot"></span>{{ r.ativa ? 'Ativa' : 'Inativa' }}</span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="regrasColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: regrasColumns;"></tr>
          </table>

          @if (regras().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">rule</span></div>
              <h3 class="empty-state__title">Nenhuma regra cadastrada</h3>
              <p class="empty-state__description">Crie regras para automatizar lançamentos contábeis</p>
            </div>
          }
        </div>

        <!-- Recent Auto Entries -->
        @if (lancamentosAuto().length > 0) {
          <div class="bear-card overflow-hidden animate-fade-in-up">
            <div class="p-4" style="border-bottom:1px solid var(--border-subtle)">
              <h3 class="text-heading text-sm">Lançamentos Automáticos Recentes</h3>
            </div>
            <table mat-table [dataSource]="lancamentosAuto()" class="w-full">
              <ng-container matColumnDef="data"><th mat-header-cell *matHeaderCellDef>Data</th><td mat-cell *matCellDef="let l">{{ l.data | date:'dd/MM/yyyy' }}</td></ng-container>
              <ng-container matColumnDef="regra"><th mat-header-cell *matHeaderCellDef>Regra</th><td mat-cell *matCellDef="let l"><span class="badge badge--info text-xs">{{ l.regraNome }}</span></td></ng-container>
              <ng-container matColumnDef="historico"><th mat-header-cell *matHeaderCellDef>Histórico</th><td mat-cell *matCellDef="let l" class="text-xs">{{ l.historico }}</td></ng-container>
              <ng-container matColumnDef="debito"><th mat-header-cell *matHeaderCellDef>Débito</th><td mat-cell *matCellDef="let l" class="font-mono text-xs">{{ l.contaDebito }}</td></ng-container>
              <ng-container matColumnDef="credito"><th mat-header-cell *matHeaderCellDef>Crédito</th><td mat-cell *matCellDef="let l" class="font-mono text-xs">{{ l.contaCredito }}</td></ng-container>
              <ng-container matColumnDef="valor"><th mat-header-cell *matHeaderCellDef>Valor</th><td mat-cell *matCellDef="let l" class="font-semibold">{{ l.valor | currency:'BRL' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="lancColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: lancColumns;"></tr>
            </table>
          </div>
        }
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Nova Regra de Contabilização</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Nome da Regra</mat-label><input matInput formControlName="nome"></mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Descrição</mat-label><input matInput formControlName="descricao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo de Evento</mat-label>
                <mat-select formControlName="tipoEvento">
                  @for (t of tiposEvento; track t.value) { <mat-option [value]="t.value">{{ t.label }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Condição</mat-label><input matInput formControlName="condicao" placeholder="Ex: valor > 1000"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Conta Débito</mat-label><input matInput formControlName="contaDebito" placeholder="1.1.01"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Conta Crédito</mat-label><input matInput formControlName="contaCredito" placeholder="2.1.01"></mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Histórico Padrão</mat-label><input matInput formControlName="historicoPadrao"></mat-form-field>
            </div>
            <div class="flex gap-3 justify-end mt-6">
              <button type="button" class="bear-btn bear-btn--outline" style="padding:0.5rem 1.5rem" (click)="showForm.set(false)">Cancelar</button>
              <button type="submit" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" [disabled]="form.invalid">
                <span class="material-symbols-rounded text-lg mr-1">save</span> Salvar
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class ContabilidadeAutomaticaComponent implements OnInit {
  regras = signal<RegraView[]>([]);
  lancamentosAuto = signal<LancamentoAutoView[]>([]);
  loading = signal(false);
  showForm = signal(false);
  form!: FormGroup;
  regrasColumns = ['nome', 'tipoEvento', 'contaDebito', 'contaCredito', 'condicao', 'status'];
  lancColumns = ['data', 'regra', 'historico', 'debito', 'credito', 'valor'];
  tiposEvento = [
    { value: 'NF_ENTRADA', label: 'NF Entrada' }, { value: 'NF_SAIDA', label: 'NF Saída' },
    { value: 'PAGAMENTO', label: 'Pagamento' }, { value: 'RECEBIMENTO', label: 'Recebimento' },
    { value: 'FOLHA', label: 'Folha de Pagamento' },
  ];

  constructor(private fb: FormBuilder, private service: ContabilidadeService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      nome: ['', Validators.required], descricao: [''], tipoEvento: ['', Validators.required],
      contaDebito: ['', Validators.required], contaCredito: ['', Validators.required],
      condicao: [''], historicoPadrao: [''],
    });
    this.carregar();
  }

  carregar() {
    this.loading.set(true);
    this.service.listRegras().subscribe({
      next: (res) => { this.regras.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ tipoEvento: '' }); }
  countAtivas(): number { return this.regras().filter(r => r.ativa).length; }
  taxaAutomacao(): number { return this.regras().length > 0 ? Math.round((this.countAtivas() / this.regras().length) * 100) : 0; }
  formatTipo(t: string): string { return (t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

  salvar() {
    if (this.form.valid) {
      this.service.createRegra({ ...this.form.value, ativa: true }).subscribe({
        next: () => { this.snackBar.open('Regra criada!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao criar regra', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }

  executarRegras() {
    this.loading.set(true);
    this.service.executarRegras().subscribe({
      next: (res: LancamentoView[]) => {
        this.lancamentosAuto.set(res.map(l => ({
          data: l.data,
          regraNome: l.historico,
          historico: l.historico,
          contaDebito: l.contaDebito?.codigo ?? '',
          contaCredito: l.contaCredito?.codigo ?? '',
          valor: l.valor,
        })));
        this.loading.set(false);
        this.snackBar.open(`${res.length} lançamentos gerados`, 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: () => { this.loading.set(false); this.snackBar.open('Erro ao executar', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }); },
    });
  }
}
