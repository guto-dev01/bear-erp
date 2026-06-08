import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface SplitPaymentDoc {
  $id: string;
  $createdAt: string;
  operacaoId?: string;
  descricao?: string;
  valorTotal: number;
  aliquotaIbs?: number;
  aliquotaCbs?: number;
  valorIbs?: number;
  valorCbs?: number;
  valorLiquido?: number;
  status: string;
}

interface SplitPaymentRow {
  data: string;
  nfe: string;
  fornecedor: string;
  valorTotal: number;
  ibs: number;
  cbs: number;
  valorLiquido: number;
  status: string;
}

@Component({
  selector: 'bear-split-payment',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatTableModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Split Payment 2026</h1>
          <p class="page-header__subtitle">Reforma Tributária — IBS e CBS</p>
        </div>
      </div>

      <!-- Info Banner -->
      <div class="bear-card p-4 mb-6 flex items-start gap-3 animate-fade-in-up" style="background:linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);border-left:4px solid #4f46e5;">
        <span class="material-symbols-rounded" style="color:#4f46e5;margin-top:2px;">info</span>
        <div>
          <p class="text-sm font-semibold mb-1" style="color:#4f46e5">O que é o Split Payment?</p>
          <p class="text-xs" style="color:#3730a3">O Split Payment é o novo mecanismo da Reforma Tributária (IBS/CBS) que divide automaticamente o pagamento entre o fornecedor e o Fisco no momento da transação. A partir de 2026, parte do valor pago será direcionada diretamente para os cofres públicos.</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#eef2ff"><span class="material-symbols-rounded" style="color:#4f46e5">receipt_long</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Transações Mês</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ transacoes().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ecfdf5"><span class="material-symbols-rounded" style="color:#059669">payments</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Valor Total</p><p class="text-xl font-bold" style="color:#059669">{{ valorTotal() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#fef2f2"><span class="material-symbols-rounded" style="color:#ef4444">account_balance</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">IBS Retido</p><p class="text-xl font-bold" style="color:#ef4444">{{ ibsTotal() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#fffbeb"><span class="material-symbols-rounded" style="color:#d97706">gavel</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">CBS Retido</p><p class="text-xl font-bold" style="color:#d97706">{{ cbsTotal() | currency:'BRL' }}</p></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Config -->
        <div class="bear-card p-6 animate-fade-in-up">
          <h3 class="text-heading text-base mb-4">Configuração</h3>
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="text-sm" style="color:var(--text-secondary)">Split Payment Ativo</span>
              <button class="bear-btn" [ngClass]="splitAtivo() ? 'bear-btn--primary' : 'bear-btn--outline'"
                      style="padding:0.25rem 0.75rem;font-size:0.75rem;" (click)="splitAtivo.set(!splitAtivo())">
                {{ splitAtivo() ? 'Ativo' : 'Inativo' }}
              </button>
            </div>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Alíquota IBS (%)</mat-label>
              <input matInput type="number" [(ngModel)]="aliqIBS" step="0.1">
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Alíquota CBS (%)</mat-label>
              <input matInput type="number" [(ngModel)]="aliqCBS" step="0.1">
            </mat-form-field>
          </div>
        </div>

        <!-- Simulator -->
        <div class="bear-card p-6 lg:col-span-2 animate-fade-in-up" style="animation-delay:100ms">
          <h3 class="text-heading text-base mb-4">Simulador de Split Payment</h3>
          <div class="flex items-end gap-4 mb-4">
            <mat-form-field appearance="outline" class="flex-1" subscriptSizing="dynamic">
              <mat-label>Valor da Transação</mat-label>
              <input matInput type="number" [(ngModel)]="valorSimulacao">
            </mat-form-field>
            <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;margin-bottom:4px;" (click)="simular()">
              <span class="material-symbols-rounded text-lg mr-1">calculate</span> Simular
            </button>
          </div>

          @if (simResultado()) {
            <div class="grid grid-cols-2 gap-3 animate-fade-in-up">
              <div class="p-4 rounded-xl" style="background:var(--surface-1);">
                <p class="text-xs font-medium mb-1" style="color:var(--text-tertiary)">Valor Fornecedor</p>
                <p class="text-lg font-bold" style="color:#059669">{{ simResultado()!.valorFornecedor | currency:'BRL' }}</p>
              </div>
              <div class="p-4 rounded-xl" style="background:var(--surface-1);">
                <p class="text-xs font-medium mb-1" style="color:var(--text-tertiary)">Total Tributos</p>
                <p class="text-lg font-bold" style="color:#ef4444">{{ simResultado()!.totalTributos | currency:'BRL' }}</p>
              </div>
              <div class="p-4 rounded-xl" style="background:#fef2f2;">
                <p class="text-xs font-medium mb-1" style="color:#ef4444">IBS ({{ aliqIBS }}%)</p>
                <p class="text-base font-bold" style="color:#ef4444">{{ simResultado()!.ibs | currency:'BRL' }}</p>
              </div>
              <div class="p-4 rounded-xl" style="background:#fffbeb;">
                <p class="text-xs font-medium mb-1" style="color:#d97706">CBS ({{ aliqCBS }}%)</p>
                <p class="text-base font-bold" style="color:#d97706">{{ simResultado()!.cbs | currency:'BRL' }}</p>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- Table -->
      @if (!loading() && transacoes().length > 0) {
        <div class="bear-card overflow-hidden animate-fade-in-up">
          <div class="p-4" style="border-bottom:1px solid var(--border-subtle)">
            <h3 class="text-heading text-sm">Transações com Split Payment</h3>
          </div>
          <table mat-table [dataSource]="transacoes()" class="w-full">
            <ng-container matColumnDef="data"><th mat-header-cell *matHeaderCellDef>Data</th><td mat-cell *matCellDef="let t">{{ t.data | date:'dd/MM/yyyy' }}</td></ng-container>
            <ng-container matColumnDef="nfe"><th mat-header-cell *matHeaderCellDef>NF-e</th><td mat-cell *matCellDef="let t" class="font-mono text-xs">{{ t.nfe }}</td></ng-container>
            <ng-container matColumnDef="fornecedor"><th mat-header-cell *matHeaderCellDef>Fornecedor</th><td mat-cell *matCellDef="let t"><span class="font-medium">{{ t.fornecedor }}</span></td></ng-container>
            <ng-container matColumnDef="valorTotal"><th mat-header-cell *matHeaderCellDef>Valor Total</th><td mat-cell *matCellDef="let t" class="font-semibold">{{ t.valorTotal | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="ibs"><th mat-header-cell *matHeaderCellDef>IBS</th><td mat-cell *matCellDef="let t" style="color:#ef4444">{{ t.ibs | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="cbs"><th mat-header-cell *matHeaderCellDef>CBS</th><td mat-cell *matCellDef="let t" style="color:#d97706">{{ t.cbs | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="valorLiquido"><th mat-header-cell *matHeaderCellDef>Líquido</th><td mat-cell *matCellDef="let t" style="color:#059669;font-weight:600;">{{ t.valorLiquido | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let t">
                <span class="badge" [ngClass]="t.status === 'PROCESSADO' ? 'badge--success' : t.status === 'PENDENTE' ? 'badge--warning' : 'badge--error'">
                  <span class="badge__dot"></span>{{ t.status }}
                </span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      }

      @if (!loading() && transacoes().length === 0) {
        <div class="empty-state">
          <div class="empty-state__icon"><span class="material-symbols-rounded">receipt_long</span></div>
          <h3 class="empty-state__title">Nenhuma transação registrada</h3>
          <p class="empty-state__description">As transações com split payment aparecerão aqui</p>
        </div>
      }
    </div>
  `,
})
export class SplitPaymentComponent {
  transacoes = signal<SplitPaymentRow[]>([]);
  loading = signal(false);
  splitAtivo = signal(true);
  valorTotal = signal(0);
  ibsTotal = signal(0);
  cbsTotal = signal(0);
  aliqIBS = 25.0;
  aliqCBS = 12.0;
  valorSimulacao = 10000;
  simResultado = signal<{ valorFornecedor: number; ibs: number; cbs: number; totalTributos: number } | null>(null);
  displayedColumns = ['data', 'nfe', 'fornecedor', 'valorTotal', 'ibs', 'cbs', 'valorLiquido', 'status'];

  constructor(
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.carregar();
  }

  carregar() {
    this.loading.set(true);
    const Q = this.appwrite.query;
    this.appwrite.listDocuments<SplitPaymentDoc>('split_payment', [
      Q.limit(100), Q.orderDesc('$createdAt'),
      Q.equal('tenantId', this.auth.tenantId() || 'default'),
    ]).subscribe({
      next: (docs) => {
        const items: SplitPaymentRow[] = docs.map(d => ({
          data: d.$createdAt,
          nfe: d.operacaoId || '',
          fornecedor: d.descricao || '',
          valorTotal: d.valorTotal || 0,
          ibs: d.valorIbs || 0,
          cbs: d.valorCbs || 0,
          valorLiquido: d.valorLiquido ?? ((d.valorTotal || 0) - (d.valorIbs || 0) - (d.valorCbs || 0)),
          status: d.status || 'PENDENTE',
        }));
        this.transacoes.set(items);
        this.valorTotal.set(items.reduce((s, t) => s + (t.valorTotal || 0), 0));
        this.ibsTotal.set(items.reduce((s, t) => s + (t.ibs || 0), 0));
        this.cbsTotal.set(items.reduce((s, t) => s + (t.cbs || 0), 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // Cálculo IBS/CBS no cliente e persistência da transação no Appwrite.
  simular() {
    const valor = this.valorSimulacao || 0;
    const ibs = valor * (this.aliqIBS / 100);
    const cbs = valor * (this.aliqCBS / 100);
    this.simResultado.set({
      valorFornecedor: valor - ibs - cbs,
      ibs,
      cbs,
      totalTributos: ibs + cbs,
    });

    const data = {
      operacaoId: '',
      descricao: 'Simulação Split Payment',
      valorTotal: valor,
      aliquotaIbs: this.aliqIBS,
      aliquotaCbs: this.aliqCBS,
      valorIbs: ibs,
      valorCbs: cbs,
      valorLiquido: valor - ibs - cbs,
      status: this.splitAtivo() ? 'PROCESSADO' : 'PENDENTE',
      empresaId: this.auth.empresaId() || '',
      tenantId: this.auth.tenantId() || 'default',
    };
    this.appwrite.createDocument('split_payment', data).subscribe({
      next: () => { this.snackBar.open('Split Payment registrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao registrar', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }
}
