import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceiroService } from '../financeiro.service';

@Component({
  selector: 'bear-fluxo-caixa',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Fluxo de Caixa</h1>
          <p class="page-header__subtitle">Acompanhe entradas, saídas e saldo do período</p>
        </div>
      </div>

      <!-- Filter -->
      <div class="bear-card p-4 mb-6 animate-fade-in-up">
        <form [formGroup]="filtroForm" (ngSubmit)="carregar()" class="flex gap-4 items-end flex-wrap">
          <mat-form-field appearance="outline">
            <mat-label>Data Início</mat-label>
            <input matInput type="date" formControlName="dataInicio">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Data Fim</mat-label>
            <input matInput type="date" formControlName="dataFim">
          </mat-form-field>
          <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1.25rem; font-size: 0.875rem; margin-bottom: 22px;"
                  type="submit">
            <span class="material-symbols-rounded text-lg mr-1.5">search</span>
            Consultar
          </button>
        </form>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="bear-spinner bear-spinner--xl"></div>
        </div>
      }

      @if (fluxo()) {
        <!-- KPI Summary -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="stat-card animate-fade-in-up">
            <div class="stat-card__icon stat-card__icon--info">
              <span class="material-symbols-rounded">account_balance_wallet</span>
            </div>
            <span class="stat-card__value">{{ fluxo().saldoInicial | currency:'BRL' }}</span>
            <span class="stat-card__label">Saldo Inicial</span>
          </div>
          <div class="stat-card animate-fade-in-up" style="animation-delay: 60ms">
            <div class="stat-card__icon stat-card__icon--success">
              <span class="material-symbols-rounded">trending_up</span>
            </div>
            <span class="stat-card__value">{{ fluxo().totalEntradas | currency:'BRL' }}</span>
            <span class="stat-card__label">Entradas</span>
          </div>
          <div class="stat-card animate-fade-in-up" style="animation-delay: 120ms">
            <div class="stat-card__icon stat-card__icon--error">
              <span class="material-symbols-rounded">trending_down</span>
            </div>
            <span class="stat-card__value">{{ fluxo().totalSaidas | currency:'BRL' }}</span>
            <span class="stat-card__label">Saídas</span>
          </div>
          <div class="stat-card animate-fade-in-up" style="animation-delay: 180ms">
            <div class="stat-card__icon" [ngClass]="fluxo().saldoFinal >= 0 ? 'stat-card__icon--success' : 'stat-card__icon--error'">
              <span class="material-symbols-rounded">account_balance</span>
            </div>
            <span class="stat-card__value" [ngClass]="fluxo().saldoFinal >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ fluxo().saldoFinal | currency:'BRL' }}</span>
            <span class="stat-card__label">Saldo Final</span>
          </div>
        </div>

        <!-- Data Table -->
        <div class="bear-card overflow-hidden animate-fade-in-up" style="animation-delay: 240ms">
          <div class="table-scroll">
          <table mat-table [dataSource]="fluxo().itens || []" class="w-full">
            <ng-container matColumnDef="data">
              <th mat-header-cell *matHeaderCellDef>Data</th>
              <td mat-cell *matCellDef="let i">{{ i.data | date:'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="descricao">
              <th mat-header-cell *matHeaderCellDef>Descrição</th>
              <td mat-cell *matCellDef="let i">
                <span class="font-medium">{{ i.descricao }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="tipo">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let i">
                <span class="badge" [ngClass]="i.tipo === 'ENTRADA' ? 'badge--success' : 'badge--error'">
                  <span class="badge__dot"></span>
                  {{ i.tipo }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef>Valor</th>
              <td mat-cell *matCellDef="let i" class="font-semibold" [ngClass]="i.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'">
                {{ i.tipo === 'ENTRADA' ? '+' : '-' }}{{ i.valor | currency:'BRL' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="saldo">
              <th mat-header-cell *matHeaderCellDef>Saldo</th>
              <td mat-cell *matCellDef="let i" class="font-semibold" [ngClass]="i.saldoAcumulado >= 0 ? 'text-emerald-600' : 'text-red-600'">
                {{ i.saldoAcumulado | currency:'BRL' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="origem">
              <th mat-header-cell *matHeaderCellDef>Origem</th>
              <td mat-cell *matCellDef="let i">
                <span class="text-label">{{ i.origem }}</span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          </div>

          @if (!loading() && (fluxo().itens || []).length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon">
                <span class="material-symbols-rounded">account_balance_wallet</span>
              </div>
              <h3 class="empty-state__title">Nenhum movimento encontrado</h3>
              <p class="empty-state__description">Ajuste o período e consulte novamente</p>
            </div>
          }
        </div>
      }

      @if (!loading() && !fluxo()) {
        <div class="bear-card animate-fade-in-up">
          <div class="empty-state">
            <div class="empty-state__icon">
              <span class="material-symbols-rounded">query_stats</span>
            </div>
            <h3 class="empty-state__title">Selecione um período</h3>
            <p class="empty-state__description">Defina as datas e clique em Consultar para visualizar o fluxo de caixa</p>
          </div>
        </div>
      }
    </div>
  `,
})
export class FluxoCaixaComponent implements OnInit {
  fluxo = signal<any>(null);
  loading = signal(false);
  filtroForm!: FormGroup;
  displayedColumns = ['data', 'descricao', 'tipo', 'valor', 'saldo', 'origem'];

  constructor(private fb: FormBuilder, private service: FinanceiroService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    this.filtroForm = this.fb.group({
      dataInicio: [inicio.toISOString().split('T')[0], Validators.required],
      dataFim: [fim.toISOString().split('T')[0], Validators.required],
    });
    this.carregar();
  }

  carregar() {
    if (this.filtroForm.invalid) return;
    this.loading.set(true);
    const { dataInicio, dataFim } = this.filtroForm.value;
    this.service.getFluxoCaixa(dataInicio, dataFim).subscribe({
      next: (res) => { this.fluxo.set(res); this.loading.set(false); },
      error: () => { this.snackBar.open('Erro ao carregar fluxo de caixa', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }); this.loading.set(false); },
    });
  }
}
