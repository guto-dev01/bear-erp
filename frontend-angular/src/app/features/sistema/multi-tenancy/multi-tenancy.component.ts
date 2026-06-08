import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'bear-multi-tenancy',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Gestão de Escritórios</h1>
          <p class="page-header__subtitle">Multi-tenancy — Administração de escritórios e clientes</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo Escritório
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">business</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Escritórios</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ escritorios().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">check_circle</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Ativos</p><p class="text-2xl font-bold" style="color:#34C759">{{ countByStatus('ATIVO') }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFF4E5"><span class="material-symbols-rounded" style="color:#FF9500">group</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Clientes</p><p class="text-2xl font-bold" style="color:#FF9500">{{ totalClientes() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#F2EBFB"><span class="material-symbols-rounded" style="color:#AF52DE">person</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Usuários</p><p class="text-2xl font-bold" style="color:#AF52DE">{{ totalUsuarios() }}</p></div>
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
        @if (escritorios().length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon"><span class="material-symbols-rounded">business</span></div>
            <h3 class="empty-state__title">Nenhum escritório cadastrado</h3>
            <p class="empty-state__description">Cadastre o primeiro escritório contábil</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (e of escritorios(); track e.id || e.cnpj) {
              <div class="bear-card p-5 animate-fade-in-up">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                         style="background:linear-gradient(135deg, #007AFF, #5856D6);">
                      {{ getInitials(e.nomeEscritorio) }}
                    </div>
                    <div>
                      <h4 class="text-sm font-semibold" style="color:var(--text-primary)">{{ e.nomeEscritorio }}</h4>
                      <p class="text-xs font-mono" style="color:var(--text-tertiary)">{{ e.cnpj }}</p>
                    </div>
                  </div>
                  <span class="badge" [ngClass]="getStatusBadge(e.status)"><span class="badge__dot"></span>{{ e.status }}</span>
                </div>

                <div class="flex items-center gap-2 mb-3">
                  <span class="badge" [ngClass]="getPlanoBadge(e.plano)">{{ e.plano }}</span>
                </div>

                <div class="grid grid-cols-2 gap-3 py-3" style="border-top:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle)">
                  <div>
                    <p class="text-2xs" style="color:var(--text-tertiary)">Clientes</p>
                    <p class="text-lg font-bold" style="color:var(--text-primary)">{{ e.totalClientes || 0 }}</p>
                  </div>
                  <div>
                    <p class="text-2xs" style="color:var(--text-tertiary)">Usuários</p>
                    <p class="text-lg font-bold" style="color:var(--text-primary)">{{ e.totalUsuarios || 0 }}</p>
                  </div>
                </div>

                <div class="flex items-center justify-between mt-3">
                  <span class="text-xs" style="color:var(--text-tertiary)">
                    <span class="material-symbols-rounded text-xs mr-0.5" style="vertical-align:middle;">mail</span>{{ e.email }}
                  </span>
                  <button class="bear-btn bear-btn--outline" style="padding:0.25rem 0.75rem;font-size:0.75rem;" matTooltip="Acessar escritório">
                    <span class="material-symbols-rounded text-sm mr-0.5">login</span> Acessar
                  </button>
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
            <h2 class="text-heading text-lg">Novo Escritório</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <p class="text-label mb-3">Dados do Escritório</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Nome do Escritório</mat-label><input matInput formControlName="nomeEscritorio"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CNPJ</mat-label><input matInput formControlName="cnpj" placeholder="00.000.000/0001-00"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Responsável</mat-label><input matInput formControlName="responsavel"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>E-mail</mat-label><input matInput formControlName="email" type="email"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Telefone</mat-label><input matInput formControlName="telefone"></mat-form-field>
            </div>
            <p class="text-label mb-3">Plano e Limites</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <mat-form-field appearance="outline"><mat-label>Plano</mat-label>
                <mat-select formControlName="plano">
                  <mat-option value="BASICO">Básico</mat-option>
                  <mat-option value="PROFISSIONAL">Profissional</mat-option>
                  <mat-option value="ENTERPRISE">Enterprise</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Limite Clientes</mat-label><input matInput type="number" formControlName="limiteClientes"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Limite Usuários</mat-label><input matInput type="number" formControlName="limiteUsuarios"></mat-form-field>
            </div>
            <p class="text-label mb-3">Endereço</p>
            <div class="grid grid-cols-1 gap-4">
              <mat-form-field appearance="outline"><mat-label>Endereço</mat-label><input matInput formControlName="endereco"></mat-form-field>
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
export class MultiTenancyComponent implements OnInit {
  escritorios = signal<any[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalClientes = signal(0);
  totalUsuarios = signal(0);
  form!: FormGroup;
  private apiUrl = `${environment.apiUrl}/sistema/tenants`;

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      nomeEscritorio: ['', Validators.required], cnpj: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]], telefone: [''],
      responsavel: ['', Validators.required], plano: ['PROFISSIONAL'],
      limiteClientes: [50], limiteUsuarios: [10], endereco: [''],
    });
    this.carregar();
  }

  carregar() {
    this.loading.set(true);
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (res) => {
        const items = Array.isArray(res) ? res : [];
        this.escritorios.set(items);
        this.totalClientes.set(items.reduce((s, e) => s + (e.totalClientes || 0), 0));
        this.totalUsuarios.set(items.reduce((s, e) => s + (e.totalUsuarios || 0), 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ plano: 'PROFISSIONAL', limiteClientes: 50, limiteUsuarios: 10 }); }
  countByStatus(status: string): number { return this.escritorios().filter(e => e.status === status).length; }
  getInitials(name: string): string { return (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }

  getStatusBadge(s: string): string {
    const m: Record<string, string> = { ATIVO: 'badge--success', SUSPENSO: 'badge--error', TRIAL: 'badge--warning' };
    return m[s] || 'badge--neutral';
  }

  getPlanoBadge(p: string): string {
    const m: Record<string, string> = { BASICO: 'badge--neutral', PROFISSIONAL: 'badge--info', ENTERPRISE: 'badge--purple' };
    return m[p] || 'badge--neutral';
  }

  salvar() {
    if (this.form.valid) {
      this.http.post<any>(this.apiUrl, this.form.value).subscribe({
        next: () => { this.snackBar.open('Escritório criado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao criar escritório', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }
}
