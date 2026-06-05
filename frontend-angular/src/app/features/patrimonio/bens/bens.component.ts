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
  selector: 'bear-bens',
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
          <h1 class="page-header__title">Bens Patrimoniais</h1>
          <p class="page-header__subtitle">Controle do ativo imobilizado da empresa</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo Bem
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#eef2ff"><span class="material-symbols-rounded" style="color:#4f46e5">inventory_2</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Bens</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalElements() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ecfdf5"><span class="material-symbols-rounded" style="color:#059669">payments</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Valor Total</p><p class="text-xl font-bold" style="color:#059669">{{ valorTotal() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#fef2f2"><span class="material-symbols-rounded" style="color:#ef4444">trending_down</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Deprec. Acum.</p><p class="text-xl font-bold" style="color:#ef4444">{{ depreciacao() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#f0fdfa"><span class="material-symbols-rounded" style="color:#0d9488">account_balance</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Valor Atual</p><p class="text-xl font-bold" style="color:#0d9488">{{ valorAtual() | currency:'BRL' }}</p></div>
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
          <table mat-table [dataSource]="bens()" class="w-full">
            <ng-container matColumnDef="codigo"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let b" class="font-mono text-xs">{{ b.codigo }}</td></ng-container>
            <ng-container matColumnDef="descricao"><th mat-header-cell *matHeaderCellDef>Descrição</th><td mat-cell *matCellDef="let b"><span class="font-medium">{{ b.descricao }}</span></td></ng-container>
            <ng-container matColumnDef="grupo"><th mat-header-cell *matHeaderCellDef>Grupo</th><td mat-cell *matCellDef="let b"><span class="badge badge--info">{{ formatGrupo(b.grupoContabil) }}</span></td></ng-container>
            <ng-container matColumnDef="valorAquisicao"><th mat-header-cell *matHeaderCellDef>Valor Aquisição</th><td mat-cell *matCellDef="let b" class="font-semibold">{{ b.valorAquisicao | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="valorAtual"><th mat-header-cell *matHeaderCellDef>Valor Atual</th><td mat-cell *matCellDef="let b">{{ b.valorAtual | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="depreciacao"><th mat-header-cell *matHeaderCellDef>Deprec. Acum.</th><td mat-cell *matCellDef="let b" style="color:#ef4444">{{ b.valorDepreciadoAcumulado | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let b">
                <span class="badge" [ngClass]="b.status === 'ATIVO' ? 'badge--success' : 'badge--neutral'">
                  <span class="badge__dot"></span>{{ b.status }}
                </span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if (!loading() && bens().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">inventory_2</span></div>
              <h3 class="empty-state__title">Nenhum bem cadastrado</h3>
              <p class="empty-state__description">Cadastre o primeiro bem patrimonial</p>
            </div>
          }

          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)" [hidePageSize]="true"></mat-paginator>
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Novo Bem Patrimonial</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <p class="text-label mb-3">Identificação</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Descrição</mat-label><input matInput formControlName="descricao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Grupo Contábil</mat-label>
                <mat-select formControlName="grupoContabil">
                  @for (g of grupos; track g) { <mat-option [value]="g">{{ formatGrupo(g) }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Marca</mat-label><input matInput formControlName="marca"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Modelo</mat-label><input matInput formControlName="modelo"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nº Série</mat-label><input matInput formControlName="numeroSerie"></mat-form-field>
            </div>
            <p class="text-label mb-3">Aquisição</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline"><mat-label>Nota Fiscal</mat-label><input matInput formControlName="notaFiscal"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Fornecedor</mat-label><input matInput formControlName="fornecedorNome"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Data Aquisição</mat-label><input matInput type="date" formControlName="dataAquisicao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Valor Aquisição</mat-label><input matInput type="number" formControlName="valorAquisicao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Vida Útil (meses)</mat-label><input matInput type="number" formControlName="vidaUtilMeses"></mat-form-field>
            </div>
            <p class="text-label mb-3">Localização</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline"><mat-label>Local</mat-label><input matInput formControlName="localDescricao"></mat-form-field>
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
export class BensComponent implements OnInit {
  bens = signal<any[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  valorTotal = signal(0);
  depreciacao = signal(0);
  valorAtual = signal(0);
  displayedColumns = ['codigo', 'descricao', 'grupo', 'valorAquisicao', 'valorAtual', 'depreciacao', 'status'];
  grupos = ['IMOVEIS', 'VEICULOS', 'MAQUINAS_EQUIPAMENTOS', 'MOVEIS_UTENSILIOS', 'EQUIPAMENTOS_INFORMATICA', 'INSTALACOES', 'TERRENOS', 'OUTROS'];
  form!: FormGroup;
  private apiUrl = `${environment.apiUrl}/patrimonio`;

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      descricao: ['', Validators.required], grupoContabil: ['', Validators.required],
      marca: [''], modelo: [''], numeroSerie: [''], notaFiscal: [''],
      fornecedorNome: [''], localDescricao: [''], responsavel: [''],
      dataAquisicao: ['', Validators.required], valorAquisicao: [null, [Validators.required, Validators.min(0.01)]],
      vidaUtilMeses: [60],
    });
    this.carregar();
  }

  carregar(page = 0) {
    this.loading.set(true);
    const params = new HttpParams().set('page', page).set('size', 20);
    this.http.get<any>(`${this.apiUrl}/bens`, { params }).subscribe({
      next: (res) => {
        const items = res.content || res || [];
        this.bens.set(items);
        this.totalElements.set(res.totalElements || items.length);
        this.valorTotal.set(items.reduce((s: number, b: any) => s + (b.valorAquisicao || 0), 0));
        this.depreciacao.set(items.reduce((s: number, b: any) => s + (b.valorDepreciadoAcumulado || 0), 0));
        this.valorAtual.set(items.reduce((s: number, b: any) => s + (b.valorAtual || b.valorAquisicao || 0), 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ vidaUtilMeses: 60, grupoContabil: '' }); }
  onPage(event: PageEvent) { this.carregar(event.pageIndex); }

  formatGrupo(g: string): string { return (g || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

  salvar() {
    if (this.form.valid) {
      this.http.post<any>(`${this.apiUrl}/bens`, this.form.value).subscribe({
        next: () => { this.snackBar.open('Bem cadastrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao cadastrar', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }
}
