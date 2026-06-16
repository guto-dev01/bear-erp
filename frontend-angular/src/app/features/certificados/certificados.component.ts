import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';

interface EmpresaRef { $id: string; razaoSocial: string; cnpj: string; }

interface UploadResultado {
  ok: boolean;
  erro?: string;
  metadados?: { titular?: string; cnpjCpf?: string; validoAte?: string; diasParaVencer?: number; vencido?: boolean; alerta?: boolean };
}

interface Certificado {
  $id: string;
  tipo: string;
  nome: string;
  cnpjCpf: string;
  emissor?: string;
  serialNumber?: string;
  dataValidade: string;
  status: string;
  totalOperacoes?: number;
  empresaId: string;
  tenantId: string;
  $createdAt: string;
}

interface OperacaoCertificado {
  $id: string;
  certificadoId: string;
  tipo: string;
  descricao?: string;
  data: string;
  resultado?: string;
  status: string;
  tenantId: string;
  $createdAt: string;
}

@Component({
  selector: 'bear-certificados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, MatPaginatorModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Certificados Digitais</h1>
          <p class="page-header__subtitle">Gerencie certificados digitais A1 e A3</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="carregarProximosVencimento()">
            <span class="material-symbols-rounded text-base mr-1.5">warning</span>
            Próximos a Vencer
          </button>
          <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="abrirUpload()">
            <span class="material-symbols-rounded text-base mr-1.5">lock</span>
            Enviar Certificado A1
          </button>
          <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="abrirFormManual()">
            <span class="material-symbols-rounded text-base mr-1.5">add</span>
            Cadastro manual
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      @if (modoLista()) {
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #ecfdf5;">
            <span class="material-symbols-rounded" style="color: #059669;">verified</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Ativos</p>
            <p class="text-2xl font-bold" style="color: #059669;">{{ contarPorStatus('ATIVO') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #fffbeb;">
            <span class="material-symbols-rounded" style="color: #d97706;">schedule</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Próximos a Vencer</p>
            <p class="text-2xl font-bold" style="color: #d97706;">{{ contarPorStatus('PROXIMO_VENCIMENTO') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #fef2f2;">
            <span class="material-symbols-rounded" style="color: #dc2626;">error</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Expirados</p>
            <p class="text-2xl font-bold" style="color: #dc2626;">{{ contarPorStatus('EXPIRADO') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: var(--surface-2);">
            <span class="material-symbols-rounded" style="color: var(--text-secondary);">block</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Revogados</p>
            <p class="text-2xl font-bold" style="color: var(--text-secondary);">{{ contarPorStatus('REVOGADO') }}</p>
          </div>
        </div>
      </div>

      @if (!showForm() && !showOperacoes()) {
        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Certificados</h3>
            <span class="badge badge--info">{{ certificados().length }} registro(s)</span>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="certificados()" class="w-full">
              <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef class="text-label">Nome</th><td mat-cell *matCellDef="let c" class="font-medium">{{ c.nome }}</td></ng-container>
              <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef class="text-label">Tipo</th>
                <td mat-cell *matCellDef="let c">
                  <span class="badge" [ngClass]="{'badge--info': c.tipo === 'A1', 'badge--neutral': c.tipo === 'A3'}">{{ c.tipo }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="cnpjCpf"><th mat-header-cell *matHeaderCellDef class="text-label">CNPJ/CPF</th><td mat-cell *matCellDef="let c">{{ c.cnpjCpf }}</td></ng-container>
              <ng-container matColumnDef="razaoSocial"><th mat-header-cell *matHeaderCellDef class="text-label">Razão Social</th><td mat-cell *matCellDef="let c">{{ c.razaoSocial }}</td></ng-container>
              <ng-container matColumnDef="validade"><th mat-header-cell *matHeaderCellDef class="text-label">Validade</th><td mat-cell *matCellDef="let c">{{ c.dataValidade | date:'dd/MM/yyyy' }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let c">
                  <span class="badge" [ngClass]="getStatusBadge(c.status)">
                    <span class="badge__dot"></span>
                    {{ formatStatus(c.status) }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="usos"><th mat-header-cell *matHeaderCellDef class="text-label">Usos</th><td mat-cell *matCellDef="let c">{{ c.totalOperacoes }}</td></ng-container>
              <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef class="text-label">Ações</th>
                <td mat-cell *matCellDef="let c">
                  <div class="flex gap-1">
                    <button class="bear-btn bear-btn--ghost p-2" title="Operações" (click)="verOperacoes(c.$id, c.nome)">
                      <span class="material-symbols-rounded text-base" style="color: var(--brand-primary);">history</span>
                    </button>
                    @if (c.status === 'ATIVO' || c.status === 'PROXIMO_VENCIMENTO') {
                      <button class="bear-btn bear-btn--ghost p-2" title="Revogar" (click)="revogar(c.$id)">
                        <span class="material-symbols-rounded text-base" style="color: #dc2626;">block</span>
                      </button>
                    }
                  </div>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
            @if (certificados().length === 0 && !loading()) {
              <div class="empty-state py-12">
                <span class="material-symbols-rounded text-5xl mb-3" style="color: var(--text-secondary);">badge</span>
                <p class="empty-state__title text-sm" style="color: var(--text-secondary);">Nenhum certificado encontrado</p>
              </div>
            }
          </div>
        </div>
      }
      }

      @if (showOperacoes()) {
        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Operações - {{ operacoesCertNome() }}</h3>
            <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                    (click)="showOperacoes.set(false)">
              <span class="material-symbols-rounded text-base mr-1.5">arrow_back</span>
              Voltar
            </button>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="operacoesPagina()" class="w-full">
              <ng-container matColumnDef="data"><th mat-header-cell *matHeaderCellDef class="text-label">Data</th><td mat-cell *matCellDef="let o">{{ o.data | date:'dd/MM/yyyy HH:mm' }}</td></ng-container>
              <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef class="text-label">Tipo</th><td mat-cell *matCellDef="let o">{{ o.tipo }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let o">
                  <span class="badge" [ngClass]="{'badge--success': o.status === 'SUCESSO', 'badge--error': o.status === 'FALHA'}">
                    <span class="badge__dot"></span>
                    {{ o.status }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="descricao"><th mat-header-cell *matHeaderCellDef class="text-label">Descrição</th><td mat-cell *matCellDef="let o">{{ o.descricao }}</td></ng-container>
              <ng-container matColumnDef="documento"><th mat-header-cell *matHeaderCellDef class="text-label">Documento</th><td mat-cell *matCellDef="let o">{{ o.resultado || '-' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="operacoesCols"></tr>
              <tr mat-row *matRowDef="let row; columns: operacoesCols;"></tr>
            </table>
          </div>
          <mat-paginator [length]="operacoesTotal()" [pageSize]="20" (page)="onOperacoesPage($event)"></mat-paginator>
        </div>
      }

      @if (showUpload()) {
        <div class="bear-card max-w-2xl mx-auto animate-fade-in-up">
          <!-- Cabeçalho -->
          <div class="flex items-start justify-between px-6 py-5 border-b" style="border-color: var(--border-subtle);">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:#ECEBFB;">
                <span class="material-symbols-rounded" style="color:#5856D6;">enterprise</span>
              </div>
              <div>
                <h3 class="text-heading text-base">Enviar Certificado A1</h3>
                <p class="text-xs" style="color: var(--text-secondary);">Arquivo .pfx ou .p12 + senha</p>
              </div>
            </div>
            <button class="bear-btn bear-btn--ghost p-2" (click)="showUpload.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <div class="p-6">
            <!-- Aviso de segurança -->
            <div class="flex items-start gap-2 p-3 rounded-lg mb-5" style="background: var(--surface-2);">
              <span class="material-symbols-rounded text-base mt-0.5" style="color:#34C759;">shield_lock</span>
              <p class="text-xs leading-relaxed" style="color: var(--text-secondary);">
                Arquivo e senha vão direto ao cofre seguro (server-side). A senha é cifrada e
                <strong style="color: var(--text-primary);">nunca</strong> fica salva no navegador.
                Validamos a senha, o CNPJ contra a empresa e a validade antes de aceitar.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-1">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Empresa</mat-label>
                <mat-select [(value)]="uploadEmpresaId">
                  @for (e of empresas(); track e.$id) {
                    <mat-option [value]="e.$id">{{ e.razaoSocial }} — {{ e.cnpj }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Senha do certificado</mat-label>
                <input matInput type="password" [(ngModel)]="uploadSenha" name="cert-pass" autocomplete="new-password">
              </mat-form-field>
            </div>

            <!-- Seletor de arquivo -->
            <p class="text-label mb-2">Arquivo do certificado</p>
            @if (arquivo(); as f) {
              <div class="flex items-center justify-between gap-3 p-3 rounded-lg mb-5" style="border:1px solid var(--border-subtle);">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="material-symbols-rounded shrink-0" style="color:#5856D6;">lock</span>
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate" style="color: var(--text-primary);">{{ f.name }}</p>
                    <p class="text-2xs" style="color: var(--text-tertiary);">{{ (f.size / 1024) | number:'1.0-1' }} KB</p>
                  </div>
                </div>
                <button class="bear-btn bear-btn--ghost p-2 shrink-0" type="button" title="Remover" (click)="limparArquivo()">
                  <span class="material-symbols-rounded text-base">close</span>
                </button>
              </div>
            } @else {
              <button type="button" (click)="fileInput.click()"
                      class="w-full flex flex-col items-center justify-center gap-1 py-6 rounded-lg mb-5"
                      style="border:1.5px dashed var(--border-subtle); background: var(--surface-2);">
                <span class="material-symbols-rounded text-2xl" style="color: var(--text-secondary);">upload_file</span>
                <span class="text-sm font-medium" style="color: var(--text-primary);">Escolher arquivo .pfx / .p12</span>
                <span class="text-2xs" style="color: var(--text-tertiary);">clique para selecionar</span>
              </button>
            }
            <input #fileInput type="file" accept=".pfx,.p12" hidden (change)="onFileSelected($event)">

            <!-- Feedback -->
            @if (uploadResultado(); as r) {
              @if (r.ok && r.metadados) {
                <div class="p-4 rounded-lg mb-5" style="background:#E9FAEF; border:1px solid #34C75933;">
                  <p class="text-sm font-semibold mb-1.5 flex items-center gap-1.5" style="color:#1f9d4d;">
                    <span class="material-symbols-rounded text-base">check_circle</span> Certificado válido e armazenado
                  </p>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs" style="color: var(--text-secondary);">
                    <p><span style="color: var(--text-tertiary);">Titular:</span> {{ r.metadados.titular }}</p>
                    <p><span style="color: var(--text-tertiary);">CNPJ:</span> {{ r.metadados.cnpjCpf }}</p>
                    <p>
                      <span style="color: var(--text-tertiary);">Validade:</span>
                      {{ r.metadados.validoAte | date:'dd/MM/yyyy' }}
                      <span class="font-medium" [style.color]="statusCor(r.metadados)"> · {{ statusVigencia(r.metadados) }}</span>
                    </p>
                  </div>
                </div>
              } @else {
                <div class="p-3 rounded-lg mb-5 flex items-start gap-2" style="background:#FDECEC; border:1px solid #dc262633;">
                  <span class="material-symbols-rounded text-base mt-0.5" style="color:#dc2626;">error</span>
                  <p class="text-sm" style="color:#b91c1c;">{{ r.erro }}</p>
                </div>
              }
            }
          </div>

          <!-- Rodapé -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t" style="border-color: var(--border-subtle);">
            <button class="bear-btn bear-btn--outline" type="button" style="padding: 0.5rem 1.25rem; font-size: 0.8125rem;"
                    (click)="showUpload.set(false)">Fechar</button>
            <button class="bear-btn bear-btn--primary" type="button" style="padding: 0.5rem 1.25rem; font-size: 0.8125rem;"
                    [disabled]="!uploadEmpresaId || !uploadSenha || !arquivo() || uploading()"
                    (click)="enviarA1()">
              @if (uploading()) {
                <span class="material-symbols-rounded text-base mr-1.5 animate-spin">progress_activity</span> Enviando…
              } @else {
                <span class="material-symbols-rounded text-base mr-1.5">cloud_upload</span> Enviar ao cofre
              }
            </button>
          </div>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-heading text-base">Novo Certificado Digital</h3>
            <button class="bear-btn bear-btn--ghost p-2" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome"></mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="tipo"><mat-option value="A1">A1 (Arquivo)</mat-option><mat-option value="A3">A3 (Token/Smartcard)</mat-option></mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>CNPJ/CPF</mat-label><input matInput formControlName="cnpjCpf"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Razão Social</mat-label><input matInput formControlName="razaoSocial"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Número Serial</mat-label><input matInput formControlName="serialNumber"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Emissor</mat-label><input matInput formControlName="emissor"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Data Emissão</mat-label><input matInput type="date" formControlName="dataEmissao"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Data Validade</mat-label><input matInput type="date" formControlName="dataValidade"></mat-form-field>
            <mat-form-field appearance="outline" class="col-span-2"><mat-label>Observação</mat-label><input matInput formControlName="observacao"></mat-form-field>
            <div class="col-span-2 flex gap-3 justify-end">
              <button class="bear-btn bear-btn--outline" type="button" (click)="showForm.set(false)">Cancelar</button>
              <button class="bear-btn bear-btn--primary" type="submit" [disabled]="form.invalid">Salvar</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class CertificadosComponent implements OnInit {
  certificados = signal<Certificado[]>([]); loading = signal(false); showForm = signal(false);
  showOperacoes = signal(false); operacoes = signal<OperacaoCertificado[]>([]); operacoesTotal = signal(0);
  operacoesPagina = signal<OperacaoCertificado[]>([]);
  operacoesCertId = signal(''); operacoesCertNome = signal('');
  displayedColumns = ['nome', 'tipo', 'cnpjCpf', 'razaoSocial', 'validade', 'status', 'usos', 'acoes'];
  operacoesCols = ['data', 'tipo', 'status', 'descricao', 'documento'];
  form!: FormGroup;

  // ── Upload seguro do A1 (server-side) ──────────────────────────────────────
  showUpload = signal(false);
  empresas = signal<EmpresaRef[]>([]);
  uploadEmpresaId = '';
  uploadSenha = '';
  arquivo = signal<File | null>(null);
  nomeArquivo = signal('');
  uploading = signal(false);
  uploadResultado = signal<UploadResultado | null>(null);

  /** Modo lista: KPIs + tabela só aparecem quando nenhum painel está aberto. */
  modoLista = computed(() => !this.showForm() && !this.showUpload() && !this.showOperacoes());

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      nome: ['', Validators.required], tipo: ['A1', Validators.required],
      cnpjCpf: ['', Validators.required], razaoSocial: [''],
      serialNumber: [''], emissor: [''],
      dataEmissao: ['', Validators.required], dataValidade: ['', Validators.required],
      observacao: [''],
    });
    this.carregar();
  }

  private tenantId(): string { return this.auth.tenantId() || 'default'; }
  private empresaId(): string { return this.auth.empresaId() || ''; }

  carregar() {
    this.loading.set(true);
    const Q = this.appwrite.query;
    const queries = [Q.limit(100), Q.orderDesc('$createdAt'), Q.equal('tenantId', this.tenantId())];
    const empresa = this.empresaId();
    if (empresa) queries.push(Q.equal('empresaId', empresa));
    this.appwrite.listDocuments<Certificado>('certificados', queries).subscribe({
      next: (res) => { this.certificados.set(res || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  carregarProximosVencimento() {
    this.loading.set(true);
    const Q = this.appwrite.query;
    const queries = [Q.limit(100), Q.orderDesc('$createdAt'), Q.equal('tenantId', this.tenantId())];
    const empresa = this.empresaId();
    if (empresa) queries.push(Q.equal('empresaId', empresa));
    this.appwrite.listDocuments<Certificado>('certificados', queries).subscribe({
      next: (res) => {
        // "proximos-vencimento": filtra/ordena por dataValidade no cliente.
        const hoje = new Date();
        const limite = new Date();
        limite.setDate(limite.getDate() + 30);
        const proximos = (res || [])
          .filter(c => {
            if (!c.dataValidade) return false;
            const v = new Date(c.dataValidade);
            return v >= hoje && v <= limite;
          })
          .sort((a, b) => new Date(a.dataValidade).getTime() - new Date(b.dataValidade).getTime());
        this.certificados.set(proximos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ tipo: 'A1' }); }

  /** Abre o cadastro manual (e fecha o painel de upload — são exclusivos). */
  abrirFormManual() {
    this.showUpload.set(false);
    this.showOperacoes.set(false);
    this.showForm.set(true);
    this.resetForm();
  }

  // ── Upload seguro do A1 ────────────────────────────────────────────────────
  abrirUpload() {
    this.showForm.set(false);
    this.showOperacoes.set(false);
    this.showUpload.set(true);
    this.uploadResultado.set(null);
    this.limparArquivo();
    this.uploadSenha = '';
    this.uploadEmpresaId = this.empresaId() || '';
    this.carregarEmpresas();
  }

  limparArquivo() {
    this.arquivo.set(null);
    this.nomeArquivo.set('');
  }

  private carregarEmpresas() {
    const Q = this.appwrite.query;
    this.appwrite.listDocuments<EmpresaRef>('empresas', [Q.limit(100), Q.equal('tenantId', this.tenantId())]).subscribe({
      next: (res) => this.empresas.set(res || []),
      error: () => this.empresas.set([]),
    });
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] || null;
    this.arquivo.set(f);
    this.nomeArquivo.set(f?.name || '');
  }

  async enviarA1() {
    const file = this.arquivo();
    const tenantId = this.tenantId();
    if (!this.uploadEmpresaId || !this.uploadSenha || !file || !tenantId) return;
    this.uploading.set(true);
    this.uploadResultado.set(null);
    let pfxBase64: string;
    try {
      pfxBase64 = await this.fileToBase64(file);
    } catch {
      this.uploading.set(false);
      this.snackBar.open('Não foi possível ler o arquivo', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }
    const senha = this.uploadSenha;
    // A senha sai da memória do componente já na chamada — nunca em localStorage.
    this.uploadSenha = '';
    this.appwrite.executeFunction<UploadResultado>(environment.appwrite.functions.certificadoUpload, {
      empresaId: this.uploadEmpresaId,
      tenantId,
      pfxBase64,
      senha,
      nomeArquivo: file.name,
    }).subscribe({
      next: (r) => {
        this.uploading.set(false);
        this.uploadResultado.set(r);
        if (r.ok) {
          this.snackBar.open('Certificado A1 enviado ao cofre!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
          this.carregar();
        } else {
          this.snackBar.open(r.erro || 'Falha ao enviar o certificado', 'Fechar', { duration: 4000, panelClass: ['error-snackbar'] });
        }
      },
      error: (e) => {
        this.uploading.set(false);
        this.snackBar.open(e?.message || 'Erro ao enviar o certificado', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] });
      },
    });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = String(reader.result || '');
        resolve(s.includes(',') ? s.split(',')[1] : s);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  statusVigencia(m: { diasParaVencer?: number; vencido?: boolean }): string {
    if (m.vencido) return 'Vencido';
    const d = m.diasParaVencer ?? 0;
    return d <= 30 ? `Vence em ${d} dia(s)` : 'Vigente';
  }

  statusCor(m: { diasParaVencer?: number; vencido?: boolean }): string {
    if (m.vencido) return '#dc2626';
    return (m.diasParaVencer ?? 0) <= 30 ? '#d97706' : '#34C759';
  }

  salvar() {
    if (!this.form.valid) return;
    const v = this.form.value;
    // razaoSocial/dataEmissao/observacao não existem na coleção; não persistidos.
    const data: Record<string, unknown> = {
      nome: v.nome,
      tipo: v.tipo,
      cnpjCpf: v.cnpjCpf,
      emissor: v.emissor || '',
      serialNumber: v.serialNumber || '',
      dataValidade: v.dataValidade,
      status: 'ATIVO',
      totalOperacoes: 0,
      tenantId: this.tenantId(),
      empresaId: this.empresaId(),
      createdAt: new Date().toISOString(),
    };
    this.appwrite.createDocument<Certificado>('certificados', data).subscribe({
      next: () => { this.snackBar.open('Certificado cadastrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
      error: (e) => this.snackBar.open(e?.message || 'Erro ao cadastrar certificado', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  revogar(id: string) {
    this.appwrite.updateDocument<Certificado>('certificados', id, { status: 'REVOGADO' }).subscribe({
      next: () => { this.snackBar.open('Certificado revogado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.carregar(); },
      error: (e) => this.snackBar.open(e?.message || 'Erro ao revogar', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  verOperacoes(certId: string, certNome: string, page = 0) {
    this.operacoesCertId.set(certId);
    this.operacoesCertNome.set(certNome);
    this.showOperacoes.set(true);
    const Q = this.appwrite.query;
    this.appwrite.listDocuments<OperacaoCertificado>('operacoes_certificado', [
      Q.limit(100),
      Q.orderDesc('$createdAt'),
      Q.equal('tenantId', this.tenantId()),
      Q.equal('certificadoId', certId),
    ]).subscribe({
      next: (res) => {
        this.operacoes.set(res || []);
        this.operacoesTotal.set((res || []).length);
        this.aplicarPaginaOperacoes(page);
      },
      error: () => { this.operacoes.set([]); this.operacoesTotal.set(0); this.operacoesPagina.set([]); },
    });
  }

  private aplicarPaginaOperacoes(page: number, size = 20) {
    const start = page * size;
    this.operacoesPagina.set(this.operacoes().slice(start, start + size));
  }

  onOperacoesPage(event: PageEvent) { this.aplicarPaginaOperacoes(event.pageIndex, event.pageSize); }

  contarPorStatus(status: string): number {
    return this.certificados().filter(c => c.status === status).length;
  }

  formatStatus(s: string): string {
    const map: Record<string, string> = { ATIVO: 'Ativo', EXPIRADO: 'Expirado', REVOGADO: 'Revogado', PROXIMO_VENCIMENTO: 'Próx. Vencimento' };
    return map[s] || s;
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'ATIVO': 'badge--success',
      'PROXIMO_VENCIMENTO': 'badge--warning',
      'EXPIRADO': 'badge--error',
      'REVOGADO': 'badge--neutral',
    };
    return map[s] || 'badge--neutral';
  }
}
