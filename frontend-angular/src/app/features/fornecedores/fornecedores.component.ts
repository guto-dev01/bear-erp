import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';

interface Fornecedor {
  $id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpjCpf: string;
  inscricaoEstadual: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  status: string;
  tipo: string;
  banco: string;
  agencia: string;
  conta: string;
  chavePix: string;
  $createdAt: string;
}

@Component({
  selector: 'bear-fornecedores',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Fornecedores</h1>
          <p class="page-header__subtitle">Gerencie seus fornecedores e parceiros</p>
        </div>
        <div class="page-header__actions">
          <div style="display:flex;align-items:center;gap:0.5rem;padding:0 0.75rem;height:40px;border-radius:var(--radius-md);border:1.5px solid var(--border-color);background:var(--surface-0);min-width:220px;">
            <span class="material-symbols-rounded" style="font-size:1.125rem;color:var(--text-tertiary)">search</span>
            <input style="flex:1;border:none;outline:none;background:transparent;font-size:0.875rem;color:var(--text-primary);font-family:inherit;"
                   placeholder="Buscar fornecedor..." [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)">
          </div>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="openForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo Fornecedor
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#F2EBFB"><span class="material-symbols-rounded" style="color:#5856D6">local_shipping</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ items().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">verified</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Ativos</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ countActive() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E6F8FB"><span class="material-symbols-rounded" style="color:#30B0C7">pix</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Com Chave PIX</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ countWithPix() }}</p></div>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="bear-card p-5"><div class="skeleton skeleton--avatar mb-3"></div><div class="skeleton skeleton--title mb-2"></div><div class="skeleton skeleton--text"></div></div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && filtered().length === 0 && !showForm()) {
        <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">local_shipping</span></div>
          <h3 class="empty-state__title">{{ searchTerm() ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado' }}</h3>
          <p class="empty-state__description">{{ searchTerm() ? 'Tente outro termo' : 'Adicione o primeiro fornecedor' }}</p>
          @if (!searchTerm()) { <button class="bear-btn bear-btn--primary mt-4" style="padding:0.5rem 1.25rem;" (click)="openForm()"><span class="material-symbols-rounded text-lg mr-1.5">add</span>Adicionar</button> }
        </div>
      }

      <!-- Grid -->
      @if (!loading() && filtered().length > 0 && !showForm()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (f of filtered(); track f.$id; let i = $index) {
            <div class="bear-card bear-card--interactive p-5 animate-fade-in-up" [style.animation-delay]="(i*50)+'ms'">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style="background:linear-gradient(135deg,#5856D6,#AF52DE)">{{ (f.nomeFantasia||f.razaoSocial||'?').charAt(0) }}</div>
                <span class="badge badge--success">{{ f.status||'ATIVO' }}</span>
              </div>
              <h3 class="text-sm font-semibold truncate" style="color:var(--text-primary)">{{ f.nomeFantasia||f.razaoSocial }}</h3>
              <p class="text-xs truncate mb-3" style="color:var(--text-tertiary)">{{ f.razaoSocial }}</p>
              <div class="flex flex-col gap-1 mb-3 text-xs" style="color:var(--text-secondary)">
                <div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">badge</span>{{ formatDoc(f.cnpjCpf) }}</div>
                @if(f.email){<div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">mail</span>{{ f.email }}</div>}
                @if(f.chavePix){<div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">pix</span>{{ f.chavePix }}</div>}
                @if(f.cidade){<div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">location_on</span>{{ f.cidade }}/{{ f.estado }}</div>}
              </div>
              <div class="flex gap-1 pt-3" style="border-top:1px solid var(--border-subtle)">
                <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;" (click)="openForm(f)"><span class="material-symbols-rounded text-sm">edit</span></button>
                <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:#FF3B30;" (click)="delete(f)"><span class="material-symbols-rounded text-sm">delete</span></button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">{{ editingId() ? 'Editar Fornecedor' : 'Novo Fornecedor' }}</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="closeForm()"><span class="material-symbols-rounded">close</span></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <p class="text-label mb-3">Dados Gerais</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Razão Social</mat-label><input matInput formControlName="razaoSocial"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nome Fantasia</mat-label><input matInput formControlName="nomeFantasia"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo</mat-label><mat-select formControlName="tipo"><mat-option value="PJ">Pessoa Jurídica</mat-option><mat-option value="PF">Pessoa Física</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CNPJ/CPF</mat-label><input matInput formControlName="cnpjCpf" maxlength="14"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>IE</mat-label><input matInput formControlName="inscricaoEstadual"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput formControlName="email" type="email"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Telefone</mat-label><input matInput formControlName="telefone"></mat-form-field>
            </div>
            <p class="text-label mb-3">Endereço</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Endereço</mat-label><input matInput formControlName="endereco"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Cidade</mat-label><input matInput formControlName="cidade"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Estado</mat-label><mat-select formControlName="estado">@for(uf of ufs;track uf){<mat-option [value]="uf">{{uf}}</mat-option>}</mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CEP</mat-label><input matInput formControlName="cep" maxlength="8"></mat-form-field>
            </div>
            <p class="text-label mb-3">Dados Bancários</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline"><mat-label>Banco</mat-label><input matInput formControlName="banco"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Agência</mat-label><input matInput formControlName="agencia"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Conta</mat-label><input matInput formControlName="conta"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Chave PIX</mat-label><input matInput formControlName="chavePix"></mat-form-field>
            </div>
            <div class="flex gap-3 justify-end mt-6">
              <button type="button" class="bear-btn bear-btn--outline" style="padding:0.5rem 1.5rem" (click)="closeForm()">Cancelar</button>
              <button type="submit" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" [disabled]="form.invalid">
                <span class="material-symbols-rounded text-lg mr-1">{{ editingId() ? 'save' : 'add' }}</span>{{ editingId() ? 'Salvar' : 'Criar' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class FornecedoresComponent implements OnInit {
  items = signal<Fornecedor[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  searchTerm = signal('');
  form: FormGroup;
  ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  constructor(private fb: FormBuilder, private appwrite: AppwriteService, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      razaoSocial: ['', Validators.required], nomeFantasia: ['', Validators.required],
      tipo: ['PJ'], cnpjCpf: ['', Validators.required], inscricaoEstadual: [''],
      email: ['', [Validators.required, Validators.email]], telefone: [''],
      endereco: [''], cidade: [''], estado: [''], cep: [''],
      banco: [''], agencia: [''], conta: [''], chavePix: [''],
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.appwrite.listDocuments<Fornecedor>('fornecedores').subscribe({
      next: d => { this.items.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  filtered(): Fornecedor[] {
    const t = this.searchTerm().toLowerCase();
    if (!t) return this.items();
    return this.items().filter(f => f.razaoSocial?.toLowerCase().includes(t) || f.nomeFantasia?.toLowerCase().includes(t) || f.cnpjCpf?.includes(t));
  }

  countActive(): number { return this.items().filter(f => (f.status || 'ATIVO') === 'ATIVO').length; }
  countWithPix(): number { return this.items().filter(f => !!f.chavePix).length; }

  formatDoc(doc: string): string {
    if (!doc) return '';
    if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return doc;
  }

  openForm(f?: Fornecedor) {
    if (f) { this.editingId.set(f.$id); this.form.patchValue(f); }
    else { this.editingId.set(null); this.form.reset({ tipo: 'PJ' }); }
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingId.set(null); }

  save() {
    if (this.form.invalid) return;
    const data = { ...this.form.value, status: 'ATIVO', tenantId: 'default' };
    const id = this.editingId();
    const obs = id ? this.appwrite.updateDocument('fornecedores', id, data) : this.appwrite.createDocument('fornecedores', data);
    obs.subscribe({
      next: () => { this.snackBar.open(id ? 'Atualizado!' : 'Criado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.closeForm(); this.load(); },
      error: e => this.snackBar.open(e.message || 'Erro', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] }),
    });
  }

  delete(f: Fornecedor) {
    if (!confirm(`Excluir "${f.razaoSocial}"?`)) return;
    this.appwrite.deleteDocument('fornecedores', f.$id).subscribe({
      next: () => { this.snackBar.open('Excluído', 'OK', { duration: 3000 }); this.load(); },
      error: () => this.snackBar.open('Erro ao excluir', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }
}
