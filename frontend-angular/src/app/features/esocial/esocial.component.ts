import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule, MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { switchMap } from 'rxjs/operators';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';
import {
  IND_RETIF, TP_ACID, TP_CAT, INICIAT_CAT, SIM_NAO, TP_LOCAL, LATERALIDADE,
  IDE_OC, UFS, SIT_GERADORA, PARTE_CORPO, AGENTE_CAUSADOR, NATUREZA_LESAO, CID10,
} from './esocial-s2210-tabelas';

interface EventoEsocialDoc {
  $id: string;
  $createdAt: string;
  tipoEvento: string;
  competencia: string;
  funcionarioId?: string;
  funcionarioCpf?: string;
  funcionarioNome?: string;
  status: string;
  protocolo?: string;
  observacao?: string;
  empresaId: string;
  tenantId: string;
}

/** Documento de detalhe do S-2210 (collection `esocial_s2210`). */
interface S2210Doc {
  $id: string;
  eventoId: string;
  cpfTrab: string;
  matricula?: string;
  dtAcid: string;
  tpAcid?: string;
  hrAcid?: string;
  hrsTrabAntesAcid?: string;
  tpCat: number;
  indCatObito?: string;
  dtObito?: string;
  indComunPolicia: string;
  codSitGeradora: string;
  iniciatCAT: number;
  obsCAT?: string;
  ultDiaTrab?: string;
  houveAfast: string;
  localAcidenteJson: string;
  partesAtingidasJson: string;
  agentesCausadoresJson: string;
  atestadoJson?: string;
}

/** Modelo enriquecido usado pelo template (deriva grupo e protocoloEnvio). */
interface EventoEsocialView extends EventoEsocialDoc {
  id: string;
  grupoEvento: string;
  protocoloEnvio: string;
}

