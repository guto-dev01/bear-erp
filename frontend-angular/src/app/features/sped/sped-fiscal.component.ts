import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface SpedDoc {
  $id: string;
  tipo: string;
  ano: number;
  competencia: string;
  status: string;
  protocolo?: string;
  empresaId: string;
  tenantId: string;
  $createdAt: string;
}

// View-model exposto ao template (mantém os nomes de campos usados no HTML existente)
interface SpedView {
  id: string;
  ano: number;
  mes: number;
  perfil: string;
  tipo: string;
  status: string;
  totalRegistros: number;
  nomeArquivo: string;
  protocoloRecibo: string;
}

const COLLECTION = 'sped_fiscal';

@Component({
  selector: 'bear-sped-fiscal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">SPED Fiscal</h1>
          <p class="page-header__subtitle">Geração e transmissão de arquivos SPED Fiscal</p>
        </div>
      </div>

      <div class="bear-card p-5 mb-6">
        <h3 class="text-heading text-base mb-4">Gerar SPED Fiscal</h3>
        <form [formGroup]="form" class="flex gap-4 items-end flex-wrap">
          <mat-form-field appearance="outline">
            <mat-label>Ano</mat-label>
            <input matInput type="number" formControlName="ano">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Mês</mat-label>
            <input matInput type="number" formControlName="mes" min="1" max="12">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Perfil</mat-label>
            <mat-select formControlName="perfil">
              <mat-option value="A">Perfil A</mat-option>
              <mat-option value="B">Perfil B</mat-option>
              <mat-option value="C">Perfil C</mat-option>
            </mat-select>
          </mat-form-field>
          <button class="bear-btn bear-btn--primary" style="padding: 0.625rem 1.25rem; margin-bottom: 22px;"
                  (click)="gerar()" [disabled]="form.invalid || gerando()">
            <span class="material-symbols-rounded text-base mr-1.5">build</span>
            Gerar Arquivo
          </button>
        </form>
      </div>

      @if (gerando()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <div class="bear-card p-5 mb-6">
        <h3 class="text-heading text-base mb-4">Consultar SPED por Ano</h3>
        <div class="flex gap-4 items-end">
          <mat-form-field appearance="outline">
            <mat-label>Ano</mat-label>
            <input matInput type="number" #anoInput [value]="anoAtual">
          </mat-form-field>
          <button class="bear-btn bear-btn--outline" style="padding: 0.625rem 1.25rem; margin-bottom: 22px;"
                  (click)="buscarPorAno(+anoInput.value)">
            <span class="material-symbols-rounded text-base mr-1.5">search</span>
            Buscar
          </button>
        </div>
      </div>

      @if (spedFiles().length > 0) {
        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Arquivos SPED</h3>
            <span class="badge badge--info">{{ spedFiles().length }} arquivo(s)</span>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="spedFiles()" class="w-full">
              <ng-container matColumnDef="periodo"><th mat-header-cell *matHeaderCellDef class="text-label">Período</th><td mat-cell *matCellDef="let s">{{ s.mes }}/{{ s.ano }}</td></ng-container>
              <ng-container matColumnDef="perfil"><th mat-header-cell *matHeaderCellDef class="text-label">Perfil</th><td mat-cell *matCellDef="let s">{{ s.perfil }}</td></ng-container>
              <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef class="text-label">Tipo</th><td mat-cell *matCellDef="let s">{{ s.tipo }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let s">
                  <span class="badge" [ngClass]="getStatusBadge(s.status)">
                    <span class="badge__dot"></span>
                    {{ s.status }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="registros"><th mat-header-cell *matHeaderCellDef class="text-label">Registros</th><td mat-cell *matCellDef="let s">{{ s.totalRegistros }}</td></ng-container>
              <ng-container matColumnDef="arquivo"><th mat-header-cell *matHeaderCellDef class="text-label">Arquivo</th><td mat-cell *matCellDef="let s">{{ s.nomeArquivo || '-' }}</td></ng-container>
              <ng-container matColumnDef="protocolo"><th mat-header-cell *matHeaderCellDef class="text-label">Protocolo</th><td mat-cell *matCellDef="let s">{{ s.protocoloRecibo || '-' }}</td></ng-container>
              <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef class="text-label">Ações</th>
                <td mat-cell *matCellDef="let s">
                  @if (s.status === 'GERADO') {
                    <button class="bear-btn bear-btn--ghost p-2" title="Transmitir" (click)="transmitir(s.id)">
                      <span class="material-symbols-rounded text-base" style="color: var(--brand-primary);">send</span>
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </div>
      }

      @if (spedFiles().length === 0 && !gerando()) {
        <div class="empty-state py-12">
          <span class="material-symbols-rounded empty-state__icon text-5xl mb-3" style="color: var(--text-secondary);">description</span>
          <p class="empty-state__title text-sm" style="color: var(--text-secondary);">Nenhum arquivo SPED encontrado</p>
          <p class="empty-state__description text-xs" style="color: var(--text-secondary);">Gere um arquivo ou busque por outro ano</p>
        </div>
      }
    </div>
  `,
})
export class SpedFiscalComponent {
  form: FormGroup;
  spedFiles = signal<SpedView[]>([]);
  gerando = signal(false);
  displayedColumns = ['periodo', 'perfil', 'tipo', 'status', 'registros', 'arquivo', 'protocolo', 'acoes'];
  anoAtual = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    const now = new Date();
    this.form = this.fb.group({
      ano: [now.getFullYear(), Validators.required],
      mes: [now.getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      perfil: ['A', Validators.required],
    });
    this.buscarPorAno(now.getFullYear());
  }

  private get tenantId(): string { return this.auth.tenantId() || 'default'; }
  private get empresaId(): string { return this.auth.empresaId() || ''; }

  private toView(d: SpedDoc): SpedView {
    const mes = Number((d.competencia || '').split('-')[1]) || 0;
    return {
      id: d.$id,
      ano: d.ano,
      mes,
      perfil: 'A',
      tipo: d.tipo,
      status: d.status,
      totalRegistros: 0,
      nomeArquivo: '',
      protocoloRecibo: d.protocolo ?? '',
    };
  }

  gerar() {
    if (this.form.invalid) return;
    this.gerando.set(true);
    const { ano, mes } = this.form.value;
    const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
    // A geração do arquivo SPED Fiscal (montagem dos registros e layout oficial) é
    // dependência externa. Persistimos o registro no Appwrite, mas não geramos o arquivo.
    // TODO(appwrite): integração externa
    const data: Record<string, unknown> = {
      tipo: 'SPED_FISCAL',
      ano,
      competencia,
      status: 'GERADO',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
      createdAt: new Date().toISOString(),
    };
    this.appwrite.createDocument<SpedDoc>(COLLECTION, data).subscribe({
      next: () => {
        this.gerando.set(false);
        this.snackBar.open('Geração do arquivo SPED requer integração externa (não disponível nesta versão Appwrite). Registro criado.', 'OK', { duration: 5000 });
        this.buscarPorAno(ano);
      },
      error: () => { this.gerando.set(false); this.snackBar.open('Erro ao registrar SPED', 'OK', { duration: 3000 }); },
    });
  }

  buscarPorAno(ano: number) {
    this.appwrite.listDocuments<SpedDoc>(COLLECTION, [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', this.tenantId),
      this.appwrite.query.equal('ano', ano),
    ]).subscribe({
      next: (res) => this.spedFiles.set(res.map((d) => this.toView(d))),
    });
  }

  transmitir(id: string) {
    // Transmissão do SPED (assinatura digital + envio ao Sped/Receita) é integração externa.
    // Atualizamos apenas o status do registro no Appwrite.
    // TODO(appwrite): integração externa
    this.appwrite.updateDocument<SpedDoc>(COLLECTION, id, { status: 'TRANSMITIDO' }).subscribe({
      next: () => {
        this.snackBar.open('Transmissão do SPED requer integração externa (não disponível nesta versão Appwrite). Status atualizado localmente.', 'OK', { duration: 5000 });
        this.buscarPorAno(this.form.value.ano);
      },
      error: () => this.snackBar.open('Erro ao transmitir', 'OK', { duration: 3000 }),
    });
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'PENDENTE': 'badge--warning',
      'GERADO': 'badge--info',
      'TRANSMITIDO': 'badge--success',
      'ERRO': 'badge--error',
    };
    return map[s] || 'badge--neutral';
  }
}
