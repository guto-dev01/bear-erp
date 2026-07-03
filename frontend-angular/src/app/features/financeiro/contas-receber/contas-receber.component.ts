import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceiroService } from '../financeiro.service';

@Component({
  selector: 'bear-contas-receber',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatPaginatorModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Contas a Receber</h1>
          <p class="page-header__subtitle">Gerencie seus recebimentos e cobranças</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="carregarVencidas()">
            <span class="material-symbols-rounded text-base mr-1 text-red-500">warning</span>
            Vencidas
          </button>
          <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1.25rem; font-size: 0.875rem;"
                  (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span>
            Nova Conta
          </button>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="bear-spinner bear-spinner--xl"></div>
        </div>
      }

      <!-- Main View -->
      @if (!showForm() && !showBaixa()) {
        <!-- KPI Summary -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="stat-card animate-fade-in-up">
            <div class="stat-card__icon stat-card__icon--info">
              <span class="material-symbols-rounded">receipt_long</span>
            </div>
            <span class="stat-card__value">{{ totalContas() }}</span>
            <span class="stat-card__label">Total</span>
          </div>
          <div class="stat-card animate-fade-in-up" style="animation-delay: 60ms">
            <div class="stat-card__icon stat-card__icon--warning">
              <span class="material-symbols-rounded">pending</span>
            </div>
            <span class="stat-card__value">{{ contasAbertas() }}</span>
            <span class="stat-card__label">Abertas</span>
          </div>
          <div class="stat-card animate-fade-in-up" style="animation-delay: 120ms">
            <div class="stat-card__icon stat-card__icon--error">
              <span class="material-symbols-rounded">warning</span>
            </div>
            <span class="stat-card__value">{{ contasVencidas() }}</span>
            <span class="stat-card__label">Vencidas</span>
          </div>
          <div class="stat-card animate-fade-in-up" style="animation-delay: 180ms">
            <div class="stat-card__icon stat-card__icon--success">
              <span class="material-symbols-rounded">check_circle</span>
            </div>
            <span class="stat-card__value">{{ contasRecebidas() }}</span>
            <span class="stat-card__label">Recebidas</span>
          </div>
        </div>

        <!-- Data Table -->
        <div class="bear-card overflow-hidden animate-fade-in-up" style="animation-delay: 240ms">
          <div class="table-scroll">
          <table mat-table [dataSource]="contas()" class="w-full">
            <ng-container matColumnDef="numero">
              <th mat-header-cell *matHeaderCellDef>Número</th>
              <td mat-cell *matCellDef="let c" class="font-mono text-xs">{{ c.numero }}</td>
            </ng-container>
            <ng-container matColumnDef="descricao">
              <th mat-header-cell *matHeaderCellDef>Descrição</th>
              <td mat-cell *matCellDef="let c">
                <span class="font-medium">{{ c.descricao }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="cliente">
              <th mat-header-cell *matHeaderCellDef>Cliente</th>
              <td mat-cell *matCellDef="let c">{{ c.clienteNome }}</td>
            </ng-container>
            <ng-container matColumnDef="vencimento">
              <th mat-header-cell *matHeaderCellDef>Vencimento</th>
              <td mat-cell *matCellDef="let c">{{ c.dataVencimento | date:'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef>Valor</th>
              <td mat-cell *matCellDef="let c" class="font-semibold">{{ c.valorOriginal | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="recebido">
              <th mat-header-cell *matHeaderCellDef>Recebido</th>
              <td mat-cell *matCellDef="let c" class="text-emerald-600">{{ c.valorRecebido | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let c">
                <span class="badge" [ngClass]="getStatusBadgeClass(c.status)">
                  <span class="badge__dot"></span>
                  {{ c.status }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="w-24">Ações</th>
              <td mat-cell *matCellDef="let c">
                @if (c.status === 'ABERTA' || c.status === 'PARCIAL' || c.status === 'VENCIDA') {
                  <div class="flex gap-0.5">
                    <button mat-icon-button (click)="iniciarBaixa(c)" matTooltip="Registrar recebimento"
                            class="!w-8 !h-8 ink-brand">
                      <span class="material-symbols-rounded text-lg">payments</span>
                    </button>
                    <button mat-icon-button (click)="cancelar(c.id)" matTooltip="Cancelar"
                            class="!w-8 !h-8 ink-error">
                      <span class="material-symbols-rounded text-lg">cancel</span>
                    </button>
                  </div>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          </div>

          @if (!loading() && contas().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon">
                <span class="material-symbols-rounded">receipt_long</span>
              </div>
              <h3 class="empty-state__title">Nenhuma conta encontrada</h3>
              <p class="empty-state__description">Adicione uma nova conta a receber para começar</p>
            </div>
          }

          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)"
                         [hidePageSize]="true"></mat-paginator>
        </div>
      }

      <!-- New Account Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Nova Conta a Receber</h2>
            <button class="bear-btn bear-btn--ghost" style="padding: 0.375rem;" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="salvar()">
            <div class="form-section">
              <h3 class="form-section__title">Informações</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field appearance="outline" class="md:col-span-2">
                  <mat-label>Descrição</mat-label>
                  <input matInput formControlName="descricao">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Cliente</mat-label>
                  <input matInput formControlName="clienteNome">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>CNPJ/CPF</mat-label>
                  <input matInput formControlName="clienteCnpjCpf">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Categoria</mat-label>
                  <input matInput formControlName="categoria">
                </mat-form-field>
              </div>
            </div>

            <div class="form-section">
              <h3 class="form-section__title">Valores e Datas</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field appearance="outline">
                  <mat-label>Data Emissão</mat-label>
                  <input matInput type="date" formControlName="dataEmissao">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Data Vencimento</mat-label>
                  <input matInput type="date" formControlName="dataVencimento">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Valor</mat-label>
                  <input matInput type="number" formControlName="valorOriginal">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Parcelas</mat-label>
                  <input matInput type="number" formControlName="totalParcelas">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Forma Recebimento</mat-label>
                  <mat-select formControlName="formaRecebimento">
                    <mat-option value="BOLETO">Boleto</mat-option>
                    <mat-option value="PIX">PIX</mat-option>
                    <mat-option value="TED">TED</mat-option>
                    <mat-option value="CARTAO">Cartão</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Observação</mat-label>
                  <input matInput formControlName="observacao">
                </mat-form-field>
              </div>
            </div>

            <div class="flex gap-3 justify-end mt-4">
              <button type="button" class="bear-btn bear-btn--outline" style="padding: 0.5rem 1.5rem;"
                      (click)="showForm.set(false)">Cancelar</button>
              <button type="submit" class="bear-btn bear-btn--primary" style="padding: 0.5rem 1.5rem;"
                      [disabled]="form.invalid">
                <span class="material-symbols-rounded text-lg mr-1">save</span> Salvar
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Receive Payment Form -->
      @if (showBaixa()) {
        <div class="bear-card p-6 max-w-lg animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Registrar Recebimento</h2>
            <button class="bear-btn bear-btn--ghost" style="padding: 0.375rem;" (click)="showBaixa.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <p class="text-sm text-text-secondary mb-4">{{ contaSelecionada()?.descricao }}</p>

          <form [formGroup]="baixaForm" (ngSubmit)="confirmarBaixa()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline">
                <mat-label>Data Recebimento</mat-label>
                <input matInput type="date" formControlName="data">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Valor</mat-label>
                <input matInput type="number" formControlName="valor">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Forma Recebimento</mat-label>
                <mat-select formControlName="formaPagamento">
                  <mat-option value="PIX">PIX</mat-option>
                  <mat-option value="BOLETO">Boleto</mat-option>
                  <mat-option value="TED">TED</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Observação</mat-label>
                <input matInput formControlName="observacao">
              </mat-form-field>
            </div>
            <div class="flex gap-3 justify-end mt-4">
              <button type="button" class="bear-btn bear-btn--outline" style="padding: 0.5rem 1.5rem;"
                      (click)="showBaixa.set(false)">Cancelar</button>
              <button type="submit" class="bear-btn bear-btn--accent" style="padding: 0.5rem 1.5rem;"
                      [disabled]="baixaForm.invalid">
                <span class="material-symbols-rounded text-lg mr-1">check</span> Confirmar
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class ContasReceberComponent implements OnInit {
  contas = signal<any[]>([]); loading = signal(false); showForm = signal(false); showBaixa = signal(false);
  contaSelecionada = signal<any>(null); totalElements = signal(0); totalContas = signal(0);
  contasAbertas = signal(0); contasVencidas = signal(0); contasRecebidas = signal(0);
  displayedColumns = ['numero', 'descricao', 'cliente', 'vencimento', 'valor', 'recebido', 'status', 'acoes'];
  form!: FormGroup; baixaForm!: FormGroup;

  constructor(private fb: FormBuilder, private service: FinanceiroService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      descricao: ['', Validators.required], clienteId: [''], clienteNome: ['', Validators.required],
      clienteCnpjCpf: [''], categoria: [''], dataEmissao: ['', Validators.required],
      dataVencimento: ['', Validators.required], valorOriginal: [null, [Validators.required, Validators.min(0.01)]],
      totalParcelas: [1], formaRecebimento: ['BOLETO'], observacao: [''],
    });
    this.baixaForm = this.fb.group({
      data: ['', Validators.required], valor: [null, [Validators.required, Validators.min(0.01)]],
      formaPagamento: ['PIX'], observacao: [''],
    });
    this.carregar();
  }

  carregar(page = 0) {
    this.loading.set(true);
    this.service.listContasReceber(page).subscribe({ next: (res) => {
      this.contas.set(res.content || []); this.totalElements.set(res.totalElements || 0); this.totalContas.set(res.totalElements || 0);
      const c = this.contas();
      this.contasAbertas.set(c.filter((x: any) => x.status === 'ABERTA').length);
      this.contasVencidas.set(c.filter((x: any) => x.status === 'VENCIDA').length);
      this.contasRecebidas.set(c.filter((x: any) => x.status === 'PAGA').length);
      this.loading.set(false);
    }, error: () => this.loading.set(false) });
  }

  resetForm() { this.form.reset({ totalParcelas: 1, formaRecebimento: 'BOLETO' }); }
  salvar() {
    if (this.form.valid) {
      this.service.createContaReceber(this.form.value).subscribe({
        next: () => { this.snackBar.open('Conta criada!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao criar conta', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }
  iniciarBaixa(conta: any) {
    this.contaSelecionada.set(conta);
    this.baixaForm.reset({ valor: conta.valorOriginal - (conta.valorRecebido || 0), formaPagamento: 'PIX', data: new Date().toISOString().split('T')[0] });
    this.showBaixa.set(true);
  }
  confirmarBaixa() {
    if (this.baixaForm.valid && this.contaSelecionada()) {
      this.service.baixarContaReceber(this.contaSelecionada().id, this.baixaForm.value).subscribe({
        next: () => { this.snackBar.open('Recebimento registrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showBaixa.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao registrar recebimento', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }
  cancelar(id: string) { this.service.cancelarContaReceber(id).subscribe({ next: () => { this.snackBar.open('Conta cancelada', 'OK', { duration: 3000 }); this.carregar(); } }); }
  carregarVencidas() { this.loading.set(true); this.service.listContasReceberVencidas().subscribe({ next: (res) => { this.contas.set(res); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  onPage(event: PageEvent) { this.carregar(event.pageIndex); }
  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'ABERTA': 'badge--warning',
      'PARCIAL': 'badge--info',
      'PAGA': 'badge--success',
      'VENCIDA': 'badge--error',
      'CANCELADA': 'badge--neutral',
    };
    return map[status] || 'badge--neutral';
  }
}
