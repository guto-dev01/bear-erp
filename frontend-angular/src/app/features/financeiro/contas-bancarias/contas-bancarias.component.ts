import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FinanceiroService } from '../financeiro.service';

@Component({
  selector: 'bear-contas-bancarias',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Contas Bancárias</h1>
          <p class="page-header__subtitle">Gestão das contas bancárias da empresa</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Nova Conta
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">account_balance</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Contas</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ contas().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">payments</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Saldo Total</p><p class="text-xl font-bold" style="color:#34C759">{{ saldoTotal() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFF4E5"><span class="material-symbols-rounded" style="color:#FF9500">check_circle</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Ativas</p><p class="text-2xl font-bold" style="color:#FF9500">{{ countAtivas() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E6F8FB"><span class="material-symbols-rounded" style="color:#30B0C7">trending_up</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Maior Saldo</p><p class="text-xl font-bold" style="color:#30B0C7">{{ maiorSaldo() | currency:'BRL' }}</p></div>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- Card Grid -->
      @if (!loading() && !showForm()) {
        @if (contas().length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon"><span class="material-symbols-rounded">account_balance</span></div>
            <h3 class="empty-state__title">Nenhuma conta bancária</h3>
            <p class="empty-state__description">Cadastre a primeira conta bancária</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (c of contas(); track c.id || c.conta) {
              <div class="bear-card p-5 animate-fade-in-up">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                       [style.background]="getBankColor(c.banco)">
                    {{ getBankInitials(c.banco) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold truncate" style="color:var(--text-primary)">{{ c.banco }}</h4>
                    <p class="text-xs" style="color:var(--text-tertiary)">{{ formatTipo(c.tipo) }}</p>
                  </div>
                  <span class="badge" [ngClass]="c.status === 'ATIVA' ? 'badge--success' : 'badge--neutral'">
                    <span class="badge__dot"></span>{{ c.status }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-3 mb-4" style="padding-bottom:1rem;border-bottom:1px solid var(--border-subtle)">
                  <div>
                    <p class="text-2xs font-medium" style="color:var(--text-tertiary)">Agência</p>
                    <p class="text-sm font-mono font-medium" style="color:var(--text-primary)">{{ c.agencia }}</p>
                  </div>
                  <div>
                    <p class="text-2xs font-medium" style="color:var(--text-tertiary)">Conta</p>
                    <p class="text-sm font-mono font-medium" style="color:var(--text-primary)">{{ c.conta }}</p>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-2xs font-medium" style="color:var(--text-tertiary)">Saldo Atual</p>
                    <p class="text-lg font-bold" [style.color]="(c.saldoAtual || 0) >= 0 ? '#34C759' : '#FF3B30'">
                      {{ c.saldoAtual | currency:'BRL' }}
                    </p>
                  </div>
                  @if (c.responsavel) {
                    <span class="text-xs px-2 py-1 rounded-full" style="background:var(--surface-2);color:var(--text-secondary)">{{ c.responsavel }}</span>
                  }
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Nova Conta Bancária</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Banco</mat-label>
                <mat-select formControlName="banco">
                  @for (b of bancos; track b) { <mat-option [value]="b">{{ b }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Agência</mat-label><input matInput formControlName="agencia"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Conta</mat-label><input matInput formControlName="conta"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo</mat-label>
                <mat-select formControlName="tipo">
                  <mat-option value="CORRENTE">Corrente</mat-option>
                  <mat-option value="POUPANCA">Poupança</mat-option>
                  <mat-option value="INVESTIMENTO">Investimento</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Saldo Inicial</mat-label><input matInput type="number" formControlName="saldoInicial"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Responsável</mat-label><input matInput formControlName="responsavel"></mat-form-field>
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
export class ContasBancariasComponent implements OnInit {
  contas = signal<any[]>([]);
  loading = signal(false);
  showForm = signal(false);
  saldoTotal = signal(0);
  maiorSaldo = signal(0);
  form!: FormGroup;
  bancos = ['Banco do Brasil', 'Itaú', 'Bradesco', 'Santander', 'Caixa Econômica', 'Nubank', 'Inter', 'Sicoob', 'Sicredi', 'Safra', 'BTG Pactual', 'Outros'];

  constructor(private fb: FormBuilder, private service: FinanceiroService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      banco: ['', Validators.required], agencia: ['', Validators.required],
      conta: ['', Validators.required], tipo: ['CORRENTE'], saldoInicial: [0],
      responsavel: [''],
    });
    this.carregar();
  }

  carregar() {
    this.loading.set(true);
    this.service.listContasBancarias().subscribe({
      next: (res) => {
        // `descricao` guarda o responsável no schema do Appwrite.
        const items = res.map((c) => ({ ...c, responsavel: c.descricao }));
        this.contas.set(items);
        this.saldoTotal.set(items.reduce((s: number, c: any) => s + (c.saldoAtual || 0), 0));
        this.maiorSaldo.set(items.length > 0 ? Math.max(...items.map((c: any) => c.saldoAtual || 0)) : 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ tipo: 'CORRENTE', saldoInicial: 0 }); }
  countAtivas(): number { return this.contas().filter(c => c.status === 'ATIVA').length; }
  formatTipo(t: string): string { return t === 'CORRENTE' ? 'Conta Corrente' : t === 'POUPANCA' ? 'Poupança' : 'Investimento'; }

  getBankColor(bank: string): string {
    const m: Record<string, string> = { 'Banco do Brasil': '#f9c700', 'Itaú': '#003e72', 'Bradesco': '#cc092f', 'Santander': '#ec0000', 'Caixa Econômica': '#005ca9', 'Nubank': '#820ad1', 'Inter': '#ff7a00', 'Sicoob': '#003641', 'Sicredi': '#33a02c', 'Safra': '#00457c', 'BTG Pactual': '#001e3c' };
    return m[bank] || '#6b7280';
  }

  getBankInitials(bank: string): string {
    return bank.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  salvar() {
    if (this.form.valid) {
      this.service.createContaBancaria(this.form.value).subscribe({
        next: () => { this.snackBar.open('Conta criada!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao criar conta', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }
}
