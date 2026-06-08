import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ContabilidadeService, CentroCustoView } from '../contabilidade.service';

@Component({
  selector: 'bear-centros-custo',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTableModule, MatPaginatorModule,
    MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Centros de Custo</h1>
          <p class="page-header__subtitle">Gestão de centros de custo e alocação orçamentária</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo Centro
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">hub</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Centros</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalElements() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">check_circle</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Ativos</p><p class="text-2xl font-bold" style="color:#34C759">{{ countAtivos() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFF4E5"><span class="material-symbols-rounded" style="color:#FF9500">account_balance_wallet</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Orçamento Total</p><p class="text-xl font-bold" style="color:#FF9500">{{ orcamentoTotal() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFECEB"><span class="material-symbols-rounded" style="color:#FF3B30">trending_up</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Utilizado</p><p class="text-xl font-bold" style="color:#FF3B30">{{ utilizado() | currency:'BRL' }}</p></div>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- Table -->
      @if (!loading() && !showForm()) {
        <div class="bear-card overflow-hidden animate-fade-in-up">
          <table mat-table [dataSource]="centros()" class="w-full">
            <ng-container matColumnDef="codigo"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let c" class="font-mono text-xs">{{ c.codigo }}</td></ng-container>
            <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Nome</th><td mat-cell *matCellDef="let c"><span class="font-medium">{{ c.nome }}</span></td></ng-container>
            <ng-container matColumnDef="responsavel"><th mat-header-cell *matHeaderCellDef>Responsável</th><td mat-cell *matCellDef="let c">{{ c.responsavel }}</td></ng-container>
            <ng-container matColumnDef="orcamento"><th mat-header-cell *matHeaderCellDef>Orçamento</th><td mat-cell *matCellDef="let c" class="font-semibold">{{ c.orcamento | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="utilizado"><th mat-header-cell *matHeaderCellDef>Utilizado</th><td mat-cell *matCellDef="let c">{{ c.valorUtilizado | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="percentual"><th mat-header-cell *matHeaderCellDef>% Uso</th>
              <td mat-cell *matCellDef="let c">
                <div class="flex items-center gap-2">
                  <div style="width:60px;height:6px;border-radius:3px;background:var(--surface-3);overflow:hidden;">
                    <div [style.width]="getPercentual(c) + '%'" [style.background]="getPercentual(c) > 90 ? '#FF3B30' : getPercentual(c) > 70 ? '#FF9500' : '#34C759'" style="height:100%;border-radius:3px;transition:width 0.3s;"></div>
                  </div>
                  <span class="text-xs font-medium" [style.color]="getPercentual(c) > 90 ? '#FF3B30' : getPercentual(c) > 70 ? '#FF9500' : '#34C759'">{{ getPercentual(c) }}%</span>
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let c">
                <span class="badge" [ngClass]="c.status === 'ATIVO' ? 'badge--success' : 'badge--neutral'">
                  <span class="badge__dot"></span>{{ c.status }}
                </span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if (!loading() && centros().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">hub</span></div>
              <h3 class="empty-state__title">Nenhum centro de custo</h3>
              <p class="empty-state__description">Cadastre o primeiro centro de custo</p>
            </div>
          }

          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)" [hidePageSize]="true"></mat-paginator>
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Novo Centro de Custo</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline"><mat-label>Código</mat-label><input matInput formControlName="codigo"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome"></mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Descrição</mat-label><input matInput formControlName="descricao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Responsável</mat-label><input matInput formControlName="responsavel"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Orçamento</mat-label><input matInput type="number" formControlName="orcamento"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Status</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="ATIVO">Ativo</mat-option>
                  <mat-option value="INATIVO">Inativo</mat-option>
                </mat-select>
              </mat-form-field>
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
export class CentrosCustoComponent implements OnInit {
  centros = signal<CentroCustoView[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  orcamentoTotal = signal(0);
  utilizado = signal(0);
  displayedColumns = ['codigo', 'nome', 'responsavel', 'orcamento', 'utilizado', 'percentual', 'status'];
  form!: FormGroup;

  constructor(private fb: FormBuilder, private service: ContabilidadeService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      codigo: ['', Validators.required], nome: ['', Validators.required], descricao: [''],
      responsavel: [''], orcamento: [null, [Validators.required, Validators.min(0)]], status: ['ATIVO'],
    });
    this.carregar();
  }

  carregar(_page = 0) {
    this.loading.set(true);
    this.service.listCentrosCusto().subscribe({
      next: (items) => {
        this.centros.set(items);
        this.totalElements.set(items.length);
        this.orcamentoTotal.set(items.reduce((s, c) => s + (c.orcamento || 0), 0));
        this.utilizado.set(items.reduce((s, c) => s + (c.valorUtilizado || 0), 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ status: 'ATIVO' }); }
  onPage(event: PageEvent) { this.carregar(event.pageIndex); }
  countAtivos(): number { return this.centros().filter(c => c.status === 'ATIVO').length; }
  getPercentual(c: CentroCustoView): number { return c.orcamento > 0 ? Math.round(((c.valorUtilizado || 0) / c.orcamento) * 100) : 0; }

  salvar() {
    if (this.form.valid) {
      this.service.createCentroCusto(this.form.value).subscribe({
        next: () => { this.snackBar.open('Centro de custo criado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao criar', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }
}
