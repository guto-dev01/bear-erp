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

interface Cliente {
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
  $createdAt: string;
}

@Component({
  selector: 'bear-clientes',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Clientes</h1>
          <p class="page-header__subtitle">Gerencie sua base de clientes</p>
        </div>
        <div class="page-header__actions">
          <div style="display:flex;align-items:center;gap:0.5rem;padding:0 0.75rem;height:40px;border-radius:var(--radius-md);border:1.5px solid var(--border-color);background:var(--surface-0);min-width:220px;">
            <span class="material-symbols-rounded" style="font-size:1.125rem;color:var(--text-tertiary)">search</span>
            <input style="flex:1;border:none;outline:none;background:transparent;font-size:0.875rem;color:var(--text-primary);font-family:inherit;"
                   placeholder="Buscar cliente..." [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)">
          </div>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="openForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo Cliente
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">people</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ clientes().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">check_circle</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Ativos</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ countByStatus('ATIVO') }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E5F1FF"><span class="material-symbols-rounded" style="color:#007AFF">business</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Pessoa Jurídica</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ countByTipo('PJ') }}</p></div>
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
        <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">people</span></div>
          <h3 class="empty-state__title">{{ searchTerm() ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado' }}</h3>
          <p class="empty-state__description">{{ searchTerm() ? 'Tente outro termo' : 'Adicione o primeiro cliente' }}</p>
          @if (!searchTerm()) { <button class="bear-btn bear-btn--primary mt-4" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="openForm()"><span class="material-symbols-rounded text-lg mr-1.5">add</span>Adicionar</button> }
        </div>
      }

      <!-- Grid -->
      @if (!loading() && filtered().length > 0 && !showForm()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (c of filtered(); track c.$id; let i = $index) {
            <div class="bear-card bear-card--interactive p-5 animate-fade-in-up" [style.animation-delay]="(i*50)+'ms'">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style="background:linear-gradient(135deg,#007AFF,#5856D6)">{{ (c.nomeFantasia||c.razaoSocial||'?').charAt(0) }}</div>
                <span class="badge" [class]="c.tipo==='PJ'?'badge--info':'badge--neutral'">{{ c.tipo||'PJ' }}</span>
              </div>
              <h3 class="text-sm font-semibold truncate" style="color:var(--text-primary)">{{ c.nomeFantasia||c.razaoSocial }}</h3>
              <p class="text-xs truncate mb-3" style="color:var(--text-tertiary)">{{ c.razaoSocial }}</p>
              <div class="flex flex-col gap-1 mb-3 text-xs" style="color:var(--text-secondary)">
                <div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">badge</span>{{ formatDoc(c.cnpjCpf) }}</div>
                @if(c.email){<div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">mail</span>{{ c.email }}</div>}
                @if(c.cidade){<div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-sm">location_on</span>{{ c.cidade }}/{{ c.estado }}</div>}
              </div>
              <div class="flex gap-1 pt-3" style="border-top:1px solid var(--border-subtle)">
                <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;" (click)="openForm(c)"><span class="material-symbols-rounded text-sm">edit</span></button>
                <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:#FF3B30;" (click)="delete(c)"><span class="material-symbols-rounded text-sm">delete</span></button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">{{ editingId() ? 'Editar Cliente' : 'Novo Cliente' }}</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="closeForm()"><span class="material-symbols-rounded">close</span></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Razão Social</mat-label><input matInput formControlName="razaoSocial"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nome Fantasia</mat-label><input matInput formControlName="nomeFantasia"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo</mat-label><mat-select formControlName="tipo"><mat-option value="PJ">Pessoa Jurídica</mat-option><mat-option value="PF">Pessoa Física</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CNPJ/CPF</mat-label><input matInput formControlName="cnpjCpf" maxlength="14"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Inscrição Estadual</mat-label><input matInput formControlName="inscricaoEstadual"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput formControlName="email" type="email"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Telefone</mat-label><input matInput formControlName="telefone"></mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Endereço</mat-label><input matInput formControlName="endereco"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Cidade</mat-label><input matInput formControlName="cidade"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Estado</mat-label>
                <mat-select formControlName="estado">@for(uf of ufs;track uf){<mat-option [value]="uf">{{uf}}</mat-option>}</mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CEP</mat-label><input matInput formControlName="cep" maxlength="8"></mat-form-field>
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
export class ClientesComponent implements OnInit {
  clientes = signal<Cliente[]>([]);
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
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.appwrite.listDocuments<Cliente>('clientes').subscribe({
      next: d => { this.clientes.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  filtered(): Cliente[] {
    const t = this.searchTerm().toLowerCase();
    if (!t) return this.clientes();
    return this.clientes().filter(c => c.razaoSocial?.toLowerCase().includes(t) || c.nomeFantasia?.toLowerCase().includes(t) || c.cnpjCpf?.includes(t));
  }

  countByStatus(s: string): number { return this.clientes().filter(c => (c.status || 'ATIVO') === s).length; }
  countByTipo(t: string): number { return this.clientes().filter(c => (c.tipo || 'PJ') === t).length; }

  formatDoc(doc: string): string {
    if (!doc) return '';
    if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return doc;
  }

  openForm(c?: Cliente) {
    if (c) { this.editingId.set(c.$id); this.form.patchValue(c); }
    else { this.editingId.set(null); this.form.reset({ tipo: 'PJ' }); }
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingId.set(null); }

  save() {
    if (this.form.invalid) return;
    const data = { ...this.form.value, status: 'ATIVO', tenantId: 'default' };
    const id = this.editingId();
    const obs = id ? this.appwrite.updateDocument('clientes', id, data) : this.appwrite.createDocument('clientes', data);
    obs.subscribe({
      next: () => { this.snackBar.open(id ? 'Atualizado!' : 'Criado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.closeForm(); this.load(); },
      error: e => this.snackBar.open(e.message || 'Erro', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] }),
    });
  }

  delete(c: Cliente) {
    if (!confirm(`Excluir "${c.razaoSocial}"?`)) return;
    this.appwrite.deleteDocument('clientes', c.$id).subscribe({
      next: () => { this.snackBar.open('Excluído', 'OK', { duration: 3000 }); this.load(); },
      error: () => this.snackBar.open('Erro ao excluir', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }
}
