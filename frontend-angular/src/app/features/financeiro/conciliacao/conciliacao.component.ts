import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectionModel } from '@angular/cdk/collections';
import { FinanceiroService } from '../financeiro.service';

@Component({
  selector: 'bear-conciliacao',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Conciliação Bancária</h1>
          <p class="page-header__subtitle">Concilie movimentos bancários com lançamentos internos</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1.25rem; font-size: 0.875rem;"
                  [disabled]="selection.isEmpty()" (click)="conciliarSelecionados()">
            <span class="material-symbols-rounded text-lg mr-1.5">check_circle</span>
            Conciliar Selecionados ({{ selection.selected.length }})
          </button>
        </div>
      </div>

      <!-- Filter -->
      <div class="bear-card p-4 mb-6 animate-fade-in-up">
        <form class="flex gap-4 items-end flex-wrap">
          <mat-form-field appearance="outline">
            <mat-label>Conta Bancária</mat-label>
            <mat-select [(value)]="contaSelecionada" (selectionChange)="carregarMovimentos()">
              @for (conta of contasBancarias(); track conta.id) {
                <mat-option [value]="conta.id">{{ conta.banco }} - Ag {{ conta.agencia }} / CC {{ conta.conta }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </form>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="bear-spinner bear-spinner--xl"></div>
        </div>
      }

      <!-- Data Table -->
      @if (movimentos().length > 0) {
        <div class="bear-card overflow-hidden animate-fade-in-up">
          <div class="table-scroll">
          <table mat-table [dataSource]="movimentos()" class="w-full">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef>
                <mat-checkbox (change)="$event ? masterToggle() : null" [checked]="selection.hasValue() && isAllSelected()" [indeterminate]="selection.hasValue() && !isAllSelected()"></mat-checkbox>
              </th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox (click)="$event.stopPropagation()" (change)="$event ? selection.toggle(row) : null" [checked]="selection.isSelected(row)"></mat-checkbox>
              </td>
            </ng-container>
            <ng-container matColumnDef="data">
              <th mat-header-cell *matHeaderCellDef>Data</th>
              <td mat-cell *matCellDef="let m">{{ m.data | date:'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="tipo">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let m">
                <span class="badge" [ngClass]="m.tipo === 'CREDITO' ? 'badge--success' : 'badge--error'">
                  <span class="badge__dot"></span>
                  {{ m.tipo }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="descricao">
              <th mat-header-cell *matHeaderCellDef>Descrição</th>
              <td mat-cell *matCellDef="let m">
                <span class="font-medium">{{ m.descricao }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef>Valor</th>
              <td mat-cell *matCellDef="let m" class="font-semibold" [ngClass]="m.tipo === 'CREDITO' ? 'text-emerald-600' : 'text-red-600'">
                {{ m.valor | currency:'BRL' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="saldoApos">
              <th mat-header-cell *matHeaderCellDef>Saldo Após</th>
              <td mat-cell *matCellDef="let m">{{ m.saldoApos | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="conciliado">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let m">
                <span class="badge" [ngClass]="m.conciliado ? 'badge--success' : 'badge--warning'">
                  <span class="badge__dot"></span>
                  {{ m.conciliado ? 'Conciliado' : 'Pendente' }}
                </span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" (click)="selection.toggle(row)" class="cursor-pointer"></tr>
          </table>
          </div>
        </div>
      }

      <!-- Empty State: no movements after selecting account -->
      @if (!loading() && movimentos().length === 0 && contaSelecionada) {
        <div class="bear-card animate-fade-in-up">
          <div class="empty-state">
            <div class="empty-state__icon">
              <span class="material-symbols-rounded">check_circle</span>
            </div>
            <h3 class="empty-state__title">Nenhum movimento pendente</h3>
            <p class="empty-state__description">Todos os movimentos desta conta já foram conciliados</p>
          </div>
        </div>
      }

      <!-- Empty State: no account selected -->
      @if (!loading() && !contaSelecionada) {
        <div class="bear-card animate-fade-in-up">
          <div class="empty-state">
            <div class="empty-state__icon">
              <span class="material-symbols-rounded">account_balance</span>
            </div>
            <h3 class="empty-state__title">Selecione uma conta</h3>
            <p class="empty-state__description">Escolha uma conta bancária para visualizar os movimentos pendentes de conciliação</p>
          </div>
        </div>
      }
    </div>
  `,
})
export class ConciliacaoComponent implements OnInit {
  contasBancarias = signal<any[]>([]);
  movimentos = signal<any[]>([]);
  loading = signal(false);
  contaSelecionada: string = '';
  selection = new SelectionModel<any>(true, []);
  displayedColumns = ['select', 'data', 'tipo', 'descricao', 'valor', 'saldoApos', 'conciliado'];

  constructor(private service: FinanceiroService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.service.listContasBancarias().subscribe({ next: (res) => this.contasBancarias.set(res) });
  }

  carregarMovimentos() {
    if (!this.contaSelecionada) return;
    this.loading.set(true);
    this.selection.clear();
    this.service.listNaoConciliados(this.contaSelecionada).subscribe({
      next: (res) => { this.movimentos.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  isAllSelected() { return this.selection.selected.length === this.movimentos().length; }
  masterToggle() { this.isAllSelected() ? this.selection.clear() : this.movimentos().forEach(row => this.selection.select(row)); }

  conciliarSelecionados() {
    const ids = this.selection.selected.map((m: any) => m.id);
    this.service.conciliar(ids).subscribe({
      next: () => { this.snackBar.open(`${ids.length} movimentos conciliados!`, 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.carregarMovimentos(); },
      error: () => this.snackBar.open('Erro ao conciliar', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }
}
