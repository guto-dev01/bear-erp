import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '@core/auth/auth.service';
import { AppwriteService } from '@core/services/appwrite.service';
import { FiscalService, RetornoDistribuicao, RetornoSefaz } from '../fiscal.service';
import { NotaView, mapearDocumentoWorker, montarLinhas, resumoSync, resumoSyncWorker } from './importar-nfe.mapper';
import { CertInfo, ResultadoSync, SefazImportService } from './sefaz-import.service';

/** Documento da coleção `empresas` (campos reais reaproveitados do cadastro existente). */
interface EmpresaDoc {
  $id: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  ie?: string;
  uf?: string;
  estado?: string;
  regimeTributario?: string;
}

/** Documento da coleção `certificados` (mesmo modelo da tela de Certificados). */
interface CertDoc {
  $id: string;
  status?: string;
  cnpjCpf?: string;
  razaoSocial?: string;
  emissor?: string;
  dataValidade?: string;
  empresaId?: string;
  metadados?: { titular?: string; cnpjCpf?: string; validoAte?: string; diasParaVencer?: number };
}

type Ambiente = 'homologacao' | 'producao';

/** Registro (desta sessão) de uma sincronização com a SEFAZ. */
interface HistoricoSync {
  id: string;
  quando: string;
  ultNsu: string;
  maxNsu: string;
  docs: number;
  motivo: string;
}

