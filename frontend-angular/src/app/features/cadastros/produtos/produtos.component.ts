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
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'bear-produtos',
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
          <h1 class="page-header__title">Produtos e Serviços</h1>
          <p class="page-header__subtitle">Catálogo de produtos e serviços da empresa</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo Item
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">inventory_2</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Produtos</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ countProdutos() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#F2EBFB"><span class="material-symbols-rounded" style="color:#AF52DE">handyman</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Serviços</p><p class="text-2xl font-bold" style="color:#AF52DE">{{ countServicos() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">check_circle</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Ativos</p><p class="text-2xl font-bold" style="color:#34C759">{{ countAtivos() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFF4E5"><span class="material-symbols-rounded" style="color:#FF9500">payments</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Valor Estoque</p><p class="text-xl font-bold" style="color:#FF9500">{{ valorEstoque() | currency:'BRL' }}</p></div>
        </div>
      </div>

      <!-- Filter -->
      @if (!showForm()) {
        <div class="flex gap-2 mb-4">
          @for (f of filtros; track f.value) {
            <button class="bear-btn" [ngClass]="filtroTipo() === f.value ? 'bear-btn--primary' : 'bear-btn--outline'"
                    style="padding:0.375rem 1rem;font-size:0.8125rem;" (click)="filtroTipo.set(f.value)">
              {{ f.label }}
            </button>
          }
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- Table -->
      @if (!loading() && !showForm()) {
        <div class="bear-card overflow-hidden animate-fade-in-up">
          <table mat-table [dataSource]="filteredItems()" class="w-full">
            <ng-container matColumnDef="codigo"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let p" class="font-mono text-xs">{{ p.codigo || p.id }}</td></ng-container>
            <ng-container matColumnDef="descricao"><th mat-header-cell *matHeaderCellDef>Descrição</th><td mat-cell *matCellDef="let p"><span class="font-medium">{{ p.descricao }}</span></td></ng-container>
            <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let p">
                <span class="badge" [ngClass]="p.tipo === 'PRODUTO' ? 'badge--info' : 'badge--purple'">{{ p.tipo }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="ncm"><th mat-header-cell *matHeaderCellDef>NCM/NBS</th><td mat-cell *matCellDef="let p" class="font-mono text-xs">{{ p.ncm || p.nbs || '-' }}</td></ng-container>
            <ng-container matColumnDef="unidade"><th mat-header-cell *matHeaderCellDef>Unid.</th><td mat-cell *matCellDef="let p">{{ p.unidade }}</td></ng-container>
            <ng-container matColumnDef="valor"><th mat-header-cell *matHeaderCellDef>Valor Unit.</th><td mat-cell *matCellDef="let p" class="font-semibold">{{ p.valorUnitario | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let p">
                <span class="badge" [ngClass]="p.status === 'ATIVO' ? 'badge--success' : 'badge--neutral'"><span class="badge__dot"></span>{{ p.status }}</span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if (filteredItems().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">inventory_2</span></div>
              <h3 class="empty-state__title">Nenhum item encontrado</h3>
              <p class="empty-state__description">Cadastre o primeiro produto ou serviço</p>
            </div>
          }

          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)" [hidePageSize]="true"></mat-paginator>
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Novo Produto/Serviço</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Descrição</mat-label><input matInput formControlName="descricao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo</mat-label>
                <mat-select formControlName="tipo">
                  <mat-option value="PRODUTO">Produto</mat-option>
                  <mat-option value="SERVICO">Serviço</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Código de Barras</mat-label><input matInput formControlName="codigoBarras"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>NCM</mat-label><input matInput formControlName="ncm" placeholder="0000.00.00"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>NBS</mat-label><input matInput formControlName="nbs"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Unidade</mat-label>
                <mat-select formControlName="unidade">
                  @for (u of unidades; track u.value) { <mat-option [value]="u.value">{{ u.label }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Valor Unitário</mat-label><input matInput type="number" formControlName="valorUnitario"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CFOP Padrão</mat-label><input matInput formControlName="cfopPadrao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Conta Contábil</mat-label><input matInput formControlName="contaContabil"></mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Observação</mat-label><input matInput formControlName="observacao"></mat-form-field>
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
export class ProdutosComponent implements OnInit {
  items = signal<any[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  valorEstoque = signal(0);
  filtroTipo = signal('');
  displayedColumns = ['codigo', 'descricao', 'tipo', 'ncm', 'unidade', 'valor', 'status'];
  filtros = [{ value: '', label: 'Todos' }, { value: 'PRODUTO', label: 'Produtos' }, { value: 'SERVICO', label: 'Serviços' }];
  unidades = [
    { value: 'UN', label: 'Unidade (UN)' }, { value: 'KG', label: 'Quilograma (KG)' },
    { value: 'LT', label: 'Litro (LT)' }, { value: 'MT', label: 'Metro (MT)' },
    { value: 'HR', label: 'Hora (HR)' }, { value: 'SV', label: 'Serviço (SV)' },
    { value: 'CX', label: 'Caixa (CX)' }, { value: 'PC', label: 'Peça (PC)' },
  ];
  form!: FormGroup;
  private apiUrl = `${environment.apiUrl}/cadastros/produtos`;

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      descricao: ['', Validators.required], tipo: ['PRODUTO', Validators.required],
      codigoBarras: [''], ncm: [''], nbs: [''], unidade: ['UN'],
      valorUnitario: [null, [Validators.required, Validators.min(0.01)]],
      cfopPadrao: [''], contaContabil: [''], observacao: [''],
    });
    this.carregar();
  }

  carregar(page = 0) {
    this.loading.set(true);
    const params = new HttpParams().set('page', page).set('size', 20);
    this.http.get<any>(this.apiUrl, { params }).subscribe({
      next: (res) => {
        const list = res.content || res || [];
        this.items.set(list);
        this.totalElements.set(res.totalElements || list.length);
        this.valorEstoque.set(list.filter((p: any) => p.tipo === 'PRODUTO').reduce((s: number, p: any) => s + (p.valorUnitario || 0), 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filteredItems(): any[] {
    const tipo = this.filtroTipo();
    return tipo ? this.items().filter(i => i.tipo === tipo) : this.items();
  }

  resetForm() { this.form.reset({ tipo: 'PRODUTO', unidade: 'UN' }); }
  onPage(event: PageEvent) { this.carregar(event.pageIndex); }
  countProdutos(): number { return this.items().filter(i => i.tipo === 'PRODUTO').length; }
  countServicos(): number { return this.items().filter(i => i.tipo === 'SERVICO').length; }
  countAtivos(): number { return this.items().filter(i => i.status === 'ATIVO').length; }

  salvar() {
    if (this.form.valid) {
      this.http.post<any>(this.apiUrl, this.form.value).subscribe({
        next: () => { this.snackBar.open('Item cadastrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao cadastrar', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }
}