@Component({
  selector: 'bear-esocial',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, MatSnackBarModule, MatTabsModule],
  // Escopado a este componente: labels sempre no topo (consistência entre inputs
  // e selects) e sem espaço reservado de erro (form mais compacto). Erros saem
  // por snackbar.
  providers: [{ provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { subscriptSizing: 'dynamic', floatLabel: 'always' } }],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">eSocial</h1>
          <p class="page-header__subtitle">Gestão de eventos do eSocial</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="carregarPendentes()">
            <span class="material-symbols-rounded text-base mr-1.5">pending_actions</span>
            Pendentes
          </button>
          <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-base mr-1.5">add</span>
            Novo Evento
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      @if (!showForm()) {
        <div class="flex gap-4 mb-4 items-end">
          <mat-form-field appearance="outline" class="w-48">
            <mat-label>Filtrar por tipo</mat-label>
            <mat-select (selectionChange)="filtrarPorTipo($event.value)">
              <mat-option value="">Todos</mat-option>
              @for (g of gruposEventos; track g.grupo) {
                <mat-option disabled class="!font-bold !text-gray-600">{{ g.grupo }}</mat-option>
                @for (t of g.tipos; track t) {
                  <mat-option [value]="t">{{ t }}</mat-option>
                }
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-48">
            <mat-label>Competência</mat-label>
            <input matInput placeholder="YYYY-MM" (change)="filtrarPorCompetencia($event)">
          </mat-form-field>
        </div>

        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Eventos eSocial</h3>
            <span class="badge badge--info">{{ totalElements() }} total</span>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="eventos()" class="w-full">
              <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef class="text-label">Tipo</th><td mat-cell *matCellDef="let e">{{ e.tipoEvento }}</td></ng-container>
              <ng-container matColumnDef="grupo"><th mat-header-cell *matHeaderCellDef class="text-label">Grupo</th><td mat-cell *matCellDef="let e">{{ e.grupoEvento }}</td></ng-container>
              <ng-container matColumnDef="funcionario"><th mat-header-cell *matHeaderCellDef class="text-label">Funcionário</th><td mat-cell *matCellDef="let e">{{ e.funcionarioNome || e.funcionarioCpf || '-' }}</td></ng-container>
              <ng-container matColumnDef="competencia"><th mat-header-cell *matHeaderCellDef class="text-label">Competência</th><td mat-cell *matCellDef="let e">{{ e.competencia }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let e">
                  <span class="badge" [ngClass]="getStatusBadge(e.status)">
                    <span class="badge__dot"></span>
                    {{ e.status }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="protocolo"><th mat-header-cell *matHeaderCellDef class="text-label">Protocolo</th><td mat-cell *matCellDef="let e">{{ e.protocoloEnvio || '-' }}</td></ng-container>
              <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef class="text-label">Ações</th>
                <td mat-cell *matCellDef="let e">
                  <div class="flex gap-1">
                    @if (e.status === 'RASCUNHO') {
                      <button class="bear-btn bear-btn--ghost p-2" title="Validar" (click)="validar(e.id)">
                        <span class="material-symbols-rounded text-base" style="color: var(--brand-primary);">check_circle</span>
                      </button>
                    }
                    @if (e.status === 'VALIDADO') {
                      <button class="bear-btn bear-btn--ghost p-2" title="Enviar" (click)="enviar(e.id)">
                        <span class="material-symbols-rounded text-base" style="color: #34C759;">send</span>
                      </button>
                    }
                    @if (e.status === 'ENVIADO' || e.status === 'PROCESSANDO' || e.status === 'PROCESSADO') {
                      <button class="bear-btn bear-btn--ghost p-2" title="Consultar processamento" (click)="consultar(e.id)">
                        <span class="material-symbols-rounded text-base" style="color: var(--brand-primary);">sync</span>
                      </button>
                    }
                  </div>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
            @if (eventos().length === 0 && !loading()) {
              <div class="empty-state py-12">
                <span class="material-symbols-rounded text-5xl mb-3" style="color: var(--text-secondary);">event_note</span>
                <p class="empty-state__title text-sm" style="color: var(--text-secondary);">Nenhum evento encontrado</p>
              </div>
            }
          </div>
          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)"></mat-paginator>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-heading text-base">Novo Evento eSocial</h3>
            <button class="bear-btn bear-btn--ghost p-2" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline" class="col-span-2">
              <mat-label>Tipo Evento</mat-label>
              <mat-select formControlName="tipoEvento">
                @for (g of gruposEventos; track g.grupo) {
                  <mat-option disabled class="!font-bold !text-gray-600">{{ g.grupo }}</mat-option>
                  @for (t of g.tipos; track t) {
                    <mat-option [value]="t">{{ t }}</mat-option>
                  }
                }
              </mat-select>
            </mat-form-field>

            @if (!isCat()) {
              <mat-form-field appearance="outline"><mat-label>Funcionário ID</mat-label><input matInput formControlName="funcionarioId"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CPF Funcionário</mat-label><input matInput formControlName="funcionarioCpf"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nome Funcionário</mat-label><input matInput formControlName="funcionarioNome"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Competência (YYYY-MM)</mat-label><input matInput formControlName="competencia"></mat-form-field>
              <mat-form-field appearance="outline" class="col-span-2"><mat-label>Observação</mat-label><input matInput formControlName="observacao"></mat-form-field>
            }

            @if (isCat()) {
              <div class="col-span-2 grid grid-cols-2 gap-4" formGroupName="cat">
                <h4 class="col-span-2 text-heading text-sm mt-2">S-2210 — Comunicação de Acidente de Trabalho (CAT)</h4>
                <p class="col-span-2 text-xs" style="color: var(--text-secondary);">Ambiente de transmissão: <b>Homologação (produção restrita)</b>.</p>

                <mat-form-field appearance="outline">
                  <mat-label>Tipo (original/retificação)</mat-label>
                  <mat-select formControlName="indRetif">
                    @for (o of tab.indRetif; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Nº recibo (se retificação)</mat-label><input matInput formControlName="nrRecibo"></mat-form-field>

                <mat-form-field appearance="outline"><mat-label>CPF do acidentado</mat-label><input matInput formControlName="cpfTrab" placeholder="Somente números"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Matrícula</mat-label><input matInput formControlName="matricula"></mat-form-field>

                <mat-form-field appearance="outline"><mat-label>Data do acidente</mat-label><input matInput formControlName="dtAcid" placeholder="AAAA-MM-DD"></mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Tipo de acidente</mat-label>
                  <mat-select formControlName="tpAcid">
                    @for (o of tab.tpAcid; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Hora do acidente</mat-label><input matInput formControlName="hrAcid" placeholder="hhmm (ex.: 0830)"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Horas trabalhadas antes</mat-label><input matInput formControlName="hrsTrabAntesAcid" placeholder="hhmm (ex.: 0200)"></mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Tipo da CAT</mat-label>
                  <mat-select formControlName="tpCat">
                    @for (o of tab.tpCat; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Iniciativa da CAT</mat-label>
                  <mat-select formControlName="iniciatCAT">
                    @for (o of tab.iniciatCAT; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                  </mat-select>
                </mat-form-field>

                @if (form.get('cat.tpCat')?.value === '3') {
                  <mat-form-field appearance="outline">
                    <mat-label>Comunicação de óbito</mat-label>
                    <mat-select formControlName="indCatObito">
                      @for (o of tab.simNao; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Data do óbito</mat-label><input matInput formControlName="dtObito" placeholder="AAAA-MM-DD"></mat-form-field>
                }

                <mat-form-field appearance="outline">
                  <mat-label>Comunicada à polícia?</mat-label>
                  <mat-select formControlName="indComunPolicia">
                    @for (o of tab.simNao; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Situação geradora</mat-label>
                  <mat-select formControlName="codSitGeradora">
                    @for (o of tab.sitGeradora; track o.cod) { <mat-option [value]="o.cod">{{ o.cod }} — {{ o.desc }}</mat-option> }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline"><mat-label>Último dia trabalhado</mat-label><input matInput formControlName="ultDiaTrab" placeholder="AAAA-MM-DD"></mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Houve afastamento?</mat-label>
                  <mat-select formControlName="houveAfast">
                    @for (o of tab.simNao; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-2"><mat-label>Observações</mat-label><input matInput formControlName="obsCAT"></mat-form-field>

                <!-- Local do acidente -->
                <div class="col-span-2 grid grid-cols-2 gap-4 pt-4 mt-2" style="border-top: 1px solid var(--border-subtle);" formGroupName="local">
                  <h5 class="col-span-2 text-label">Local do acidente</h5>
                  <mat-form-field appearance="outline">
                    <mat-label>Tipo de local</mat-label>
                    <mat-select formControlName="tpLocal">
                      @for (o of tab.tpLocal; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Logradouro</mat-label><input matInput formControlName="dscLograd"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Bairro</mat-label><input matInput formControlName="bairro"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>CEP</mat-label><input matInput formControlName="cep"></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Código do município (IBGE)</mat-label><input matInput formControlName="codMunic" placeholder="3550308"></mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>UF</mat-label>
                    <mat-select formControlName="uf">
                      @for (u of tab.ufs; track u) { <mat-option [value]="u">{{ u }}</mat-option> }
                    </mat-select>
                  </mat-form-field>
                </div>

                <!-- Partes atingidas (1..N) -->
                <div class="col-span-2 pt-4 mt-2" style="border-top: 1px solid var(--border-subtle);" formArrayName="partes">
                  <div class="flex items-center justify-between">
                    <h5 class="text-label">Partes do corpo atingidas</h5>
                    <button type="button" class="bear-btn bear-btn--outline" style="padding:0.25rem 0.75rem; font-size:0.75rem;" (click)="adicionarParte()">+ parte</button>
                  </div>
                  @for (p of partes.controls; track $index) {
                    <div [formGroupName]="$index" class="grid grid-cols-2 gap-4 items-center">
                      <mat-form-field appearance="outline">
                        <mat-label>Parte atingida</mat-label>
                        <mat-select formControlName="codParteAting">
                          @for (o of tab.parteCorpo; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                        </mat-select>
                      </mat-form-field>
                      <div class="flex gap-2 items-center">
                        <mat-form-field appearance="outline" class="flex-1">
                          <mat-label>Lateralidade</mat-label>
                          <mat-select formControlName="lateralidade">
                            @for (o of tab.lateralidade; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                          </mat-select>
                        </mat-form-field>
                        <button type="button" class="bear-btn bear-btn--ghost p-2" (click)="removerParte($index)"><span class="material-symbols-rounded text-base" style="color:#FF3B30;">delete</span></button>
                      </div>
                    </div>
                  }
                </div>

                <!-- Agentes causadores (1..N) -->
                <div class="col-span-2 pt-4 mt-2" style="border-top: 1px solid var(--border-subtle);" formArrayName="agentes">
                  <div class="flex items-center justify-between">
                    <h5 class="text-label">Agentes causadores</h5>
                    <button type="button" class="bear-btn bear-btn--outline" style="padding:0.25rem 0.75rem; font-size:0.75rem;" (click)="adicionarAgente()">+ agente</button>
                  </div>
                  @for (a of agentes.controls; track $index) {
                    <div [formGroupName]="$index" class="grid grid-cols-2 gap-4 items-center">
                      <mat-form-field appearance="outline">
                        <mat-label>Agente causador</mat-label>
                        <mat-select formControlName="codAgntCausador">
                          @for (o of tab.agenteCausador; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                        </mat-select>
                      </mat-form-field>
                      <button type="button" class="bear-btn bear-btn--ghost p-2 justify-self-start" (click)="removerAgente($index)"><span class="material-symbols-rounded text-base" style="color:#FF3B30;">delete</span></button>
                    </div>
                  }
                </div>

                <!-- Atestado médico (0..1) -->
                <mat-form-field appearance="outline" class="col-span-2">
                  <mat-label>Possui atestado médico?</mat-label>
                  <mat-select formControlName="temAtestado">
                    <mat-option [value]="false">Não</mat-option>
                    <mat-option [value]="true">Sim</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (form.get('cat.temAtestado')?.value === true) {
                  <div class="col-span-2 grid grid-cols-2 gap-4" formGroupName="atestado">
                    <mat-form-field appearance="outline"><mat-label>Data do atendimento</mat-label><input matInput formControlName="dtAtendimento" placeholder="AAAA-MM-DD"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Hora do atendimento</mat-label><input matInput formControlName="hrAtendimento" placeholder="hhmm"></mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Houve internação?</mat-label>
                      <mat-select formControlName="indInternacao">
                        @for (o of tab.simNao; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Duração tratamento (dias)</mat-label><input matInput type="number" formControlName="durTrat"></mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Indica afastamento?</mat-label>
                      <mat-select formControlName="indAfast">
                        @for (o of tab.simNao; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Natureza da lesão</mat-label>
                      <mat-select formControlName="dscLesao">
                        @for (o of tab.naturezaLesao; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>CID-10</mat-label>
                      <mat-select formControlName="codCID">
                        @for (o of tab.cid10; track o.cod) { <mat-option [value]="o.cod">{{ o.cod }} — {{ o.desc }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Médico emitente (nome)</mat-label><input matInput formControlName="nmEmit"></mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Órgão de classe</mat-label>
                      <mat-select formControlName="ideOC">
                        @for (o of tab.ideOC; track o.cod) { <mat-option [value]="o.cod">{{ o.desc }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Nº do conselho</mat-label><input matInput formControlName="nrOC"></mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>UF do conselho</mat-label>
                      <mat-select formControlName="ufOC">
                        @for (u of tab.ufs; track u) { <mat-option [value]="u">{{ u }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                  </div>
                }
              </div>
            }

            <div class="col-span-2 flex gap-3 justify-end">
              <button class="bear-btn bear-btn--outline" type="button" (click)="showForm.set(false)">Cancelar</button>
              <button class="bear-btn bear-btn--primary" type="submit" [disabled]="form.invalid">Criar Evento</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class EsocialComponent implements OnInit {
  eventos = signal<EventoEsocialView[]>([]); loading = signal(false); showForm = signal(false); totalElements = signal(0);
  displayedColumns = ['tipo', 'grupo', 'funcionario', 'competencia', 'status', 'protocolo', 'acoes'];
  form!: FormGroup;
  private readonly COLLECTION = 'eventos_esocial';
  private readonly COLLECTION_S2210 = 'esocial_s2210';
  private filtroTipo = '';

  // Tabelas de domínio do S-2210 (carregadas de arquivo externo, não hardcoded aqui).
  tab = {
    indRetif: IND_RETIF, tpAcid: TP_ACID, tpCat: TP_CAT, iniciatCAT: INICIAT_CAT,
    simNao: SIM_NAO, tpLocal: TP_LOCAL, lateralidade: LATERALIDADE, ideOC: IDE_OC,
    ufs: UFS, sitGeradora: SIT_GERADORA, parteCorpo: PARTE_CORPO,
    agenteCausador: AGENTE_CAUSADOR, naturezaLesao: NATUREZA_LESAO, cid10: CID10,
  };

  gruposEventos = [
    { grupo: 'Tabelas', tipos: ['S1000', 'S1005', 'S1010', 'S1020', 'S1030', 'S1035', 'S1040', 'S1050', 'S1060', 'S1070', 'S1080'] },
    { grupo: 'Não Periódicos', tipos: ['S2190', 'S2200', 'S2205', 'S2206', 'S2210', 'S2220', 'S2230', 'S2240', 'S2298', 'S2299', 'S2300', 'S2306', 'S2399', 'S2400'] },
    { grupo: 'Periódicos', tipos: ['S1200', 'S1202', 'S1207', 'S1210', 'S1260', 'S1270', 'S1280', 'S1298', 'S1299'] },
  ];

  constructor(private fb: FormBuilder, private appwrite: AppwriteService, private auth: AuthService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      tipoEvento: ['', Validators.required], funcionarioId: [''], funcionarioCpf: [''],
      funcionarioNome: [''], competencia: [''], observacao: [''],
      cat: this.criarGrupoCat(),
    });
    this.carregar();
  }

  /** Subgrupo do S-2210. Sem Validators.required: a obrigatoriedade é checada em validar(). */
  private criarGrupoCat(): FormGroup {
    return this.fb.group({
      indRetif: ['1'], nrRecibo: [''],
      cpfTrab: [''], matricula: [''],
      dtAcid: [''], tpAcid: ['1'], hrAcid: [''], hrsTrabAntesAcid: [''],
      tpCat: ['1'], indCatObito: ['N'], dtObito: [''],
      indComunPolicia: ['N'], codSitGeradora: [''], iniciatCAT: ['1'],
      obsCAT: [''], ultDiaTrab: [''], houveAfast: ['N'],
      local: this.fb.group({ tpLocal: ['1'], dscLograd: [''], bairro: [''], cep: [''], codMunic: [''], uf: [''] }),
      partes: this.fb.array([this.criarParte()]),
      agentes: this.fb.array([this.criarAgente()]),
      temAtestado: [false],
      atestado: this.fb.group({
        dtAtendimento: [''], hrAtendimento: [''], indInternacao: ['N'], durTrat: [''],
        indAfast: ['N'], dscLesao: [''], codCID: [''], nmEmit: [''], ideOC: ['1'], nrOC: [''], ufOC: [''],
      }),
    });
  }

  private criarParte(): FormGroup {
    return this.fb.group({ codParteAting: [''], lateralidade: ['0'] });
  }
  private criarAgente(): FormGroup {
    return this.fb.group({ codAgntCausador: [''] });
  }

  isCat = (): boolean => this.form?.get('tipoEvento')?.value === 'S2210';
  get catGroup(): FormGroup { return this.form.get('cat') as FormGroup; }
  get partes(): FormArray { return this.catGroup.get('partes') as FormArray; }
  get agentes(): FormArray { return this.catGroup.get('agentes') as FormArray; }

  adicionarParte() { this.partes.push(this.criarParte()); }
  removerParte(i: number) { if (this.partes.length > 1) this.partes.removeAt(i); }
  adicionarAgente() { this.agentes.push(this.criarAgente()); }
  removerAgente(i: number) { if (this.agentes.length > 1) this.agentes.removeAt(i); }

  private grupoDoTipo(tipo: string): string {
    const g = this.gruposEventos.find(grp => grp.tipos.includes(tipo));
    return g ? g.grupo : '';
  }

  private toView(d: EventoEsocialDoc): EventoEsocialView {
    return {
      ...d,
      id: d.$id,
      grupoEvento: this.grupoDoTipo(d.tipoEvento),
      protocoloEnvio: d.protocolo ?? '',
    };
  }

  private baseQueries(): string[] {
    const q = [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', this.auth.tenantId() || 'default'),
    ];
    const empresaId = this.auth.empresaId();
    if (empresaId) q.push(this.appwrite.query.equal('empresaId', empresaId));
    return q;
  }

  carregar(_page = 0) {
    this.loading.set(true);
    const queries = this.baseQueries();
    if (this.filtroTipo) queries.push(this.appwrite.query.equal('tipoEvento', this.filtroTipo));
    this.appwrite.listDocuments<EventoEsocialDoc>(this.COLLECTION, queries).subscribe({
      next: (res) => {
        const views = res.map(d => this.toView(d));
        this.eventos.set(views);
        this.totalElements.set(views.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(_event: PageEvent) { /* paginação client-side: todos os itens já carregados (limit 100) */ }
  resetForm() {
    this.form.reset({ tipoEvento: '' });
    // Reconstrói o subgrupo CAT (limpa FormArrays para o estado inicial).
    this.form.setControl('cat', this.criarGrupoCat());
  }

  filtrarPorTipo(tipo: string) {
    this.filtroTipo = tipo || '';
    this.carregar();
  }

  filtrarPorCompetencia(event: Event) {
    const comp = (event.target as HTMLInputElement).value;
    if (!comp) { this.carregar(); return; }
    this.loading.set(true);
    const queries = this.baseQueries();
    queries.push(this.appwrite.query.equal('competencia', comp));
    this.appwrite.listDocuments<EventoEsocialDoc>(this.COLLECTION, queries).subscribe({
      next: (res) => {
        const views = res.map(d => this.toView(d));
        this.eventos.set(views);
        this.totalElements.set(views.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  carregarPendentes() {
    this.loading.set(true);
    const queries = this.baseQueries();
    // Pendentes = ainda não aceitos pelo governo (rascunho/validado/enviado/processado).
    this.appwrite.listDocuments<EventoEsocialDoc>(this.COLLECTION, queries).subscribe({
      next: (res) => {
        const finalizados = ['ACEITO', 'REJEITADO'];
        const views = res.filter(d => !finalizados.includes(d.status)).map(d => this.toView(d));
        this.eventos.set(views);
        this.totalElements.set(views.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  salvar() {
    if (!this.form.valid) return;
    if (this.isCat()) { this.salvarS2210(); return; }
    const v = this.form.value;
    const data: Record<string, unknown> = {
      tipoEvento: v.tipoEvento,
      competencia: v.competencia ?? '',
      funcionarioId: v.funcionarioId ?? '',
      funcionarioCpf: v.funcionarioCpf ?? '',
      funcionarioNome: v.funcionarioNome ?? '',
      observacao: v.observacao ?? '',
      status: 'RASCUNHO',
      protocolo: '',
      tenantId: this.auth.tenantId() || 'default',
      empresaId: this.auth.empresaId() || '',
    };
    this.appwrite.createDocument<EventoEsocialDoc>(this.COLLECTION, data).subscribe({
      next: () => { this.snackBar.open('Evento criado!', 'OK', { duration: 3000 }); this.showForm.set(false); this.carregar(); },
      error: () => this.snackBar.open('Erro ao criar evento', 'OK', { duration: 3000 }),
    });
  }

  /** Cria o evento pai em `eventos_esocial` e o detalhe em `esocial_s2210` (linkado por eventoId). */
  private salvarS2210() {
    const cat = this.catGroup.value;
    const cpfTrab = String(cat.cpfTrab ?? '').replace(/\D/g, '');
    const competencia = (cat.dtAcid || '').slice(0, 7); // YYYY-MM derivado da data do acidente
    const pai: Record<string, unknown> = {
      tipoEvento: 'S2210',
      competencia,
      funcionarioCpf: cpfTrab,
      funcionarioNome: '',
      observacao: cat.obsCAT ?? '',
      status: 'RASCUNHO',
      protocolo: '',
      tenantId: this.auth.tenantId() || 'default',
      empresaId: this.auth.empresaId() || '',
    };

    this.appwrite.createDocument<EventoEsocialDoc>(this.COLLECTION, pai).pipe(
      switchMap((evento) => {
        const detalhe = this.montarDetalheS2210(evento.$id, cat);
        return this.appwrite.createDocument<S2210Doc>(this.COLLECTION_S2210, detalhe);
      }),
    ).subscribe({
      next: () => { this.snackBar.open('CAT (S-2210) criada como rascunho!', 'OK', { duration: 3000 }); this.showForm.set(false); this.carregar(); },
      error: (e) => this.snackBar.open('Erro ao criar CAT: ' + (e?.message || ''), 'OK', { duration: 4000 }),
    });
  }

  /** Monta o documento de detalhe (escalares + grupos aninhados como JSON-string). */
  private montarDetalheS2210(eventoId: string, cat: any): Record<string, unknown> {
    const local = cat.local || {};
    const localAcidente = this.limpar({
      tpLocal: Number(local.tpLocal),
      dscLograd: local.dscLograd, bairro: local.bairro,
      cep: local.cep, codMunic: local.codMunic, uf: local.uf,
    });
    const partes = (cat.partes || []).map((p: any) => this.limpar({
      codParteAting: p.codParteAting, lateralidade: p.lateralidade,
    }));
    const agentes = (cat.agentes || []).map((a: any) => this.limpar({ codAgntCausador: a.codAgntCausador }));
    const atestado = cat.temAtestado ? this.limpar({
      dtAtendimento: cat.atestado.dtAtendimento, hrAtendimento: cat.atestado.hrAtendimento,
      indInternacao: cat.atestado.indInternacao, durTrat: cat.atestado.durTrat ? Number(cat.atestado.durTrat) : undefined,
      indAfast: cat.atestado.indAfast, dscLesao: cat.atestado.dscLesao, codCID: cat.atestado.codCID,
      emitente: this.limpar({ nmEmit: cat.atestado.nmEmit, ideOC: Number(cat.atestado.ideOC), nrOC: cat.atestado.nrOC, ufOC: cat.atestado.ufOC }),
    }) : null;

    return {
      eventoId,
      cpfTrab: String(cat.cpfTrab ?? '').replace(/\D/g, ''),
      matricula: cat.matricula ?? '',
      dtAcid: cat.dtAcid ?? '',
      tpAcid: cat.tpAcid ?? '',
      hrAcid: cat.hrAcid ?? '',
      hrsTrabAntesAcid: cat.hrsTrabAntesAcid ?? '',
      tpCat: Number(cat.tpCat),
      indCatObito: cat.tpCat === '3' ? (cat.indCatObito ?? '') : '',
      dtObito: cat.tpCat === '3' ? (cat.dtObito ?? '') : '',
      indComunPolicia: cat.indComunPolicia ?? 'N',
      codSitGeradora: cat.codSitGeradora ?? '',
      iniciatCAT: Number(cat.iniciatCAT),
      obsCAT: cat.obsCAT ?? '',
      ultDiaTrab: cat.ultDiaTrab ?? '',
      houveAfast: cat.houveAfast ?? 'N',
      localAcidenteJson: JSON.stringify(localAcidente),
      partesAtingidasJson: JSON.stringify(partes),
      agentesCausadoresJson: JSON.stringify(agentes),
      atestadoJson: atestado ? JSON.stringify(atestado) : '',
      empresaId: this.auth.empresaId() || '',
      tenantId: this.auth.tenantId() || 'default',
    };
  }

  /** Remove chaves vazias/undefined para não emitir nós opcionais no XML depois. */
  private limpar<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(obj)) {
      if (val === undefined || val === null || val === '' || Number.isNaN(val)) continue;
      out[k] = val;
    }
    return out as Partial<T>;
  }

  validar(id: string) {
    const evento = this.eventos().find(e => e.id === id);
    if (!evento) { this.snackBar.open('Evento não encontrado', 'OK', { duration: 3000 }); return; }
    if (evento.tipoEvento === 'S2210') { this.validarS2210(evento); return; }

    // Validação local simples: confere campos obrigatórios do layout eSocial.
    const erros: string[] = [];
    if (!evento.tipoEvento) erros.push('tipo do evento');
    if (!evento.competencia || !/^\d{4}-\d{2}$/.test(evento.competencia)) erros.push('competência (YYYY-MM)');
    const grupoNaoPeriodicos = this.grupoDoTipo(evento.tipoEvento) === 'Não Periódicos';
    if (grupoNaoPeriodicos && !evento.funcionarioId && !evento.funcionarioCpf) {
      erros.push('identificação do funcionário');
    }
    if (erros.length > 0) {
      this.snackBar.open(`Validação falhou: faltam ${erros.join(', ')}`, 'OK', { duration: 5000 });
      return;
    }
    this.appwrite.updateDocument<EventoEsocialDoc>(this.COLLECTION, id, { status: 'VALIDADO' }).subscribe({
      next: () => { this.snackBar.open('Evento validado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao validar', 'OK', { duration: 3000 }),
    });
  }

  /** Valida o detalhe do S-2210 (regras do leiaute em JS) antes de marcar VALIDADO. */
  private validarS2210(evento: EventoEsocialView) {
    this.buscarDetalhe(evento.id).subscribe({
      next: (det) => {
        if (!det) { this.snackBar.open('Detalhe da CAT não encontrado', 'OK', { duration: 4000 }); return; }
        const erros = this.regrasS2210(det);
        if (erros.length) {
          this.snackBar.open(`CAT inválida: ${erros.join(', ')}`, 'OK', { duration: 6000 });
          return;
        }
        this.appwrite.updateDocument<EventoEsocialDoc>(this.COLLECTION, evento.id, { status: 'VALIDADO' }).subscribe({
          next: () => { this.snackBar.open('CAT validada!', 'OK', { duration: 3000 }); this.carregar(); },
          error: () => this.snackBar.open('Erro ao validar', 'OK', { duration: 3000 }),
        });
      },
      error: () => this.snackBar.open('Erro ao carregar detalhe da CAT', 'OK', { duration: 3000 }),
    });
  }

  /** Regras de leiaute (espelham o validar() do builder server-side). */
  private regrasS2210(d: S2210Doc): string[] {
    const e: string[] = [];
    const ehData = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!/^\d{11}$/.test(d.cpfTrab || '')) e.push('CPF do acidentado');
    if (!ehData(d.dtAcid)) e.push('data do acidente');
    if (![1, 2, 3].includes(Number(d.tpCat))) e.push('tipo da CAT');
    if (Number(d.tpCat) === 3) {
      if (d.indCatObito !== 'S') e.push('indicador de óbito (S)');
      if (!ehData(d.dtObito)) e.push('data do óbito');
    }
    if (d.indComunPolicia !== 'S' && d.indComunPolicia !== 'N') e.push('comunicação à polícia');
    if (!d.codSitGeradora) e.push('situação geradora');
    if (![1, 2, 3].includes(Number(d.iniciatCAT))) e.push('iniciativa da CAT');
    if (d.houveAfast !== 'S' && d.houveAfast !== 'N') e.push('houve afastamento');
    const local = this.parse(d.localAcidenteJson);
    if (!local || local.tpLocal == null || !local.codMunic || !/^[A-Z]{2}$/.test(local.uf || '')) e.push('local do acidente (tpLocal/município/UF)');
    const partes = this.parse(d.partesAtingidasJson) || [];
    if (!partes.length) e.push('ao menos uma parte atingida');
    const agentes = this.parse(d.agentesCausadoresJson) || [];
    if (!agentes.length) e.push('ao menos um agente causador');
    if (d.atestadoJson) {
      const at = this.parse(d.atestadoJson);
      if (!ehData(at?.dtAtendimento)) e.push('data do atendimento (atestado)');
      if (!at?.dscLesao) e.push('natureza da lesão (atestado)');
      if (!at?.codCID) e.push('CID (atestado)');
      if (!at?.emitente?.nmEmit || !at?.emitente?.nrOC) e.push('emitente do atestado');
    }
    return e;
  }

  enviar(id: string) {
    const evento = this.eventos().find(e => e.id === id);
    if (!evento) { this.snackBar.open('Evento não encontrado', 'OK', { duration: 3000 }); return; }
    if (evento.tipoEvento !== 'S2210') {
      // Demais eventos: transmissão ainda não fiada nesta versão.
      this.snackBar.open('Transmissão deste evento ainda não está disponível nesta versão', 'OK', { duration: 5000 });
      return;
    }
    this.enviarS2210(evento);
  }

  /** Monta o `dados` do evtCAT e chama a Function `esocial-enviar-lote` (HOMOLOGAÇÃO). */
  private enviarS2210(evento: EventoEsocialView) {
    this.loading.set(true);
    const empresaId = this.auth.empresaId();
    // Busca o detalhe + o CNPJ do empregador (collection `empresas`).
    this.buscarDetalhe(evento.id).pipe(
      switchMap((det) => {
        if (!det) throw new Error('detalhe da CAT não encontrado');
        return this.appwrite.getDocument<{ cnpj?: string }>('empresas', empresaId).pipe(
          switchMap((empresa) => {
            const nrInsc = String(empresa?.cnpj ?? '').replace(/\D/g, '');
            if (nrInsc.length !== 14) throw new Error('CNPJ do empregador inválido/ausente em `empresas`');
            const dados = this.montarDadosEnvio(det, nrInsc);
            const ideEmpregador = { tpInsc: 1, nrInsc };
            const payload = {
              empresaId,
              grupo: 1, // CAT é evento não-periódico
              ideEmpregador,
              ideTransmissor: ideEmpregador, // o próprio empregador transmite
              eventos: [{ eventoId: evento.id, tipoEvento: 'S-2210', dados, statusAtual: 'VALIDADO' }],
            };
            return this.appwrite.executeFunction<{ ok: boolean; erro?: string; protocolo?: string }>('esocial-enviar-lote', payload);
          }),
        );
      }),
    ).subscribe({
      next: (r) => {
        this.loading.set(false);
        if (r?.ok) this.snackBar.open(`CAT enviada (HOMOLOGAÇÃO). Protocolo: ${r.protocolo || '—'}`, 'OK', { duration: 6000 });
        else this.snackBar.open('Falha no envio: ' + (r?.erro || 'erro desconhecido'), 'OK', { duration: 6000 });
        this.carregar();
      },
      error: (e) => { this.loading.set(false); this.snackBar.open('Erro ao enviar CAT: ' + (e?.message || ''), 'OK', { duration: 6000 }); },
    });
  }

  /** Consulta o processamento do lote por protocolo e atualiza o estado. */
  consultar(id: string) {
    const evento = this.eventos().find(e => e.id === id);
    if (!evento) { this.snackBar.open('Evento não encontrado', 'OK', { duration: 3000 }); return; }
    if (!evento.protocoloEnvio) { this.snackBar.open('Evento sem protocolo para consultar', 'OK', { duration: 4000 }); return; }
    this.loading.set(true);
    this.appwrite.executeFunction<{ ok: boolean; erro?: string; status?: string }>('esocial-consultar-lote', {
      empresaId: this.auth.empresaId(),
      protocolo: evento.protocoloEnvio,
      eventoIds: [evento.id],
    }).subscribe({
      next: (r) => {
        this.loading.set(false);
        if (r?.ok) this.snackBar.open(`Processamento: ${r.status}`, 'OK', { duration: 5000 });
        else this.snackBar.open('Falha na consulta: ' + (r?.erro || ''), 'OK', { duration: 5000 });
        this.carregar();
      },
      error: (e) => { this.loading.set(false); this.snackBar.open('Erro na consulta: ' + (e?.message || ''), 'OK', { duration: 5000 }); },
    });
  }

  /** `dados` no formato esperado por montarS2210 (server-side). */
  private montarDadosEnvio(d: S2210Doc, nrInsc: string): Record<string, unknown> {
    const cat: Record<string, unknown> = {
      dtAcid: d.dtAcid,
      tpAcid: d.tpAcid || undefined,
      hrAcid: d.hrAcid || undefined,
      hrsTrabAntesAcid: d.hrsTrabAntesAcid || undefined,
      tpCat: Number(d.tpCat),
      indCatObito: d.indCatObito || undefined,
      dtObito: d.dtObito || undefined,
      indComunPolicia: d.indComunPolicia,
      codSitGeradora: d.codSitGeradora,
      iniciatCAT: Number(d.iniciatCAT),
      obsCAT: d.obsCAT || undefined,
      ultDiaTrab: d.ultDiaTrab || undefined,
      houveAfast: d.houveAfast,
      localAcidente: this.parse(d.localAcidenteJson),
      partesAtingidas: this.parse(d.partesAtingidasJson),
      agentesCausadores: this.parse(d.agentesCausadoresJson),
      atestado: d.atestadoJson ? this.parse(d.atestadoJson) : undefined,
    };
    return {
      tpAmb: 2, // 2 = produção restrita (HOMOLOGAÇÃO). Não depende de ESOCIAL_AMBIENTE.
      indRetif: 1,
      tpInsc: 1,
      nrInsc,
      ideVinculo: this.limpar({ cpfTrab: d.cpfTrab, matricula: d.matricula }),
      cat,
    };
  }

  private buscarDetalhe(eventoId: string) {
    return this.appwrite.listDocuments<S2210Doc>(this.COLLECTION_S2210, [this.appwrite.query.equal('eventoId', eventoId), this.appwrite.query.limit(1)]).pipe(
      switchMap((docs) => [docs[0] ?? null]),
    );
  }

  private parse(json?: string): any {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'RASCUNHO': 'badge--neutral',
      'VALIDADO': 'badge--info',
      'ENVIADO': 'badge--warning',
      'PROCESSANDO': 'badge--warning',
      'PROCESSADO': 'badge--info',
      'ACEITO': 'badge--success',
      'REJEITADO': 'badge--error',
    };
    return map[s] || 'badge--neutral';
  }
}
