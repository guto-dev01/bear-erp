import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { FiscalService, RetornoSefaz, RetornoDistribuicao } from '../fiscal.service';
import { importarNfeXml, NotaImportada } from '../engine/importador-xml-nfe';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'bear-nfe',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatPaginatorModule, MatSnackBarModule, MatTooltipModule, MatDialogModule,
  ],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">NF-e - Nota Fiscal Eletrônica</h1>
          <p class="page-header__subtitle">Gerencie suas notas fiscais eletrônicas de produtos</p>
        </div>
        <div class="page-header__actions" style="display:flex; gap:.5rem; align-items:center;">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:160px;">
            <mat-label>Ambiente SEFAZ</mat-label>
            <mat-select [value]="ambiente()" (selectionChange)="ambiente.set($event.value)">
              <mat-option value="homologacao">Homologação</mat-option>
              <mat-option value="producao">Produção</mat-option>
            </mat-select>
          </mat-form-field>
          <button class="bear-btn bear-btn--outline" (click)="consultarStatus()" [disabled]="transmitindo()"
                  matTooltip="Ping no serviço da SEFAZ — valida o A1 + mTLS sem emitir nota">
            <span class="material-symbols-rounded">wifi_tethering</span> Status SEFAZ
          </button>
          <button class="bear-btn bear-btn--outline" (click)="baixarDistribuicao()" [disabled]="baixando()"
                  matTooltip="Baixar NF-e de entrada na SEFAZ (Distribuição DF-e por NSU) — captura automática, como o FSist">
            <span class="material-symbols-rounded">cloud_download</span>
            {{ baixando() ? 'Baixando…' : 'Baixar da SEFAZ' }}
          </button>
          <button class="bear-btn bear-btn--outline" (click)="xmlInput.click()"
                  matTooltip="Importar XML de NF-e (mod. 55) para escrituração de entradas/saídas">
            <span class="material-symbols-rounded">upload_file</span> Importar XML
          </button>
          <input #xmlInput type="file" accept=".xml,text/xml,application/xml" multiple hidden
                 (change)="onXmlSelected($event)">
          <button class="bear-btn bear-btn--primary" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded">add</span> Nova NF-e
          </button>
        </div>
      </div>

      <!-- Resultado da última operação SEFAZ (status / autorização) -->
      @if (sefazResultado(); as r) {
        <div class="bear-card" style="margin-bottom:1rem;"
             [style.border-left]="(resultadoOk(r) ? '4px solid #34C759' : '4px solid #FF3B30')">
          <div class="flex items-start gap-3 p-4">
            <span class="material-symbols-rounded" [style.color]="resultadoOk(r) ? '#34C759' : '#FF3B30'">
              {{ resultadoOk(r) ? 'check_circle' : 'error' }}
            </span>
            <div class="flex-1">
              <p class="text-heading">{{ tituloResultado(r) }}</p>
              <p class="text-label">{{ detalheResultado(r) }}</p>
            </div>
            <button class="bear-btn bear-btn--ghost" (click)="sefazResultado.set(null)" matTooltip="Fechar">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>
      }

      <!-- Resumos de NF-e destinadas (Distribuição DF-e) — pendentes de manifestação -->
      @if (resumosPendentes().length) {
        <div class="bear-card" style="margin-bottom:1rem;">
          <div class="p-4">
            <div class="flex items-start justify-between" style="margin-bottom:.75rem; gap:1rem;">
              <div>
                <h3 class="text-heading">NF-e destinadas ao CNPJ — {{ resumosPendentes().length }} resumo(s)</h3>
                <p class="text-label">Baixadas da SEFAZ (Distribuição DF-e). Dê <strong>Ciência</strong> para liberar o download do XML completo; depois clique em “Baixar da SEFAZ” de novo.</p>
              </div>
              <button class="bear-btn bear-btn--ghost bear-btn--icon" (click)="resumosPendentes.set([])" matTooltip="Fechar">
                <span class="material-symbols-rounded">close</span>
              </button>
            </div>
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th class="text-label" style="text-align:left;padding:.5rem;">Emitente</th>
                  <th class="text-label" style="text-align:left;padding:.5rem;">Chave de acesso</th>
                  <th class="text-label" style="text-align:right;padding:.5rem;">Valor</th>
                  <th class="text-label" style="text-align:center;padding:.5rem;">Manifestação</th>
                </tr>
              </thead>
              <tbody>
                @for (r of resumosPendentes(); track r.chaveAcesso) {
                  <tr style="border-top:1px solid var(--separator);">
                    <td style="padding:.5rem;">{{ r.emitenteNome }}<br><span class="text-label">{{ r.emitenteCnpj }}</span></td>
                    <td style="padding:.5rem;"><code style="font-size:.7rem;">{{ r.chaveAcesso }}</code></td>
                    <td style="padding:.5rem;text-align:right;" class="tabular">{{ r.valorTotal | currency:'BRL' }}</td>
                    <td style="padding:.5rem;text-align:center; white-space:nowrap;">
                      <button class="bear-btn bear-btn--outline" (click)="manifestar(r, '210210')"
                              [disabled]="manifestandoChave() === r.chaveAcesso" matTooltip="Ciência da Operação (210210) — libera o XML completo">
                        {{ manifestandoChave() === r.chaveAcesso ? '…' : 'Ciência' }}
                      </button>
                      <button class="bear-btn bear-btn--ghost" (click)="manifestar(r, '210200')"
                              [disabled]="manifestandoChave() === r.chaveAcesso" matTooltip="Confirmação da Operação (210200)">Confirmar</button>
                      <button class="bear-btn bear-btn--ghost" (click)="manifestar(r, '210220')"
                              [disabled]="manifestandoChave() === r.chaveAcesso" matTooltip="Desconhecimento da Operação (210220)">Desconhecer</button>
                      <button class="bear-btn bear-btn--ghost" (click)="manifestar(r, '210240')"
                              [disabled]="manifestandoChave() === r.chaveAcesso" matTooltip="Operação não Realizada (210240) — exige justificativa">Não realizada</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Pré-visualização do XML gerado no navegador (não assinado) -->
      @if (preview(); as p) {
        <div class="bear-card" style="margin-bottom:1rem;">
          <div class="p-4">
            <div class="flex items-center justify-between" style="margin-bottom:.5rem;">
              <h3 class="text-heading">XML da NF-e #{{ p.numero }} — gerado no navegador (não assinado)</h3>
              <button class="bear-btn bear-btn--ghost" (click)="preview.set(null)" matTooltip="Fechar">
                <span class="material-symbols-rounded">close</span>
              </button>
            </div>
            <p class="text-label" style="margin-bottom:.5rem;">
              Chave de acesso (44 dígitos): <code>{{ p.chave }}</code>
            </p>
            <pre style="max-height:340px; overflow:auto; background:var(--surface-2,#f5f5f7); padding:.75rem; border-radius:8px; font-size:.72rem; white-space:pre-wrap; word-break:break-all; margin:0;">{{ p.xml }}</pre>
            <p class="text-label" style="margin-top:.5rem; opacity:.7;">
              Assinatura A1 e transmissão são server-side (Function <code>nfe-transmissao</code>). Use “Autorizar” na linha para enviar à SEFAZ.
            </p>
          </div>
        </div>
      }

      <!-- Importação de XML de NF-e (parser local → escrituração) -->
      @if (importPreview().length || importErrors().length) {
        <div class="bear-card" style="margin-bottom:1rem;">
          <div class="p-4">
            <div class="flex items-start justify-between" style="margin-bottom:.75rem; gap:1rem;">
              <div>
                <h3 class="text-heading">Importar XML — {{ importPreview().length }} nota(s) lida(s)</h3>
                <p class="text-label">Revise e confirme a escrituração. XML de terceiros normalmente é entrada (compra).</p>
              </div>
              <button class="bear-btn bear-btn--ghost bear-btn--icon" (click)="cancelarImportacao()" matTooltip="Fechar">
                <span class="material-symbols-rounded">close</span>
              </button>
            </div>

            @if (importErrors().length) {
              <span class="badge badge--error" style="margin-bottom:.75rem;">
                <span class="material-symbols-rounded" style="font-size:1rem;">warning</span>
                {{ importErrors().length }} arquivo(s) ignorado(s): {{ importErrors().join(', ') }}
              </span>
            }

            @if (importPreview().length) {
              <div class="flex items-center gap-3" style="margin-bottom:.75rem;">
                <span class="text-label">Registrar como</span>
                <div class="ios-segmented">
                  <button type="button" class="ios-segmented__item" [class.ios-segmented__item--active]="importTipo()==='ENTRADA'" (click)="importTipo.set('ENTRADA')">Entrada</button>
                  <button type="button" class="ios-segmented__item" [class.ios-segmented__item--active]="importTipo()==='SAIDA'" (click)="importTipo.set('SAIDA')">Saída</button>
                </div>
              </div>

              <div class="table-scroll">
                <table class="w-full" style="border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th class="text-label" style="text-align:left;padding:.5rem;">Número</th>
                      <th class="text-label" style="text-align:left;padding:.5rem;">Emitente</th>
                      <th class="text-label" style="text-align:left;padding:.5rem;">Chave de acesso</th>
                      <th class="text-label" style="text-align:right;padding:.5rem;">Itens</th>
                      <th class="text-label" style="text-align:right;padding:.5rem;">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (n of importPreview(); track n.chaveAcesso) {
                      <tr style="border-top:1px solid var(--separator);">
                        <td style="padding:.5rem;">{{ n.numero }}<span class="text-label">/{{ n.serie }}</span></td>
                        <td style="padding:.5rem;">{{ n.emitenteNome }}<br><span class="text-label">{{ n.emitenteCnpj }}</span></td>
                        <td style="padding:.5rem;"><code style="font-size:.7rem;">{{ n.chaveAcesso }}</code></td>
                        <td style="padding:.5rem;text-align:right;" class="tabular">{{ n.itens.length }}</td>
                        <td style="padding:.5rem;text-align:right;" class="tabular">{{ n.valorTotal | currency:'BRL' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end gap-2" style="margin-top:1rem;">
                <button class="bear-btn bear-btn--outline" (click)="cancelarImportacao()" [disabled]="importing()">Cancelar</button>
                <button class="bear-btn bear-btn--primary" (click)="confirmarImportacao()" [disabled]="importing()">
                  <span class="material-symbols-rounded">save</span>
                  {{ importing() ? 'Importando…' : 'Importar ' + importPreview().length + ' nota(s)' }}
                </button>
              </div>
            }
          </div>
        </div>
      }

      @if (loading() || transmitindo()) {
        <div class="flex justify-center p-8">
          <div class="bear-spinner bear-spinner--xl"></div>
        </div>
      }

      @if (!showForm()) {
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: var(--brand-primary-light, #DAD9F6);">
                <span class="material-symbols-rounded" style="color: var(--brand-primary);">description</span>
              </div>
              <div>
                <p class="text-label">Total NF-es</p>
                <p class="text-heading">{{ totalElements() }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="stat-icon stat-icon--success">
                <span class="material-symbols-rounded">check_circle</span>
              </div>
              <div>
                <p class="text-label">Autorizadas</p>
                <p class="text-heading">{{ countByStatus('AUTORIZADA') }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="stat-icon stat-icon--neutral">
                <span class="material-symbols-rounded">edit_note</span>
              </div>
              <div>
                <p class="text-label">Rascunhos</p>
                <p class="text-heading">{{ countByStatus('RASCUNHO') }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="stat-icon stat-icon--error">
                <span class="material-symbols-rounded">cancel</span>
              </div>
              <div>
                <p class="text-label">Canceladas</p>
                <p class="text-heading">{{ countByStatus('CANCELADA') }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bear-card">
          <table mat-table [dataSource]="nfes()" class="w-full">
            <ng-container matColumnDef="numero">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Número</th>
              <td mat-cell *matCellDef="let nfe">{{ nfe.numero }}</td>
            </ng-container>
            <ng-container matColumnDef="destinatario">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Destinatário</th>
              <td mat-cell *matCellDef="let nfe">{{ nfe.destinatarioRazaoSocial || nfe.destinatarioCnpjCpf }}</td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Valor Total</th>
              <td mat-cell *matCellDef="let nfe">{{ nfe.totalNfe | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Status</th>
              <td mat-cell *matCellDef="let nfe">
                <span class="badge" [ngClass]="getStatusBadge(nfe.status)">
                  <span class="badge__dot"></span>
                  {{ nfe.status }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="!font-bold w-32">Ações</th>
              <td mat-cell *matCellDef="let nfe">
                <div class="flex gap-1">
                  @if (nfe.status === 'RASCUNHO') {
                    <button class="bear-btn bear-btn--ghost" (click)="autorizar(nfe)" [disabled]="transmitindo()" matTooltip="Transmitir à SEFAZ">
                      <span class="material-symbols-rounded" style="font-size:18px;">send</span>
                    </button>
                  }
                  @if (nfe.status === 'AUTORIZADA') {
                    <button class="bear-btn bear-btn--ghost" (click)="cancelar(nfe)" matTooltip="Cancelar" style="color: var(--status-error, #FF3B30);">
                      <span class="material-symbols-rounded" style="font-size:18px;">cancel</span>
                    </button>
                  }
                  <button class="bear-btn bear-btn--ghost" (click)="verXml(nfe)" matTooltip="Ver XML / chave">
                    <span class="material-symbols-rounded" style="font-size:18px;">visibility</span>
                  </button>
                  <button class="bear-btn bear-btn--ghost" (click)="baixarXml(nfe)" matTooltip="Baixar XML">
                    <span class="material-symbols-rounded" style="font-size:18px;">code</span>
                  </button>
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-gray-50 cursor-pointer"></tr>
          </table>
          @if (!loading() && nfes().length === 0) {
            <div class="empty-state">
              <span class="material-symbols-rounded empty-state__icon">description</span>
              <p class="empty-state__title">Nenhuma NF-e cadastrada</p>
              <p class="empty-state__description">Clique em "Nova NF-e" para emitir sua primeira nota fiscal eletrônica.</p>
            </div>
          }
          <mat-paginator [length]="totalElements()" [pageSize]="20" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card">
          <div class="p-6">
            <h2 class="text-heading" style="margin-bottom: 1rem;">Nova NF-e</h2>
            <form [formGroup]="nfeForm" (ngSubmit)="salvar()">
              <h3 class="text-label" style="font-size: 1rem; margin-bottom: 0.75rem;">Destinatário</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4" formGroupName="destinatario">
                <mat-form-field appearance="outline">
                  <mat-label>CNPJ/CPF</mat-label>
                  <input matInput formControlName="cnpjCpf">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Razão Social</mat-label>
                  <input matInput formControlName="razaoSocial">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>IE</mat-label>
                  <input matInput formControlName="inscricaoEstadual">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>UF</mat-label>
                  <input matInput formControlName="uf" maxlength="2">
                </mat-form-field>
              </div>

              <h3 class="text-label" style="font-size: 1rem; margin-bottom: 0.75rem; margin-top: 1rem;">Dados da NF-e</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <mat-form-field appearance="outline">
                  <mat-label>Tipo</mat-label>
                  <mat-select formControlName="tipo">
                    <mat-option value="SAIDA">Saída</mat-option>
                    <mat-option value="ENTRADA">Entrada</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Natureza da Operação</mat-label>
                  <input matInput formControlName="naturezaOperacao">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Finalidade</mat-label>
                  <mat-select formControlName="finalidade">
                    <mat-option value="NORMAL">Normal</mat-option>
                    <mat-option value="COMPLEMENTAR">Complementar</mat-option>
                    <mat-option value="AJUSTE">Ajuste</mat-option>
                    <mat-option value="DEVOLUCAO">Devolução</mat-option>
                  </mat-select>
                </mat-form-field>
                <label class="flex items-center gap-2" style="font-size: 0.875rem;">
                  <input type="checkbox" formControlName="consumidorFinal"> Consumidor final (dispara DIFAL em venda interestadual)
                </label>
              </div>

              <h3 class="text-label" style="font-size: 1rem; margin-bottom: 0.75rem; margin-top: 1rem;">Itens</h3>
              <div formArrayName="itens">
                @for (item of itensArray.controls; track $index) {
                  <div class="border rounded p-3 mb-2" [formGroupName]="$index">
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <mat-form-field appearance="outline" class="col-span-2">
                        <mat-label>Descrição</mat-label>
                        <input matInput formControlName="descricao">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>NCM</mat-label>
                        <input matInput formControlName="ncm">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>CFOP</mat-label>
                        <input matInput formControlName="cfop">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Qtd</mat-label>
                        <input matInput formControlName="quantidade" type="number">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Valor Unit.</mat-label>
                        <input matInput formControlName="valorUnitario" type="number">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>CST ICMS</mat-label>
                        <input matInput formControlName="cstIcms">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Alíq. ICMS (%)</mat-label>
                        <input matInput formControlName="aliquotaIcms" type="number">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Alíq. Interna Dest. (%)</mat-label>
                        <input matInput formControlName="aliqInternaDestino" type="number">
                      </mat-form-field>
                      <div class="flex items-center">
                        <button class="bear-btn bear-btn--ghost" type="button" (click)="removeItem($index)" style="color: var(--status-error, #FF3B30);">
                          <span class="material-symbols-rounded">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
              <button class="bear-btn bear-btn--outline" type="button" (click)="addItem()" style="margin-bottom: 1rem;">
                <span class="material-symbols-rounded">add</span> Adicionar Item
              </button>

              <div class="flex gap-2 mt-4">
                <button class="bear-btn bear-btn--primary flex-1" type="submit" [disabled]="nfeForm.invalid">Salvar Rascunho</button>
                <button class="bear-btn bear-btn--outline flex-1" type="button" (click)="showForm.set(false)">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class NfeComponent implements OnInit {
  loading = signal(false);
  showForm = signal(false);
  nfes = signal<any[]>([]);
  totalElements = signal(0);
  displayedColumns = ['numero', 'destinatario', 'valor', 'status', 'acoes'];
  nfeForm: FormGroup;

  // ── Transmissão SEFAZ (Appwrite Function nfe-transmissao) ─────
  ambiente = signal<'homologacao' | 'producao'>('homologacao');
  transmitindo = signal(false);
  sefazResultado = signal<RetornoSefaz | null>(null);
  preview = signal<{ numero: unknown; chave: string; xml: string } | null>(null);

  // Importação de XML de NF-e
  importPreview = signal<NotaImportada[]>([]);
  importErrors = signal<string[]>([]);
  importTipo = signal<'ENTRADA' | 'SAIDA'>('ENTRADA');
  importing = signal(false);

  // Captura por Distribuição DF-e (entrada automática) + manifestação
  baixando = signal(false);
  resumosPendentes = signal<NotaImportada[]>([]);
  manifestandoChave = signal<string>('');

  constructor(private fb: FormBuilder, private fiscalService: FiscalService, private snackBar: MatSnackBar) {
    this.nfeForm = this.fb.group({
      tipo: ['SAIDA', Validators.required],
      naturezaOperacao: ['Venda de Mercadorias', Validators.required],
      finalidade: ['NORMAL', Validators.required],
      consumidorFinal: [false],
      destinatario: this.fb.group({
        cnpjCpf: ['', Validators.required],
        razaoSocial: ['', Validators.required],
        inscricaoEstadual: [''],
        uf: ['', Validators.required],
      }),
      itens: this.fb.array([]),
    });
  }

  get itensArray() { return this.nfeForm.get('itens') as FormArray; }

  ngOnInit() { this.loadNfes(); }

  // ─── Importação de XML de NF-e ───────────────────────────────
  /** Lê os XMLs escolhidos, faz o parse local e monta a pré-visualização. */
  async onXmlSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; // permite reselecionar o mesmo arquivo depois
    if (!files.length) return;

    const notas: NotaImportada[] = [];
    const erros: string[] = [];
    for (const file of files) {
      try {
        notas.push(importarNfeXml(await file.text()));
      } catch {
        erros.push(file.name);
      }
    }
    this.importErrors.set(erros);
    this.importPreview.set(notas);
    if (!notas.length && erros.length) {
      this.snackBar.open('Nenhum XML de NF-e válido encontrado.', 'Fechar', { duration: 4000 });
    }
  }

  /** Escritura as notas lidas (cabeçalho + itens) no tipo escolhido. */
  confirmarImportacao(): void {
    const notas = this.importPreview();
    if (!notas.length || this.importing()) return;
    const tipo = this.importTipo();
    this.importing.set(true);
    forkJoin(notas.map(n => this.fiscalService.escriturarNotaImportada(n, tipo))).subscribe({
      next: () => {
        this.importing.set(false);
        this.snackBar.open(
          `${notas.length} nota(s) importada(s) como ${tipo === 'ENTRADA' ? 'entrada' : 'saída'}.`,
          'OK', { duration: 4000 });
        this.cancelarImportacao();
        this.loadNfes();
      },
      error: err => {
        this.importing.set(false);
        this.snackBar.open(err?.message || err?.error?.message || 'Erro ao importar notas.', 'Fechar', { duration: 5000 });
      },
    });
  }

  cancelarImportacao(): void {
    this.importPreview.set([]);
    this.importErrors.set([]);
    this.importTipo.set('ENTRADA');
  }

  // ─── Captura por Distribuição DF-e (entrada automática, estilo FSist) ────────
  /**
   * Baixa na SEFAZ as NF-e destinadas ao CNPJ (Distribuição DF-e). O loop de NSU
   * roda na Function; as notas completas já são escrituradas como entrada e os
   * resumos ficam listados para manifestação (Ciência libera o XML completo).
   */
  baixarDistribuicao(): void {
    if (this.baixando()) return;
    this.baixando.set(true);
    this.fiscalService.baixarNotasDistribuicao(this.ambiente()).subscribe({
      next: (r: RetornoDistribuicao) => {
        this.baixando.set(false);
        if (!r.ok) {
          this.snackBar.open(r.erro || 'Falha na Distribuição DF-e.', 'Fechar', { duration: 6000 });
          return;
        }
        this.resumosPendentes.set(r.resumos ?? []);
        const dup = r.duplicadas ? ` (${r.duplicadas} já existia(m))` : '';
        const msg = `${r.escrituradas ?? 0} NF-e escriturada(s)${dup}; ${r.resumos?.length ?? 0} resumo(s) para manifestar.`;
        this.snackBar.open(msg, 'OK', { duration: 5000 });
        if (r.escrituradas) this.loadNfes();
      },
      error: err => {
        this.baixando.set(false);
        this.snackBar.open(err?.message || 'Erro ao baixar da SEFAZ.', 'Fechar', { duration: 6000 });
      },
    });
  }

  /** Manifestação do Destinatário sobre um resumo (por padrão, Ciência 210210). */
  manifestar(nota: NotaImportada, tpEvento: '210200' | '210210' | '210220' | '210240' = '210210'): void {
    if (this.manifestandoChave()) return;
    let xJust = '';
    if (tpEvento === '210240') {
      xJust = (prompt('Justificativa da Operação não Realizada (15 a 255 caracteres):') || '').trim();
      if (xJust.length < 15) { this.snackBar.open('Justificativa muito curta.', 'Fechar', { duration: 4000 }); return; }
    }
    this.manifestandoChave.set(nota.chaveAcesso);
    this.fiscalService.manifestarNota(nota.chaveAcesso, tpEvento, xJust, this.ambiente()).subscribe({
      next: (r: RetornoSefaz) => {
        this.manifestandoChave.set('');
        if (r.ok && (r as { registrado?: boolean }).registrado !== false && (r.cStat === 135 || r.cStat === 136 || r.cStat === 573)) {
          this.snackBar.open(`Manifestação registrada (cStat ${r.cStat}).`, 'OK', { duration: 4000 });
          this.resumosPendentes.update(list => list.filter(n => n.chaveAcesso !== nota.chaveAcesso));
        } else {
          this.snackBar.open(r.erro || r.xMotivo || 'Manifestação não registrada.', 'Fechar', { duration: 6000 });
        }
      },
      error: err => {
        this.manifestandoChave.set('');
        this.snackBar.open(err?.message || 'Erro ao manifestar.', 'Fechar', { duration: 6000 });
      },
    });
  }

  loadNfes(page = 0) {
    this.loading.set(true);
    this.fiscalService.listNfes(page).subscribe({
      next: data => {
        this.nfes.set(data.content || []);
        this.totalElements.set(data.totalElements || 0);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.snackBar.open('Erro ao carregar NF-es', 'Fechar', { duration: 3000 }); }
    });
  }

  addItem() {
    this.itensArray.push(this.fb.group({
      descricao: ['', Validators.required], ncm: [''], cfop: ['5102', Validators.required],
      quantidade: [1, [Validators.required, Validators.min(1)]],
      valorUnitario: [0, [Validators.required, Validators.min(0.01)]],
      cstIcms: ['00'], aliquotaIcms: [18], aliqInternaDestino: [null],
    }));
  }

  removeItem(i: number) { this.itensArray.removeAt(i); }

  salvar() {
    // Roda o motor tributário (ICMS/ST/IPI/PIS/COFINS + IBS/CBS) em vez de persistir
    // tributos por heurística. Ver fiscal.service.emitirNfeDoForm (P0.2).
    this.fiscalService.emitirNfeDoForm(this.nfeForm.value).subscribe({
      next: () => { this.snackBar.open('NF-e criada!', 'OK', { duration: 3000 }); this.showForm.set(false); this.loadNfes(); },
      error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
    });
  }

  autorizar(nfe: any) {
    if (!confirm(`Transmitir NF-e #${nfe.numero} à SEFAZ (${this.ambiente()})?`)) return;
    this.transmitindo.set(true);
    this.sefazResultado.set(null);
    this.fiscalService.transmitirNfe(nfe.id, this.ambiente()).subscribe({
      next: r => {
        this.transmitindo.set(false);
        this.sefazResultado.set(r);
        if (r.ok && r.situacao === 'AUTORIZADA') {
          this.snackBar.open(`NF-e autorizada! Protocolo ${r.nProt}`, 'OK', { duration: 5000 });
          this.loadNfes();
        } else {
          this.snackBar.open(r.erro || r.xMotivo || 'NF-e não autorizada — veja os detalhes acima.', 'Fechar', { duration: 6000 });
        }
      },
      error: () => {
        this.transmitindo.set(false);
        this.sefazResultado.set({ ok: false, erro: 'Falha inesperada ao transmitir à SEFAZ.' });
      },
    });
  }

  consultarStatus() {
    this.transmitindo.set(true);
    this.sefazResultado.set(null);
    this.fiscalService.consultarStatusSefaz(this.ambiente()).subscribe({
      next: r => { this.transmitindo.set(false); this.sefazResultado.set(r); },
      error: () => { this.transmitindo.set(false); this.sefazResultado.set({ ok: false, erro: 'Falha inesperada ao consultar a SEFAZ.' }); },
    });
  }

  verXml(nfe: any) {
    this.fiscalService.gerarXmlNotaFiscal(nfe.id).subscribe({
      next: ({ chave, xml }) => this.preview.set({ numero: nfe.numero, chave, xml }),
      error: err => this.snackBar.open(err.error?.message || 'Erro ao gerar XML', 'Fechar', { duration: 5000 }),
    });
  }

  resultadoOk(r: RetornoSefaz): boolean {
    return !!r.ok && (r.situacao === 'AUTORIZADA' || r.online === true);
  }

  tituloResultado(r: RetornoSefaz): string {
    if (!r.ok) return 'Falha na comunicação com a SEFAZ';
    if (r.online !== undefined) return r.online ? 'Serviço da SEFAZ em operação' : 'Serviço da SEFAZ indisponível';
    switch (r.situacao) {
      case 'AUTORIZADA': return 'NF-e autorizada';
      case 'DENEGADA': return 'NF-e denegada';
      case 'REJEITADA': return 'NF-e rejeitada';
      case 'PROCESSANDO': return 'Lote em processamento';
      default: return 'Retorno da SEFAZ';
    }
  }

  detalheResultado(r: RetornoSefaz): string {
    if (!r.ok) return r.erro || 'Erro desconhecido.';
    const partes: string[] = [];
    if (r.cStat !== undefined) partes.push(`cStat ${r.cStat}`);
    if (r.xMotivo) partes.push(r.xMotivo);
    if (r.nProt) partes.push(`Protocolo ${r.nProt}`);
    return partes.join(' · ') || 'Sem detalhes.';
  }

  cancelar(nfe: any) {
    if (confirm(`Cancelar NF-e #${nfe.numero}?`)) {
      // TODO(appwrite): integração externa — cancelamento na SEFAZ não disponível nesta versão.
      this.fiscalService.cancelarNfe(nfe.id).subscribe({
        next: () => { this.snackBar.open('Cancelamento da NF-e requer integração externa (não disponível nesta versão Appwrite)', 'Fechar', { duration: 5000 }); this.loadNfes(); },
        error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
      });
    }
  }

  baixarXml(nfe: any) {
    // Gera o XML (não assinado) localmente. A assinatura A1 + transmissão à SEFAZ
    // exigem integração externa (Appwrite Function com o A1 do cofre).
    this.fiscalService.gerarXmlNotaFiscal(nfe.id).subscribe({
      next: ({ chave, xml }) => {
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NFe-${chave}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        this.snackBar.open('XML gerado (não assinado). A assinatura A1 + envio à SEFAZ exigem integração externa.', 'Fechar', { duration: 5000 });
      },
      error: err => this.snackBar.open(err.error?.message || 'Erro ao gerar XML', 'Fechar', { duration: 5000 })
    });
  }

  onPage(event: PageEvent) { this.loadNfes(event.pageIndex); }

  resetForm() { this.nfeForm.reset({ tipo: 'SAIDA', naturezaOperacao: 'Venda de Mercadorias', finalidade: 'NORMAL' }); this.itensArray.clear(); this.addItem(); }

  countByStatus(status: string): number {
    return this.nfes().filter(n => n.status === status).length;
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'AUTORIZADA': return 'badge--success';
      case 'CANCELADA': case 'REJEITADA': return 'badge--error';
      case 'DENEGADA': return 'badge--warning';
      default: return 'badge--neutral';
    }
  }
}