@Component({
  selector: 'bear-importar-nfe',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatTooltipModule],
  template: `
    <div class="page-container">
      <!-- Cabeçalho -->
      <header class="page-header">
        <div>
          <nav class="page-header__breadcrumb">
            <a routerLink="/dashboard">Início</a>
            <span class="material-symbols-rounded" style="font-size:1rem">chevron_right</span>
            <span>Fiscal</span>
            <span class="material-symbols-rounded" style="font-size:1rem">chevron_right</span>
            <span>Importar NF-e</span>
          </nav>
          <h1 class="page-header__title">Importar NF-e</h1>
          <p class="page-header__subtitle">
            Consulte e importe documentos fiscais eletrônicos disponibilizados pela SEFAZ para a empresa selecionada.
          </p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline bear-btn--sm" (click)="importarManualmente()">
            <span class="material-symbols-rounded text-base mr-1">upload_file</span> Importar XML manualmente
          </button>
          <a class="bear-btn bear-btn--outline bear-btn--sm" routerLink="/certificados">
            <span class="material-symbols-rounded text-base mr-1">verified</span> Configurar certificado
          </a>
          <button class="bear-btn bear-btn--primary bear-btn--sm" (click)="sincronizar()"
                  [disabled]="!empresaId() || sincronizando()">
            <span class="material-symbols-rounded text-base mr-1" [class.animate-spin]="sincronizando()">sync</span>
            {{ sincronizando() ? 'Sincronizando…' : 'Sincronizar agora' }}
          </button>
        </div>
      </header>

      @if (!empresaId()) {
        <div class="bear-card">
          <div class="empty-state">
            <div class="empty-state__icon"><span class="material-symbols-rounded">apartment</span></div>
            <p class="empty-state__title">Nenhuma empresa selecionada</p>
            <p class="empty-state__description">
              A importação de NF-e está sempre vinculada a uma empresa. Selecione uma empresa no seletor do topo para continuar.
            </p>
          </div>
        </div>
      } @else {
        <!-- Cards: Empresa + Certificado -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div class="bear-card p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="stat-icon stat-icon--brand"><span class="material-symbols-rounded">apartment</span></div>
              <div class="min-w-0">
                <p class="text-label">Empresa selecionada</p>
                <p class="text-heading-sm truncate">{{ empresa()?.razaoSocial || empresa()?.nomeFantasia || '—' }}</p>
              </div>
            </div>
            @if (carregandoEmpresa()) {
              <div class="skeleton skeleton--text mb-2"></div><div class="skeleton skeleton--text-sm"></div>
            } @else {
              <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <div><dt class="text-label">Nome fantasia</dt><dd class="text-body-sm">{{ empresa()?.nomeFantasia || '—' }}</dd></div>
                <div><dt class="text-label">CNPJ</dt><dd class="text-body-sm tabular">{{ formatCnpj(empresa()?.cnpj) }}</dd></div>
                <div><dt class="text-label">Inscrição estadual</dt><dd class="text-body-sm tabular">{{ empresa()?.inscricaoEstadual || empresa()?.ie || '—' }}</dd></div>
                <div>
                  <dt class="text-label">Estado (UF)</dt>
                  <dd class="text-body-sm">{{ empresa()?.uf || empresa()?.estado || '— (preencha no cadastro da empresa)' }}</dd>
                </div>
                <div>
                  <dt class="text-label">Ambiente SEFAZ</dt>
                  <dd>
                    <div class="ios-segmented mt-1" role="group" aria-label="Ambiente SEFAZ">
                      <button class="ios-segmented__item" [class.ios-segmented__item--active]="ambiente() === 'homologacao'"
                              (click)="ambiente.set('homologacao')">Homologação</button>
                      <button class="ios-segmented__item" [class.ios-segmented__item--active]="ambiente() === 'producao'"
                              (click)="ambiente.set('producao')">Produção</button>
                    </div>
                  </dd>
                </div>
                <div>
                  <dt class="text-label">Status do certificado</dt>
                  <dd><span class="badge" [ngClass]="certBadge()"><span class="badge__dot"></span>{{ certLabel() }}</span></dd>
                </div>
              </dl>
            }
          </div>

          <div class="bear-card p-5">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="stat-icon" [ngClass]="certIconClass()"><span class="material-symbols-rounded">verified_user</span></div>
                <div><p class="text-label">Certificado digital A1</p><p class="text-heading-sm">{{ certLabel() }}</p></div>
              </div>
            </div>
            @if (carregandoCert()) {
              <div class="skeleton skeleton--text mb-2"></div><div class="skeleton skeleton--text-sm"></div>
            } @else if (certificado()) {
              <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4">
                <div><dt class="text-label">CNPJ do certificado</dt><dd class="text-body-sm tabular">{{ certificado()?.cnpjCpf || '—' }}</dd></div>
                <div><dt class="text-label">Autoridade certificadora</dt><dd class="text-body-sm truncate">{{ certificado()?.emissor || '—' }}</dd></div>
                <div><dt class="text-label">Validade</dt><dd class="text-body-sm tabular">{{ (certificado()?.dataValidade | date:'dd/MM/yyyy') || '—' }}</dd></div>
                <div><dt class="text-label">Dias restantes</dt><dd class="text-body-sm tabular">{{ diasRestantes() ?? '—' }}</dd></div>
              </dl>
            } @else {
              <p class="text-body-sm ink-secondary mb-3">
                Nenhum certificado no cofre para esta empresa. Envie o A1 (.pfx/.p12) na tela
                <a routerLink="/certificados">Certificados</a> — ele fica guardado no cofre e é usado
                automaticamente nas consultas à SEFAZ.
              </p>
            }

            <!-- Teste de conexão: usa o A1 do cofre no backend (Function nfe-transmissao, operação 'status'). -->
            <div class="mt-1 p-3 rounded-lg" style="background:var(--surface-2)">
              <p class="text-label mb-2 flex items-center gap-1.5">
                <span class="material-symbols-rounded text-base ink-success">cloud_done</span>
                Conexão com a SEFAZ (certificado do cofre)
              </p>
              <button class="bear-btn bear-btn--tinted bear-btn--sm" (click)="testarConexao()"
                      [disabled]="testando() || !certificado()">
                {{ testando() ? 'Testando…' : 'Testar conexão SEFAZ' }}
              </button>
              @if (statusSefaz(); as st) {
                <p class="text-caption mt-2" [ngClass]="st.ok && st.online ? 'ink-success' : 'ink-error'">
                  {{ st.ok && st.online
                      ? 'Serviço online · cStat ' + st.cStat + ' · ' + st.xMotivo
                      : (st.erro || st.xMotivo || 'Serviço indisponível.') }}
                </p>
              }
            </div>

            <!-- Alternativa sem cofre: A1 avulso enviado ao worker fiscal_sefaz (local ou Render). -->
            <div class="mt-3 p-3 rounded-lg" style="background:var(--surface-2)">
              <p class="text-label mb-2 flex items-center gap-1.5">
                <span class="material-symbols-rounded text-base">key</span>
                Certificado avulso (.pfx) — worker SEFAZ
              </p>
              <div class="flex flex-wrap items-center gap-2">
                <label class="bear-btn bear-btn--outline bear-btn--sm" style="cursor:pointer">
                  <span class="material-symbols-rounded text-base mr-1">attach_file</span>
                  {{ certFileName() || 'Escolher .pfx / .p12' }}
                  <input type="file" accept=".pfx,.p12" hidden (change)="onCertFile($event)">
                </label>
                <input class="bear-input bear-input--sm" style="max-width:180px" type="password"
                       placeholder="Senha do A1" autocomplete="off"
                       [ngModel]="certSenha()" (ngModelChange)="certSenha.set($event)">
                <button class="bear-btn bear-btn--tinted bear-btn--sm" (click)="testarCertificadoAvulso()"
                        [disabled]="testandoAvulso()">
                  {{ testandoAvulso() ? 'Validando…' : 'Testar certificado' }}
                </button>
              </div>
              @if (certTeste(); as t) {
                <p class="text-caption mt-2" [ngClass]="t.ok ? 'ink-success' : 'ink-error'">
                  {{ t.ok
                      ? 'Válido até ' + ((t.valid_until | date:'dd/MM/yyyy') || '—') + ' · CNPJ ' + (t.certificate_cnpj || '—')
                      : (t.erro || 'Falha na validação.') }}
                </p>
              }
              <p class="text-caption ink-secondary mt-2">
                Com um .pfx selecionado, "Sincronizar agora" consulta a SEFAZ pelo worker
                ({{ workerBase }}) em vez do cofre. Arquivo e senha só trafegam na requisição — nada fica salvo.
              </p>
            </div>
          </div>
        </div>

        <!-- Última sincronização -->
        <div class="bear-card p-4 mb-4 flex items-center gap-3">
          <div class="stat-icon stat-icon--neutral stat-icon--sm"><span class="material-symbols-rounded">history</span></div>
          <div class="flex-1 min-w-0">
            <p class="text-label">Última sincronização</p>
            <p class="text-body-sm">{{ ultimaSync() }}</p>
          </div>
          <span class="badge" [ngClass]="statusSyncBadge()"><span class="badge__dot"></span>{{ statusSync() }}</span>
        </div>

        <!-- Filtros -->
        <div class="bear-card p-4 mb-4">
          <div class="flex flex-wrap items-end gap-3">
            <div class="bear-search flex-1" style="min-width:220px">
              <span class="material-symbols-rounded bear-search__icon">search</span>
              <input class="bear-search__input" type="text" placeholder="Buscar por chave, número ou emitente…"
                     [ngModel]="busca()" (ngModelChange)="busca.set($event)">
            </div>
            <div style="min-width:150px">
              <label class="text-label block mb-1">Tipo</label>
              <select class="bear-input bear-input--sm" [ngModel]="filtroTipo()" (ngModelChange)="filtroTipo.set($event)">
                <option value="">Todos</option>
                <option value="procNFe">NF-e completa</option>
                <option value="resNFe">Resumo de NF-e</option>
              </select>
            </div>
            <button class="bear-btn bear-btn--outline bear-btn--sm" (click)="atualizarLista()"
                    matTooltip="Recarregar contexto" aria-label="Recarregar">
              <span class="material-symbols-rounded text-base">refresh</span>
            </button>
          </div>
        </div>

        <!-- Notas encontradas -->
        <div class="bear-card mb-4">
          <div class="flex items-center justify-between px-5 py-4" style="border-bottom:1px solid var(--separator)">
            <p class="text-heading-sm">Notas encontradas</p>
            <span class="text-caption">{{ notasFiltradas().length }} documento(s)</span>
          </div>

          @if (sincronizando()) {
            <div class="p-4">@for (i of [1,2,3,4]; track i) { <div class="skeleton skeleton--row"></div> }</div>
          } @else if (notasFiltradas().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">inbox</span></div>
              <p class="empty-state__title">Nenhuma nota carregada</p>
              <p class="empty-state__description">
                Clique em <strong>Sincronizar agora</strong> para consultar a SEFAZ (Distribuição DF-e) usando o
                certificado A1 do cofre. As NF-e completas são escrituradas em Notas Fiscais (entrada); os resumos
                ficam aguardando manifestação para liberar o XML completo.
              </p>
            </div>
          } @else {
            <div class="table-scroll">
              <table class="w-full">
                <thead><tr>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left;width:40px"></th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">Número</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">Emitente</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">Chave</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">Emissão</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:right">Valor</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">Tipo</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">Status</th>
                </tr></thead>
                <tbody>
                  @for (n of notasFiltradas(); track n.chave) {
                    <tr style="border-top:1px solid var(--separator)">
                      <td style="padding:.75rem 1rem"><input type="checkbox"></td>
                      <td style="padding:.75rem 1rem" class="tabular">{{ n.numero }}</td>
                      <td style="padding:.75rem 1rem">{{ n.emitente }}</td>
                      <td style="padding:.75rem 1rem"><span class="text-mono text-caption">{{ n.chave || '—' }}</span></td>
                      <td style="padding:.75rem 1rem" class="tabular">{{ (n.emissao | date:'dd/MM/yyyy') || '—' }}</td>
                      <td style="padding:.75rem 1rem;text-align:right" class="tabular">{{ n.valor != null ? (n.valor | currency:'BRL') : '—' }}</td>
                      <td style="padding:.75rem 1rem">{{ n.tipo }}</td>
                      <td style="padding:.75rem 1rem"><span class="badge badge--neutral">{{ n.status }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Histórico de sincronizações -->
        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4" style="border-bottom:1px solid var(--separator)">
            <p class="text-heading-sm">Histórico de sincronizações</p>
          </div>
          @if (historico().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">manage_history</span></div>
              <p class="empty-state__title">Nenhuma sincronização registrada</p>
              <p class="empty-state__description">As sincronizações desta sessão (NSU, documentos, resultado) aparecerão aqui após o primeiro "Sincronizar agora".</p>
            </div>
          } @else {
            <div class="table-scroll">
              <table class="w-full">
                <thead><tr>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">Quando</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">últ. NSU</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">max NSU</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:right">Docs</th>
                  <th class="text-label" style="padding:.75rem 1rem;text-align:left">Resultado</th>
                </tr></thead>
                <tbody>
                  @for (h of historico(); track h.id) {
                    <tr style="border-top:1px solid var(--separator)">
                      <td style="padding:.75rem 1rem" class="tabular text-caption">{{ h.quando }}</td>
                      <td style="padding:.75rem 1rem" class="tabular">{{ h.ultNsu }}</td>
                      <td style="padding:.75rem 1rem" class="tabular">{{ h.maxNsu }}</td>
                      <td style="padding:.75rem 1rem;text-align:right" class="tabular">{{ h.docs }}</td>
                      <td style="padding:.75rem 1rem" class="text-caption">{{ h.motivo }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ImportarNfeComponent implements OnInit {
  private auth = inject(AuthService);
  private appwrite = inject(AppwriteService);
  private fiscal = inject(FiscalService);
  private sefaz = inject(SefazImportService);
  private snack = inject(MatSnackBar);

  readonly empresaId = computed(() => this.auth.empresaId());
  /** URL do worker fiscal_sefaz (environment.sefazWorkerUrl) — exibida como dica na tela. */
  readonly workerBase = this.sefaz.base;

  empresa = signal<EmpresaDoc | null>(null);
  certificado = signal<CertDoc | null>(null);
  carregandoEmpresa = signal(false);
  carregandoCert = signal(false);
  sincronizando = signal(false);
  testando = signal(false);

  // Certificado A1 avulso (fluxo do worker; alternativa ao cofre).
  certFile: File | null = null;
  certFileName = signal('');
  certSenha = signal('');
  certTeste = signal<CertInfo | null>(null);
  testandoAvulso = signal(false);
  /** NSU de partida da próxima consulta paginada pelo worker. */
  ultNsuWorker = signal('0');

  ambiente = signal<Ambiente>('homologacao');

  // Teste de conexão com a SEFAZ (A1 do cofre, operação 'status' da Function).
  statusSefaz = signal<RetornoSefaz | null>(null);

  notas = signal<NotaView[]>([]);
  historico = signal<HistoricoSync[]>([]);
  lastResumo = signal<RetornoDistribuicao | null>(null);

  busca = signal('');
  filtroTipo = signal('');

  notasFiltradas = computed(() => {
    const q = this.busca().toLowerCase().trim();
    const tp = this.filtroTipo();
    return this.notas().filter(n =>
      (!q || `${n.numero} ${n.emitente} ${n.chave}`.toLowerCase().includes(q)) &&
      (!tp || n.tipoRaw === tp));
  });

  ngOnInit(): void {
    const id = this.empresaId();
    if (id) this.carregarContexto(id);
  }

  private carregarContexto(empresaId: string): void {
    this.carregandoEmpresa.set(true);
    this.appwrite.getDocument<EmpresaDoc>('empresas', empresaId).subscribe({
      next: (e) => { this.empresa.set(e); this.carregandoEmpresa.set(false); this.carregarCertificado(empresaId); },
      error: () => { this.empresa.set(null); this.carregandoEmpresa.set(false); },
    });
  }

  private carregarCertificado(empresaId: string): void {
    this.carregandoCert.set(true);
    this.appwrite.listDocuments<CertDoc>('certificados', [this.appwrite.query.equal('empresaId', empresaId)]).subscribe({
      next: (lista) => { this.certificado.set(lista?.[0] ?? null); this.carregandoCert.set(false); },
      error: () => { this.certificado.set(null); this.carregandoCert.set(false); },
    });
  }

  /**
   * Ping do serviço da SEFAZ (Function `nfe-transmissao`, operação 'status'):
   * valida A1 do cofre + mTLS sem emitir nem consultar nada.
   */
  testarConexao(): void {
    if (this.testando()) return;
    this.testando.set(true);
    this.statusSefaz.set(null);
    this.fiscal.consultarStatusSefaz(this.ambiente()).subscribe(st => {
      this.testando.set(false);
      this.statusSefaz.set(st);
      const ok = st.ok && !!st.online;
      this.snack.open(
        ok ? `Serviço SEFAZ online · ${st.xMotivo || ''}` : (st.erro || st.xMotivo || 'Serviço indisponível.'),
        'Fechar', { duration: 6000, panelClass: ok ? 'success-snackbar' : 'error-snackbar' });
    });
  }

  // ── Certificado A1 avulso → worker fiscal_sefaz (local ou Render) ─────────

  onCertFile(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.certFile = f;
    this.certFileName.set(f?.name ?? '');
    this.certTeste.set(null);
    this.ultNsuWorker.set('0'); // certificado novo → paginação recomeça do zero
  }

  /** Valida o .pfx/.p12 no worker (não envia nada à SEFAZ). */
  testarCertificadoAvulso(): void {
    if (!this.certFile || !this.certSenha()) {
      this.snack.open('Selecione o arquivo .pfx/.p12 e informe a senha.', 'Fechar', { duration: 4000, panelClass: 'warning-snackbar' });
      return;
    }
    this.testandoAvulso.set(true);
    const cnpj = (this.empresa()?.cnpj || '').replace(/\D/g, '');
    this.sefaz.testarCertificado(this.certFile, this.certSenha(), cnpj || undefined).subscribe({
      next: (info) => {
        this.testandoAvulso.set(false);
        this.certTeste.set(info);
        this.snack.open(info.ok ? 'Certificado válido.' : (info.erro || 'Falha na validação.'),
          'Fechar', { duration: 5000, panelClass: info.ok ? 'success-snackbar' : 'error-snackbar' });
      },
      error: (e) => { this.testandoAvulso.set(false); this.erroWorker(e); },
    });
  }

  /**
   * Captura via Distribuição DF-e. Caminho canônico: Function + A1 do cofre
   * (loop de NSU e escrituração no FiscalService). Com um A1 avulso fornecido
   * no painel, a consulta vai pelo worker fiscal_sefaz (exibição apenas).
   */
  sincronizar(): void {
    if (!this.empresaId() || this.sincronizando()) return;
    if (this.certFile && this.certSenha()) { this.sincronizarPeloWorker(); return; }
    this.sincronizando.set(true);
    this.fiscal.baixarNotasDistribuicao(this.ambiente()).subscribe(ret => {
      this.sincronizando.set(false);
      this.aplicarResultado(ret);
    });
  }

  private sincronizarPeloWorker(): void {
    const cnpj = (this.empresa()?.cnpj || '').replace(/\D/g, '');
    const uf = (this.empresa()?.uf || this.empresa()?.estado || '').toUpperCase();
    if (!cnpj) { this.snack.open('A empresa selecionada não tem CNPJ cadastrado.', 'Fechar', { duration: 5000, panelClass: 'error-snackbar' }); return; }
    if (!uf) { this.snack.open('Informe a UF no cadastro da empresa.', 'Fechar', { duration: 5000, panelClass: 'warning-snackbar' }); return; }
    this.sincronizando.set(true);
    this.sefaz.sincronizar({
      pfx: this.certFile!, senha: this.certSenha(), cnpj, uf,
      ambiente: this.ambiente(), ultNsu: this.ultNsuWorker(), cnpjEmpresa: cnpj,
    }).subscribe({
      next: (res) => { this.sincronizando.set(false); this.aplicarResultadoWorker(res); },
      error: (e) => { this.sincronizando.set(false); this.erroWorker(e); },
    });
  }

  private aplicarResultadoWorker(res: ResultadoSync): void {
    // Espelha no painel "última sincronização" com o shape do fluxo do cofre
    // (0 escrituradas é fiel: o worker só consulta, não escritura).
    this.lastResumo.set({ ok: res.ok, erro: res.erro, totalDocs: res.documentos?.length ?? 0, ultNSU: res.ult_nsu, maxNSU: res.max_nsu });
    if (!res.ok) {
      this.snack.open(res.erro || 'Falha na sincronização.', 'Fechar', { duration: 6000, panelClass: 'error-snackbar' });
      return;
    }
    this.notas.set((res.documentos ?? []).map(mapearDocumentoWorker));
    if (res.ult_nsu) this.ultNsuWorker.set(res.ult_nsu);
    this.historico.update(h => [{
      id: `${h.length + 1}-${res.ult_nsu ?? ''}`,
      quando: new Date().toLocaleString('pt-BR'),
      ultNsu: res.ult_nsu ?? '—',
      maxNsu: res.max_nsu ?? '—',
      docs: res.documentos?.length ?? 0,
      motivo: resumoSyncWorker(res),
    }, ...h]);
    this.snack.open(resumoSyncWorker(res), 'Fechar',
      { duration: 6000, panelClass: res.consumo_indevido ? 'warning-snackbar' : 'info-snackbar' });
  }

  private erroWorker(e: any): void {
    const detalhe = e?.error?.erro || e?.error?.detalhe;
    if (detalhe) {
      this.snack.open(detalhe, 'Fechar', { duration: 8000, panelClass: 'error-snackbar' });
      return;
    }
    this.snack.open(
      `Worker SEFAZ não respondeu em ${this.workerBase}. No Render (plano free) a primeira chamada pode levar ~50 s (hibernação) — tente de novo; se for local, verifique se o serviço está rodando.`,
      'Fechar', { duration: 10000, panelClass: 'error-snackbar' });
  }

  private aplicarResultado(ret: RetornoDistribuicao): void {
    this.lastResumo.set(ret);
    if (!ret.ok) {
      this.snack.open(ret.erro || 'Falha na sincronização.', 'Fechar', { duration: 6000, panelClass: 'error-snackbar' });
      return;
    }
    this.notas.set(montarLinhas(ret));
    // registra no histórico local desta sessão
    this.historico.update(h => [{
      id: `${h.length + 1}-${ret.ultNSU ?? ''}`,
      quando: new Date().toLocaleString('pt-BR'),
      ultNsu: ret.ultNSU ?? '—',
      maxNsu: ret.maxNSU ?? '—',
      docs: ret.totalDocs ?? 0,
      motivo: resumoSync(ret),
    }, ...h]);
    this.snack.open(resumoSync(ret), 'Fechar', { duration: 6000, panelClass: 'info-snackbar' });
  }

  // ── Status do certificado (vocabulário da tela de Certificados) ────────────
  certLabel(): string {
    const c = this.certificado();
    if (!c) return 'Não configurado';
    switch (c.status) {
      case 'ATIVO': return 'Válido';
      case 'PROXIMO_VENCIMENTO': return 'Vencendo';
      case 'EXPIRADO': return 'Vencido';
      case 'REVOGADO': return 'Revogado';
      default: return c.status || 'Desconhecido';
    }
  }
  certBadge(): Record<string, boolean> {
    const s = this.certificado()?.status;
    return { 'badge--success': s === 'ATIVO', 'badge--warning': s === 'PROXIMO_VENCIMENTO', 'badge--error': s === 'EXPIRADO', 'badge--neutral': !s || s === 'REVOGADO' };
  }
  certIconClass(): string {
    const s = this.certificado()?.status;
    if (s === 'ATIVO') return 'stat-icon--success';
    if (s === 'PROXIMO_VENCIMENTO') return 'stat-icon--warning';
    if (s === 'EXPIRADO') return 'stat-icon--error';
    return 'stat-icon--neutral';
  }
  diasRestantes(): number | null {
    const d = this.certificado()?.metadados?.diasParaVencer;
    return typeof d === 'number' ? d : null;
  }

  ultimaSync(): string {
    const r = this.lastResumo();
    if (!r) return 'Ainda não sincronizado nesta sessão.';
    if (!r.ok) return r.erro || 'Falha na sincronização.';
    return `${resumoSync(r)} · últ.NSU ${r.ultNSU ?? '—'} / max ${r.maxNSU ?? '—'}`;
  }
  statusSync(): string {
    const r = this.lastResumo();
    if (!r) return 'Aguardando';
    return r.ok ? 'Concluída' : 'Falhou';
  }
  statusSyncBadge(): Record<string, boolean> {
    const s = this.statusSync();
    return { 'badge--neutral': s === 'Aguardando', 'badge--error': s === 'Falhou', 'badge--success': s === 'Concluída' };
  }

  importarManualmente(): void {
    this.snack.open('A importação manual de XML/ZIP será processada pelo backend de persistência. Nesta versão, use Sincronizar agora para a consulta real à SEFAZ.', 'Fechar', { duration: 6000, panelClass: 'info-snackbar' });
  }

  atualizarLista(): void {
    const id = this.empresaId();
    if (id) this.carregarContexto(id);
  }

  formatCnpj(cnpj?: string): string {
    const d = (cnpj || '').replace(/\D/g, '');
    if (d.length !== 14) return cnpj || '—';
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  }
}
