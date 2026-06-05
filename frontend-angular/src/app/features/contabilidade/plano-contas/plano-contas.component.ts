import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContabilidadeService } from '../contabilidade.service';

interface ContaNode {
  id: string; codigo: string; descricao: string; natureza: string;
  tipo: string; classificacao: string; nivel: number; aceitaLancamento: boolean;
  filhos?: ContaNode[];
}

@Component({
  selector: 'bear-plano-contas',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatCheckboxModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Plano de Contas</h1>
          <p class="page-header__subtitle">Estrutura das contas contábeis da empresa</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem;font-size:0.8125rem;" (click)="importarReferencial()" [disabled]="loading()">
            <span class="material-symbols-rounded text-base mr-1">download</span> Importar Referencial
          </button>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="openForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Nova Conta
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#eef2ff"><span class="material-symbols-rounded" style="color:#4f46e5">account_tree</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Contas</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalContas() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ecfdf5"><span class="material-symbols-rounded" style="color:#059669">account_balance</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Sintéticas</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ sinteticas() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#f0fdfa"><span class="material-symbols-rounded" style="color:#0d9488">edit_note</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Analíticas</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ analiticas() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#f5f3ff"><span class="material-symbols-rounded" style="color:#7c3aed">layers</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Níveis</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ maxNivel() }}</p></div>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Tree -->
        <div class="lg:col-span-2">
          @if (!loading() && contas().length > 0) {
            <div class="bear-card overflow-hidden animate-fade-in-up">
              <div class="p-4 flex items-center justify-between" style="border-bottom:1px solid var(--border-subtle)">
                <h3 class="text-heading text-sm">Árvore de Contas</h3>
                <div style="display:flex;align-items:center;gap:0.5rem;padding:0 0.75rem;height:36px;border-radius:var(--radius-md);border:1.5px solid var(--border-color);background:var(--surface-0);min-width:200px;">
                  <span class="material-symbols-rounded" style="font-size:1rem;color:var(--text-tertiary)">search</span>
                  <input style="flex:1;border:none;outline:none;background:transparent;font-size:0.8125rem;color:var(--text-primary);font-family:inherit;"
                         placeholder="Buscar conta..." [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)">
                </div>
              </div>
              <div class="p-2" style="max-height:600px;overflow-y:auto;">
                @for (node of filteredContas(); track node.id) {
                  <ng-container *ngTemplateOutlet="contaRow; context: { $implicit: node }"></ng-container>
                }
              </div>
            </div>
          }

          @if (!loading() && contas().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">account_tree</span></div>
              <h3 class="empty-state__title">Nenhuma conta cadastrada</h3>
              <p class="empty-state__description">Importe o plano referencial CFC/CPC ou crie contas manualmente</p>
              <button class="bear-btn bear-btn--primary mt-4" style="padding:0.5rem 1.25rem;" (click)="importarReferencial()">
                <span class="material-symbols-rounded text-lg mr-1">download</span> Importar Referencial
              </button>
            </div>
          }
        </div>

        <!-- Form -->
        @if (showForm()) {
          <div class="lg:col-span-1 animate-fade-in-up">
            <div class="bear-card p-5">
              <div class="flex items-center justify-between mb-5">
                <h3 class="text-heading text-base">{{ editingId() ? 'Editar Conta' : 'Nova Conta' }}</h3>
                <button class="bear-btn bear-btn--ghost" style="padding:0.25rem" (click)="showForm.set(false)">
                  <span class="material-symbols-rounded text-sm">close</span>
                </button>
              </div>
              <form [formGroup]="contaForm" (ngSubmit)="saveConta()">
                <mat-form-field class="w-full" appearance="outline">
                  <mat-label>Código</mat-label>
                  <input matInput formControlName="codigo" placeholder="1.1.01.001">
                </mat-form-field>
                <mat-form-field class="w-full" appearance="outline">
                  <mat-label>Descrição</mat-label>
                  <input matInput formControlName="descricao">
                </mat-form-field>
                <mat-form-field class="w-full" appearance="outline">
                  <mat-label>Natureza</mat-label>
                  <mat-select formControlName="natureza">
                    <mat-option value="DEVEDORA">Devedora</mat-option>
                    <mat-option value="CREDORA">Credora</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field class="w-full" appearance="outline">
                  <mat-label>Tipo</mat-label>
                  <mat-select formControlName="tipo">
                    <mat-option value="SINTETICA">Sintética</mat-option>
                    <mat-option value="ANALITICA">Analítica</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field class="w-full" appearance="outline">
                  <mat-label>Classificação</mat-label>
                  <mat-select formControlName="classificacao">
                    <mat-option value="ATIVO">Ativo</mat-option>
                    <mat-option value="PASSIVO">Passivo</mat-option>
                    <mat-option value="PATRIMONIO_LIQUIDO">Patrimônio Líquido</mat-option>
                    <mat-option value="RECEITA">Receita</mat-option>
                    <mat-option value="DESPESA">Despesa</mat-option>
                    <mat-option value="CUSTO">Custo</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-checkbox formControlName="aceitaLancamento" class="mb-4">Aceita lançamento</mat-checkbox>
                <div class="flex gap-2 mt-4">
                  <button type="submit" class="bear-btn bear-btn--primary flex-1" style="padding:0.5rem" [disabled]="contaForm.invalid">
                    <span class="material-symbols-rounded text-lg mr-1">save</span> Salvar
                  </button>
                  <button type="button" class="bear-btn bear-btn--outline flex-1" style="padding:0.5rem" (click)="showForm.set(false)">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        }
      </div>
    </div>

    <ng-template #contaRow let-node>
      <div class="flex items-center py-2 px-3 rounded-lg group" style="transition:background 0.15s;"
           [style.padding-left.px]="12 + node.nivel * 20"
           [style.background]="selectedId() === node.id ? 'var(--surface-2)' : 'transparent'"
           (mouseenter)="hoveredId.set(node.id)" (mouseleave)="hoveredId.set(null)">
        @if (node.filhos?.length) {
          <button class="bear-btn bear-btn--ghost" style="padding:0.125rem;margin-right:0.25rem;" (click)="toggleNode(node.id)">
            <span class="material-symbols-rounded text-sm" style="color:var(--text-tertiary)">{{ expandedIds().has(node.id) ? 'expand_more' : 'chevron_right' }}</span>
          </button>
        } @else {
          <span style="width:28px;display:inline-block;"></span>
        }
        <span class="font-mono text-xs mr-3" style="color:var(--text-tertiary);min-width:80px;">{{ node.codigo }}</span>
        <span class="flex-1 text-sm" [style.font-weight]="node.tipo === 'SINTETICA' ? '600' : '400'" style="color:var(--text-primary)">{{ node.descricao }}</span>
        <span class="text-xs px-2 py-0.5 rounded-md mr-1" [style.background]="getClassBg(node.classificacao)" [style.color]="getClassColor(node.classificacao)">{{ node.classificacao }}</span>
        <span class="text-xs px-1.5 py-0.5 rounded-md" [style.background]="node.natureza === 'DEVEDORA' ? '#dbeafe' : '#fee2e2'" [style.color]="node.natureza === 'DEVEDORA' ? '#1d4ed8' : '#dc2626'">
          {{ node.natureza === 'DEVEDORA' ? 'D' : 'C' }}
        </span>
        @if (hoveredId() === node.id) {
          <div class="flex ml-2 gap-0.5">
            <button class="bear-btn bear-btn--ghost" style="padding:0.125rem 0.25rem;" matTooltip="Editar" (click)="editConta(node)">
              <span class="material-symbols-rounded text-sm">edit</span>
            </button>
            @if (node.tipo === 'ANALITICA') {
              <button class="bear-btn bear-btn--ghost" style="padding:0.125rem 0.25rem;color:#ef4444;" matTooltip="Excluir" (click)="deleteConta(node)">
                <span class="material-symbols-rounded text-sm">delete</span>
              </button>
            }
          </div>
        }
      </div>
      @if (node.filhos?.length && expandedIds().has(node.id)) {
        @for (child of node.filhos; track child.id) {
          <ng-container *ngTemplateOutlet="contaRow; context: { $implicit: child }"></ng-container>
        }
      }
    </ng-template>
  `,
})
export class PlanoContasComponent implements OnInit {
  loading = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  selectedId = signal<string | null>(null);
  hoveredId = signal<string | null>(null);
  searchTerm = signal('');
  contas = signal<ContaNode[]>([]);
  expandedIds = signal(new Set<string>());
  totalContas = signal(0);
  sinteticas = signal(0);
  analiticas = signal(0);
  maxNivel = signal(0);
  contaForm: FormGroup;

  constructor(private fb: FormBuilder, private service: ContabilidadeService, private snackBar: MatSnackBar) {
    this.contaForm = this.fb.group({
      codigo: ['', Validators.required], descricao: ['', Validators.required],
      natureza: ['DEVEDORA', Validators.required], tipo: ['ANALITICA', Validators.required],
      classificacao: ['ATIVO', Validators.required], aceitaLancamento: [true],
    });
  }

  ngOnInit() { this.loadContas(); }

  loadContas() {
    this.loading.set(true);
    this.service.getArvoreContas().subscribe({
      next: data => {
        this.contas.set(data);
        const stats = this.countNodes(data);
        this.totalContas.set(stats.total);
        this.sinteticas.set(stats.sinteticas);
        this.analiticas.set(stats.analiticas);
        this.maxNivel.set(stats.maxNivel);
        // Auto-expand first level
        const ids = new Set<string>();
        data.forEach(n => ids.add(n.id));
        this.expandedIds.set(ids);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.snackBar.open('Erro ao carregar contas', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }); }
    });
  }

  private countNodes(nodes: ContaNode[]): { total: number; sinteticas: number; analiticas: number; maxNivel: number } {
    let total = 0, sinteticas = 0, analiticas = 0, maxNivel = 0;
    const count = (list: ContaNode[]) => {
      for (const n of list) {
        total++;
        if (n.tipo === 'SINTETICA') sinteticas++; else analiticas++;
        if (n.nivel > maxNivel) maxNivel = n.nivel;
        if (n.filhos) count(n.filhos);
      }
    };
    count(nodes);
    return { total, sinteticas, analiticas, maxNivel };
  }

  filteredContas(): ContaNode[] {
    const t = this.searchTerm().toLowerCase();
    if (!t) return this.contas();
    return this.filterTree(this.contas(), t);
  }

  private filterTree(nodes: ContaNode[], term: string): ContaNode[] {
    return nodes.reduce<ContaNode[]>((acc, n) => {
      const match = n.codigo.toLowerCase().includes(term) || n.descricao.toLowerCase().includes(term);
      const filteredChildren = n.filhos ? this.filterTree(n.filhos, term) : [];
      if (match || filteredChildren.length > 0) {
        acc.push({ ...n, filhos: match ? n.filhos : filteredChildren });
      }
      return acc;
    }, []);
  }

  toggleNode(id: string) {
    const ids = new Set(this.expandedIds());
    if (ids.has(id)) ids.delete(id); else ids.add(id);
    this.expandedIds.set(ids);
  }

  openForm() {
    this.editingId.set(null);
    this.contaForm.reset({ natureza: 'DEVEDORA', tipo: 'ANALITICA', classificacao: 'ATIVO', aceitaLancamento: true });
    this.showForm.set(true);
  }

  saveConta() {
    const obs = this.editingId()
      ? this.service.updateConta(this.editingId()!, this.contaForm.value)
      : this.service.createConta(this.contaForm.value);
    obs.subscribe({
      next: () => { this.snackBar.open('Conta salva!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.loadContas(); },
      error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] })
    });
  }

  editConta(node: ContaNode) {
    this.editingId.set(node.id);
    this.selectedId.set(node.id);
    this.contaForm.patchValue(node);
    this.showForm.set(true);
  }

  deleteConta(node: ContaNode) {
    if (confirm(`Excluir ${node.codigo} - ${node.descricao}?`)) {
      this.service.deleteConta(node.id).subscribe({
        next: () => { this.snackBar.open('Excluída', 'OK', { duration: 3000 }); this.loadContas(); },
        error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] })
      });
    }
  }

  importarReferencial() {
    if (confirm('Importar plano de contas referencial CFC/CPC?')) {
      this.loading.set(true);
      this.service.importPlanoReferencial().subscribe({
        next: () => { this.snackBar.open('Plano importado!', 'OK', { duration: 5000, panelClass: ['success-snackbar'] }); this.loadContas(); },
        error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] }); }
      });
    }
  }

  getClassBg(c: string): string {
    const m: Record<string, string> = { 'ATIVO': '#dbeafe', 'PASSIVO': '#fee2e2', 'PATRIMONIO_LIQUIDO': '#dcfce7', 'RECEITA': '#ccfbf1', 'DESPESA': '#ffedd5', 'CUSTO': '#f3e8ff' };
    return m[c] || '#f3f4f6';
  }
  getClassColor(c: string): string {
    const m: Record<string, string> = { 'ATIVO': '#1d4ed8', 'PASSIVO': '#dc2626', 'PATRIMONIO_LIQUIDO': '#15803d', 'RECEITA': '#0d9488', 'DESPESA': '#c2410c', 'CUSTO': '#7c3aed' };
    return m[c] || '#6b7280';
  }
}
