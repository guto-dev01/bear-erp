import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '@core/auth/auth.service';
import { AppwriteService } from '@core/services/appwrite.service';

interface EmpresaItem { id: string; nome: string; cnpj: string; }

/**
 * Seletor global de empresa ativa (escritório contábil).
 * Ao trocar, atualiza `empresaAtualId` na sessão e recarrega a rota atual —
 * como todos os serviços leem `auth.empresaId()`, o app inteiro passa a operar
 * na empresa escolhida (plano de contas, lançamentos, livros, ECD, etc.).
 */
@Component({
  selector: 'bear-empresa-selector',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatTooltipModule],
  template: `
    <button class="toolbar__action" style="width:auto;padding:0 0.625rem;gap:0.4rem;display:flex;align-items:center"
            [matMenuTriggerFor]="empMenu" matTooltip="Trocar empresa ativa">
      <span class="material-symbols-rounded">apartment</span>
      <span class="text-sm font-medium truncate" style="max-width:170px">{{ empresaAtual()?.nome || 'Selecionar empresa' }}</span>
      <span class="material-symbols-rounded text-base">expand_more</span>
    </button>
    <mat-menu #empMenu="matMenu" class="empresa-menu">
      <div style="min-width:260px;max-height:380px;overflow-y:auto">
        <div class="px-4 py-2 text-xs font-semibold" style="color:var(--text-secondary)">Empresa ativa</div>
        @if (loading()) {
          <div class="px-4 py-3 text-sm" style="color:var(--text-secondary)">Carregando…</div>
        }
        @for (e of empresas(); track e.id) {
          <button mat-menu-item (click)="selecionar(e.id)">
            <span class="material-symbols-rounded mr-2"
                  [style.color]="e.id === auth.empresaId() ? 'var(--brand-primary)' : 'transparent'">check</span>
            <span class="font-medium">{{ e.nome }}</span>
            @if (e.cnpj) { <span class="text-xs ml-2" style="color:var(--text-secondary)">{{ formatCnpj(e.cnpj) }}</span> }
          </button>
        }
        @if (!loading() && !empresas().length) {
          <div class="px-4 py-3 text-sm" style="color:var(--text-secondary)">Nenhuma empresa cadastrada</div>
        }
      </div>
    </mat-menu>
  `,
})
export class EmpresaSelectorComponent implements OnInit {
  auth = inject(AuthService);
  private appwrite = inject(AppwriteService);
  private router = inject(Router);

  empresas = signal<EmpresaItem[]>([]);
  loading = signal(false);
  empresaAtual = computed(() => this.empresas().find(e => e.id === this.auth.empresaId()) ?? null);

  ngOnInit() { this.carregar(); }

  carregar() {
    if (!this.auth.isAuthenticated()) return;
    this.loading.set(true);
    const Q = this.appwrite.query;
    this.appwrite.listDocuments<any>('empresas', [Q.limit(100)]).subscribe({
      next: (docs) => {
        let lista: EmpresaItem[] = (docs || []).map((d: any) => ({
          id: d.$id, nome: d.nomeFantasia || d.razaoSocial || '(sem nome)', cnpj: (d.cnpj || '').replace(/\D/g, ''),
        }));
        const permitidas = this.auth.empresaIds();
        if (permitidas.length) lista = lista.filter(e => permitidas.includes(e.id));
        lista.sort((a, b) => a.nome.localeCompare(b.nome));
        this.empresas.set(lista);
        // Se não há empresa ativa mas existem empresas, ativa a primeira.
        if (!this.auth.empresaId() && lista.length) this.auth.setEmpresaAtual(lista[0].id);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selecionar(id: string) {
    if (id === this.auth.empresaId()) return;
    this.auth.setEmpresaAtual(id);
    // Recarrega a rota atual para os componentes re-buscarem dados da nova empresa.
    const url = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => this.router.navigateByUrl(url));
  }

  formatCnpj(cnpj: string): string {
    const d = (cnpj || '').replace(/\D/g, '');
    if (d.length !== 14) return cnpj;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }
}
