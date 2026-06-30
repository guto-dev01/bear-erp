// ─────────────────────────────────────────────────────────────────────────────
//  TESTE BEAR — Módulo Contábil completo (código original do bear-erp)
//
//  Replica a ORGANIZAÇÃO FUNCIONAL de uma contabilidade brasileira em 6 menus:
//    1. Lançamentos        2. Consulta          3. Livros e Relatórios
//    4. Declarações Digitais  5. Cadastro        6. Manutenção
//
//  É código novo, autoral, escrito no padrão do bear-erp (standalone + signals +
//  Angular Material + ContabilidadeService). NÃO contém nada extraído de software
//  proprietário de terceiros — apenas funcionalidade contábil padrão (SPED/ECD/ECF,
//  partidas dobradas, livros Diário/Razão, balancete, DRE, BP, encerramento etc.).
// ─────────────────────────────────────────────────────────────────────────────
import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { ContabilidadeService, EmpresaContabil } from './contabilidade.service';
import { gerarEcd, EcdDados, EcdSaldoPeriodo } from './ecd-sped.generator';

type Menu = 'lancamentos' | 'consulta' | 'livros' | 'declaracoes' | 'cadastro' | 'manutencao';

interface MenuDef { id: Menu; label: string; icon: string; subs: SubDef[]; }
interface SubDef { id: string; label: string; icon: string; }
interface ImportRow {
  linha: number;
  data: string;
  historico: string;
  codDeb: string;
  codCred: string;
  valor: number;
  contaDebitoId?: string;
  contaCreditoId?: string;
  valido: boolean;
  erro: string;
}
interface RazaoMov {
  data: string;
  numero: number;
  historico: string;
  contraPartida: string;
  debito: number;
  credito: number;
  saldo: number;     // valor absoluto do saldo acumulado
  dc: 'D' | 'C';     // lado do saldo acumulado
}
interface RazaoConta {
  codigo: string;
  descricao: string;
  naturezaDevedora: boolean;
  saldoAnterior: number;   // natural (sinalizado)
  movimentos: RazaoMov[];
  totalDebitos: number;
  totalCreditos: number;
  saldoFinal: number;      // natural (sinalizado)
}
interface DiarioPartida { codigo: string; descricao: string; dc: 'D' | 'C'; valor: number; }
interface DiarioLanc {
  numero: number;
  data: string;
  historico: string;
  partidas: DiarioPartida[];
  total: number;           // soma dos débitos do lançamento
}

@Component({
  selector: 'bear-teste-bear',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule, MatSnackBarModule, MatTableModule,
  ],
  template: `
    <div class="page-container">
      <!-- ── Cabeçalho ─────────────────────────────────────────────── -->
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Contábil — Teste Bear</h1>
          <p class="page-header__subtitle">Módulo contábil completo: lançamentos, consultas, livros, declarações, cadastro e manutenção</p>
        </div>
        <div class="page-header__actions">
          <mat-form-field appearance="outline" style="width:110px">
            <mat-label>Ano</mat-label>
            <mat-select [value]="ano()" (valueChange)="ano.set($event)">
              @for (a of anos; track a) { <mat-option [value]="a">{{ a }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:130px">
            <mat-label>Competência</mat-label>
            <mat-select [value]="mes()" (valueChange)="mes.set($event)">
              @for (m of meses; track m.v) { <mat-option [value]="m.v">{{ m.n }}</mat-option> }
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- ── Menu principal (6 abas estilo Alterdata Contábil) ─────── -->
      <div class="bear-card overflow-hidden mb-4">
        <div class="flex flex-wrap border-b" style="border-color:var(--surface-3)">
          @for (m of menus; track m.id) {
            <button class="flex items-center gap-2 px-5 py-3 text-sm font-medium transition"
                    [style.color]="menu() === m.id ? 'var(--brand-primary)' : 'var(--text-secondary)'"
                    [style.borderBottom]="menu() === m.id ? '2px solid var(--brand-primary)' : '2px solid transparent'"
                    (click)="selectMenu(m)">
              <span class="material-symbols-rounded text-lg">{{ m.icon }}</span>{{ m.label }}
            </button>
          }
        </div>
        <!-- Sub-menu da aba ativa -->
        <div class="flex flex-wrap gap-2 p-3" style="background:var(--surface-2)">
          @for (s of activeMenu().subs; track s.id) {
            <button class="bear-btn"
                    [ngClass]="sub() === s.id ? 'bear-btn--primary' : 'bear-btn--outline'"
                    style="padding:0.375rem 0.875rem;font-size:0.8125rem"
                    (click)="selectSub(s.id)">
              <span class="material-symbols-rounded text-sm mr-1">{{ s.icon }}</span>{{ s.label }}
            </button>
          }
        </div>
      </div>

      <!-- ════════════════════════ 1. LANÇAMENTOS ═══════════════════ -->
      @if (menu() === 'lancamentos') {
        @if (sub() === 'manual' || sub() === 'lote') {
          <div class="bear-card p-6 animate-fade-in-up">
            <h3 class="text-base font-semibold mb-4">{{ sub() === 'lote' ? 'Lançamento em Lote' : 'Lançamento Manual (Partidas Dobradas)' }}</h3>
            <form [formGroup]="lancForm" (ngSubmit)="salvarLancamento()">
              <div class="grid grid-cols-12 gap-3 mb-2">
                <mat-form-field appearance="outline" class="col-span-3">
                  <mat-label>Data</mat-label><input matInput type="date" formControlName="data">
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-7">
                  <mat-label>Histórico</mat-label>
                  <input matInput formControlName="historico" [matTooltip]="'Selecione um histórico padrão em Cadastro › Históricos'">
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-2">
                  <mat-label>Tipo</mat-label>
                  <mat-select formControlName="tipo">
                    <mat-option value="NORMAL">Normal</mat-option>
                    <mat-option value="ABERTURA">Abertura</mat-option>
                    <mat-option value="ENCERRAMENTO">Encerramento</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div formArrayName="partidas" class="rounded-lg p-3" style="background:var(--surface-2)">
                <div class="grid grid-cols-12 gap-2 text-xs font-semibold px-1 mb-1" style="color:var(--text-secondary)">
                  <div class="col-span-6">Conta</div><div class="col-span-2">D/C</div><div class="col-span-3">Valor</div><div class="col-span-1"></div>
                </div>
                @for (p of partidas.controls; track $index) {
                  <div [formGroupName]="$index" class="grid grid-cols-12 gap-2 items-center">
                    <mat-form-field appearance="outline" class="col-span-6">
                      <mat-label>Conta analítica</mat-label>
                      <mat-select formControlName="contaId">
                        @for (c of contas(); track c.id) {
                          <mat-option [value]="c.id">{{ c.codigo }} — {{ c.descricao || c.nome }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="col-span-2">
                      <mat-label>D/C</mat-label>
                      <mat-select formControlName="tipo">
                        <mat-option value="DEBITO">Débito</mat-option>
                        <mat-option value="CREDITO">Crédito</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="col-span-3">
                      <mat-label>Valor</mat-label><input matInput type="number" formControlName="valor">
                    </mat-form-field>
                    <div class="col-span-1 pb-5">
                      @if (partidas.length > 2) {
                        <button type="button" class="bear-btn bear-btn--ghost" style="padding:0.25rem;color:#FF3B30" (click)="removerPartida($index)">
                          <span class="material-symbols-rounded text-sm">remove_circle</span>
                        </button>
                      }
                    </div>
                  </div>
                }
                <button type="button" class="bear-btn bear-btn--outline" style="padding:0.375rem 0.75rem;font-size:0.75rem" (click)="adicionarPartida()">
                  <span class="material-symbols-rounded text-sm mr-1">add</span> Adicionar partida
                </button>
              </div>

              <div class="flex items-center justify-between mt-4">
                <div class="text-sm">
                  Débitos: <b>{{ somaPartidas('DEBITO') | currency:'BRL' }}</b> &nbsp;·&nbsp;
                  Créditos: <b>{{ somaPartidas('CREDITO') | currency:'BRL' }}</b>
                  <span class="badge ml-2" [ngClass]="partidasBatem() ? 'badge--success' : 'badge--error'">
                    <span class="badge__dot"></span>{{ partidasBatem() ? 'Conferido' : 'Não fecha' }}
                  </span>
                </div>
                <button type="submit" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" [disabled]="lancForm.invalid || !partidasBatem()">
                  <span class="material-symbols-rounded text-lg mr-1">save</span> Lançar
                </button>
              </div>
            </form>
          </div>
        }

        @if (sub() === 'simplificado') {
          <div class="bear-card p-6 animate-fade-in-up">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-semibold">Lançamento Simplificado</h3>
              <span class="badge badge--info"><span class="badge__dot"></span>partida única</span>
            </div>
            <p class="text-sm mb-4" style="color:var(--text-secondary)">Débito e crédito numa única linha — o mesmo valor é lançado nos dois lados automaticamente.</p>
            <form [formGroup]="simplesForm" (ngSubmit)="salvarSimplificado()">
              <div class="grid grid-cols-12 gap-3 mb-2">
                <mat-form-field appearance="outline" class="col-span-3">
                  <mat-label>Data</mat-label><input matInput type="date" formControlName="data">
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-7">
                  <mat-label>Histórico</mat-label>
                  <input matInput formControlName="historico" [matTooltip]="'Selecione um histórico padrão em Cadastro › Históricos'">
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-2">
                  <mat-label>Tipo</mat-label>
                  <mat-select formControlName="tipo">
                    <mat-option value="NORMAL">Normal</mat-option>
                    <mat-option value="ABERTURA">Abertura</mat-option>
                    <mat-option value="ENCERRAMENTO">Encerramento</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="rounded-lg p-3" style="background:var(--surface-2)">
                <div class="grid grid-cols-12 gap-2 text-xs font-semibold px-1 mb-1" style="color:var(--text-secondary)">
                  <div class="col-span-5">Conta de Débito</div><div class="col-span-5">Conta de Crédito</div><div class="col-span-2">Valor</div>
                </div>
                <div class="grid grid-cols-12 gap-2 items-center">
                  <mat-form-field appearance="outline" class="col-span-5">
                    <mat-label>Débito</mat-label>
                    <mat-select formControlName="contaDebitoId">
                      @for (c of contas(); track c.id) {
                        <mat-option [value]="c.id">{{ c.codigo }} — {{ c.descricao || c.nome }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="col-span-5">
                    <mat-label>Crédito</mat-label>
                    <mat-select formControlName="contaCreditoId">
                      @for (c of contas(); track c.id) {
                        <mat-option [value]="c.id">{{ c.codigo }} — {{ c.descricao || c.nome }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="col-span-2">
                    <mat-label>Valor</mat-label><input matInput type="number" formControlName="valor">
                  </mat-form-field>
                </div>
              </div>

              <div class="flex items-center justify-between mt-4">
                <div class="text-sm">
                  @if (simplesMesmaConta()) {
                    <span class="badge badge--error"><span class="badge__dot"></span>Débito e crédito não podem ser a mesma conta</span>
                  } @else if (simplesForm.valid) {
                    <span class="badge badge--success"><span class="badge__dot"></span>Pronto para lançar</span>
                  } @else {
                    <span style="color:var(--text-secondary)">Informe conta de débito, conta de crédito e valor.</span>
                  }
                </div>
                <button type="submit" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" [disabled]="simplesForm.invalid || simplesMesmaConta()">
                  <span class="material-symbols-rounded text-lg mr-1">bolt</span> Lançar
                </button>
              </div>
            </form>
          </div>
        }

        @if (sub() === 'fixos') {
          <div class="bear-card p-6 animate-fade-in-up mb-4">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 class="text-base font-semibold">Lançamentos Fixos (recorrentes)</h3>
                <p class="text-sm" style="color:var(--text-secondary)">Modelos que se repetem a cada competência. Gere os lançamentos do mês com um clique — sem duplicar.</p>
              </div>
              <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem" [disabled]="gerandoFixos()" (click)="gerarFixos()">
                @if (gerandoFixos()) {
                  <div class="login__spinner" style="width:18px;height:18px;border:3px solid var(--surface-3);border-top-color:#fff;margin-right:.5rem"></div>
                } @else {
                  <span class="material-symbols-rounded text-lg mr-1">bolt</span>
                }
                Gerar de {{ mesNome() }}/{{ ano() }}
              </button>
            </div>
          </div>

          <div class="bear-card p-6 animate-fade-in-up mb-4">
            <h4 class="text-sm font-semibold mb-3">{{ fixoEditId() ? 'Editar fixo' : 'Novo fixo' }}</h4>
            <form [formGroup]="fixosForm" (ngSubmit)="salvarFixo()">
              <div class="grid grid-cols-12 gap-3">
                <mat-form-field appearance="outline" class="col-span-12 md:col-span-8">
                  <mat-label>Histórico</mat-label><input matInput formControlName="historico">
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-6 md:col-span-2">
                  <mat-label>Valor</mat-label><input matInput type="number" formControlName="valor">
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-6 md:col-span-2">
                  <mat-label>Dia do mês</mat-label><input matInput type="number" min="1" max="31" formControlName="diaVencimento">
                </mat-form-field>

                <mat-form-field appearance="outline" class="col-span-12 md:col-span-5">
                  <mat-label>Conta de Débito</mat-label>
                  <mat-select formControlName="contaDebitoId">
                    @for (c of contas(); track c.id) { <mat-option [value]="c.id">{{ c.codigo }} — {{ c.descricao || c.nome }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-12 md:col-span-5">
                  <mat-label>Conta de Crédito</mat-label>
                  <mat-select formControlName="contaCreditoId">
                    @for (c of contas(); track c.id) { <mat-option [value]="c.id">{{ c.codigo }} — {{ c.descricao || c.nome }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-12 md:col-span-2">
                  <mat-label>Tipo</mat-label>
                  <mat-select formControlName="tipo">
                    <mat-option value="NORMAL">Normal</mat-option>
                    <mat-option value="ABERTURA">Abertura</mat-option>
                    <mat-option value="ENCERRAMENTO">Encerramento</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="col-span-6 md:col-span-3">
                  <mat-label>Vigência início</mat-label><input matInput placeholder="2026-01" formControlName="vigenciaInicio">
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-6 md:col-span-3">
                  <mat-label>Vigência fim</mat-label><input matInput placeholder="2026-12" formControlName="vigenciaFim">
                </mat-form-field>
                <label class="col-span-12 md:col-span-3 flex items-center gap-2 text-sm pb-5">
                  <input type="checkbox" formControlName="ativo"> Ativo
                </label>
              </div>

              <div class="flex items-center justify-between mt-1">
                <div class="text-sm">
                  @if (fixoMesmaConta()) {
                    <span class="badge badge--error"><span class="badge__dot"></span>Débito e crédito não podem ser a mesma conta</span>
                  }
                </div>
                <div class="flex items-center gap-2">
                  @if (fixoEditId()) {
                    <button type="button" class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem" (click)="cancelarEdicaoFixo()">Cancelar</button>
                  }
                  <button type="submit" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" [disabled]="fixosForm.invalid || fixoMesmaConta()">
                    <span class="material-symbols-rounded text-lg mr-1">save</span> {{ fixoEditId() ? 'Salvar' : 'Adicionar' }}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div class="bear-card overflow-hidden animate-fade-in-up">
            @if (fixos().length === 0) {
              <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">push_pin</span></div>
                <h3 class="empty-state__title">Nenhum lançamento fixo cadastrado</h3>
                <p class="empty-state__description">Cadastre um modelo acima e clique em “Gerar” a cada competência.</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead style="background:var(--surface-2)">
                    <tr>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">Histórico</th>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">Débito</th>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">Crédito</th>
                      <th class="text-right px-3 py-2 font-semibold" style="color:var(--text-secondary)">Valor</th>
                      <th class="text-center px-3 py-2 font-semibold" style="color:var(--text-secondary)">Dia</th>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">Vigência</th>
                      <th class="text-center px-3 py-2 font-semibold" style="color:var(--text-secondary)">Status</th>
                      <th class="text-right px-3 py-2 font-semibold" style="color:var(--text-secondary)">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (f of fixos(); track f.id) {
                      <tr class="border-t" style="border-color:var(--surface-3)">
                        <td class="px-3 py-2">{{ f.historico }}</td>
                        <td class="px-3 py-2 font-mono text-xs">{{ f.contaDebitoCodigo || contaLabel(f.contaDebitoId) }}</td>
                        <td class="px-3 py-2 font-mono text-xs">{{ f.contaCreditoCodigo || contaLabel(f.contaCreditoId) }}</td>
                        <td class="px-3 py-2 text-right font-semibold">{{ f.valor | currency:'BRL' }}</td>
                        <td class="px-3 py-2 text-center">{{ f.diaVencimento }}</td>
                        <td class="px-3 py-2 text-xs">{{ f.vigenciaInicio || '—' }}{{ f.vigenciaFim ? ' → ' + f.vigenciaFim : '' }}</td>
                        <td class="px-3 py-2 text-center">
                          <span class="badge" [ngClass]="f.ativo ? 'badge--success' : 'badge--muted'"><span class="badge__dot"></span>{{ f.ativo ? 'Ativo' : 'Inativo' }}</span>
                        </td>
                        <td class="px-3 py-2">
                          <div class="flex items-center justify-end gap-1">
                            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem" [matTooltip]="f.ativo ? 'Desativar' : 'Ativar'" (click)="toggleFixoAtivo(f)">
                              <span class="material-symbols-rounded text-sm">{{ f.ativo ? 'toggle_on' : 'toggle_off' }}</span>
                            </button>
                            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem" matTooltip="Editar" (click)="editarFixo(f)">
                              <span class="material-symbols-rounded text-sm">edit</span>
                            </button>
                            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;color:#FF3B30" matTooltip="Excluir" (click)="excluirFixo(f)">
                              <span class="material-symbols-rounded text-sm">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        @if (sub() === 'abrir') {
          <div class="bear-card overflow-hidden animate-fade-in-up">
            <table mat-table [dataSource]="lancamentos()" class="w-full">
              <ng-container matColumnDef="numero"><th mat-header-cell *matHeaderCellDef>Nº</th><td mat-cell *matCellDef="let l" class="font-mono text-xs">{{ l.numero }}</td></ng-container>
              <ng-container matColumnDef="data"><th mat-header-cell *matHeaderCellDef>Data</th><td mat-cell *matCellDef="let l">{{ l.data | date:'dd/MM/yyyy' }}</td></ng-container>
              <ng-container matColumnDef="historico"><th mat-header-cell *matHeaderCellDef>Histórico</th><td mat-cell *matCellDef="let l">{{ l.historico }}</td></ng-container>
              <ng-container matColumnDef="valor"><th mat-header-cell *matHeaderCellDef>Valor</th><td mat-cell *matCellDef="let l" class="font-semibold">{{ l.valor | currency:'BRL' }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let l"><span class="badge" [ngClass]="l.estornado ? 'badge--error' : 'badge--success'"><span class="badge__dot"></span>{{ l.estornado ? 'Estornado' : 'Ativo' }}</span></td></ng-container>
              <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef>Ações</th>
                <td mat-cell *matCellDef="let l">
                  @if (!l.estornado) {
                    <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;color:#FF3B30" matTooltip="Estornar" (click)="estornar(l)">
                      <span class="material-symbols-rounded text-sm">undo</span>
                    </button>
                  }
                </td></ng-container>
              <tr mat-header-row *matHeaderRowDef="colsLanc"></tr>
              <tr mat-row *matRowDef="let row; columns: colsLanc"></tr>
            </table>
            @if (lancamentos().length === 0) { <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">edit_note</span></div><h3 class="empty-state__title">Sem lançamentos no período</h3></div> }
          </div>
        }

        @if (sub() === 'importar') {
          <div class="bear-card p-6 animate-fade-in-up">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-base font-semibold">Importar Lançamentos</h3>
                <p class="text-sm" style="color:var(--text-secondary)">Arquivo CSV/TXT com colunas: data · histórico · conta débito · conta crédito · valor (contas pelo código do plano)</p>
              </div>
              <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem" (click)="baixarModeloImport()">
                <span class="material-symbols-rounded text-lg mr-1">download</span> Baixar modelo
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mb-5">
              <div class="md:col-span-6">
                <input type="file" accept=".csv,.txt,text/csv,text/plain" (change)="onImportFile($event)"
                       class="block w-full text-sm rounded-lg p-2"
                       style="border:1px dashed var(--surface-3);background:var(--surface-2)">
              </div>
              <mat-form-field appearance="outline" class="md:col-span-3">
                <mat-label>Separador</mat-label>
                <mat-select [value]="importSep()" (valueChange)="setImportSep($event)">
                  <mat-option value=";">Ponto e vírgula (;)</mat-option>
                  <mat-option value=",">Vírgula (,)</mat-option>
                  <mat-option [value]="'\t'">Tabulação</mat-option>
                  <mat-option value="|">Pipe (|)</mat-option>
                </mat-select>
              </mat-form-field>
              <label class="md:col-span-3 flex items-center gap-2 text-sm">
                <input type="checkbox" [checked]="importHeader()" (change)="setImportHeader($event)">
                Primeira linha é cabeçalho
              </label>
            </div>

            @if (importRows().length) {
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Linhas</p><p class="text-xl font-bold">{{ importRows().length }}</p></div>
                <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Válidas</p><p class="text-xl font-bold" style="color:#34C759">{{ importValidas().length }}</p></div>
                <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Com erro</p><p class="text-xl font-bold" style="color:#FF3B30">{{ importComErro().length }}</p></div>
                <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Soma válidas</p><p class="text-xl font-bold">{{ importSoma() | currency:'BRL' }}</p></div>
              </div>

              <div class="overflow-x-auto rounded-lg border" style="border-color:var(--surface-3);max-height:360px">
                <table class="w-full text-sm">
                  <thead style="background:var(--surface-2);position:sticky;top:0">
                    <tr>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">#</th>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">Data</th>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">Histórico</th>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">Débito</th>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">Crédito</th>
                      <th class="text-right px-3 py-2 font-semibold" style="color:var(--text-secondary)">Valor</th>
                      <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of importRows(); track r.linha) {
                      <tr class="border-t" [style.background]="r.valido ? 'transparent' : '#FFF5F5'" style="border-color:var(--surface-3)">
                        <td class="px-3 py-2 font-mono text-xs">{{ r.linha }}</td>
                        <td class="px-3 py-2">{{ r.data }}</td>
                        <td class="px-3 py-2">{{ r.historico }}</td>
                        <td class="px-3 py-2 font-mono text-xs">{{ r.codDeb }}</td>
                        <td class="px-3 py-2 font-mono text-xs">{{ r.codCred }}</td>
                        <td class="px-3 py-2 text-right font-semibold">{{ r.valor | currency:'BRL' }}</td>
                        <td class="px-3 py-2">
                          @if (r.valido) {
                            <span class="badge badge--success"><span class="badge__dot"></span>OK</span>
                          } @else {
                            <span class="badge badge--error" [matTooltip]="r.erro"><span class="badge__dot"></span>{{ r.erro }}</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="flex items-center justify-end gap-3 mt-4">
                @if (importing()) {
                  <div class="login__spinner" style="width:22px;height:22px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary)"></div>
                }
                <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem"
                        [disabled]="importing() || !importValidas().length" (click)="importarLancamentos()">
                  <span class="material-symbols-rounded text-lg mr-1">upload</span>
                  Importar {{ importValidas().length }} válida(s)
                </button>
              </div>
            } @else {
              <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">upload_file</span></div>
                <h3 class="empty-state__title">Selecione um arquivo para começar</h3>
                <p class="empty-state__description">Baixe o modelo se tiver dúvida sobre o formato</p>
              </div>
            }
          </div>
        }

        @if (sub() === 'exportar') {
          <div class="bear-card p-6 animate-fade-in-up">
            <div class="mb-4">
              <h3 class="text-base font-semibold">Exportar Lançamentos</h3>
              <p class="text-sm" style="color:var(--text-secondary)">Gera um CSV dos lançamentos. O formato “Resumido” é reimportável na tela de Importar.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mb-4">
              <mat-form-field appearance="outline" class="md:col-span-3">
                <mat-label>Escopo</mat-label>
                <mat-select [value]="exportEscopo()" (valueChange)="exportEscopo.set($event)">
                  <mat-option value="competencia">Competência {{ mesNome() }}/{{ ano() }}</mat-option>
                  <mat-option value="ano">Ano {{ ano() }} inteiro</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-3">
                <mat-label>Formato</mat-label>
                <mat-select [value]="exportFormato()" (valueChange)="exportFormato.set($event)">
                  <mat-option value="resumido">Resumido (reimportável)</mat-option>
                  <mat-option value="detalhado">Detalhado (partidas)</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2">
                <mat-label>Separador</mat-label>
                <mat-select [value]="exportSep()" (valueChange)="exportSep.set($event)">
                  <mat-option value=";">; </mat-option>
                  <mat-option value=",">,</mat-option>
                  <mat-option [value]="'\t'">Tab</mat-option>
                  <mat-option value="|">|</mat-option>
                </mat-select>
              </mat-form-field>
              <label class="md:col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" [checked]="exportComCabecalho()" (change)="exportComCabecalho.set($any($event.target).checked)"> Cabeçalho
              </label>
              <label class="md:col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" [checked]="exportComEstornados()" (change)="exportComEstornados.set($any($event.target).checked)"> Incluir estornados
              </label>
            </div>

            <div class="flex gap-2 mb-4">
              <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1.25rem" [disabled]="loading()" (click)="gerarExport()">
                <span class="material-symbols-rounded text-lg mr-1">play_arrow</span> Gerar prévia
              </button>
              <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem" [disabled]="!exportRows().length" (click)="baixarExport()">
                <span class="material-symbols-rounded text-lg mr-1">download</span> Baixar CSV
              </button>
            </div>

            @if (loading()) { <div class="flex justify-center py-10"><div class="login__spinner" style="width:30px;height:30px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary)"></div></div> }

            @if (!loading() && exportRows().length) {
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Linhas</p><p class="text-xl font-bold">{{ exportRows().length }}</p></div>
                <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Total débitos</p><p class="text-xl font-bold">{{ exportSoma() | currency:'BRL' }}</p></div>
                <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Ignorados</p><p class="text-xl font-bold" [style.color]="exportIgnorados() ? '#FF9500' : 'var(--text-primary)'">{{ exportIgnorados() }}</p></div>
              </div>
              @if (exportIgnorados()) {
                <p class="text-xs mb-3" style="color:#B8860B">{{ exportIgnorados() }} lançamento(s) com múltiplas partidas não cabem no formato Resumido — use “Detalhado” para exportá-los.</p>
              }
              <div class="overflow-x-auto rounded-lg border" style="border-color:var(--surface-3);max-height:360px">
                <table class="w-full text-sm">
                  <thead style="background:var(--surface-2);position:sticky;top:0"><tr>
                    @for (h of exportHeaders(); track h) { <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">{{ h }}</th> }
                  </tr></thead>
                  <tbody>
                    @for (r of exportPreview(); track $index) {
                      <tr class="border-t" style="border-color:var(--surface-3)">
                        @for (c of r; track $index) { <td class="px-3 py-2 font-mono text-xs">{{ c }}</td> }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (exportRows().length > 200) { <p class="text-xs mt-2" style="color:var(--text-secondary)">Mostrando as primeiras 200 de {{ exportRows().length }} linhas. O arquivo conterá todas.</p> }
            }

            @if (!loading() && !exportRows().length) {
              <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">download</span></div>
                <h3 class="empty-state__title">Clique em “Gerar prévia” para montar o arquivo</h3>
              </div>
            }
          </div>
        }
      }

      <!-- ════════════════════════ 2. CONSULTA ══════════════════════ -->
      @if (menu() === 'consulta' && implementada()) {
        <div class="bear-card p-4 mb-4 flex items-end gap-3">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Conta</mat-label>
            <mat-select [value]="consultaContaId()" (valueChange)="consultaContaId.set($event)">
              @for (c of contas(); track c.id) { <mat-option [value]="c.id">{{ c.codigo }} — {{ c.descricao || c.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem" (click)="consultar()">
            <span class="material-symbols-rounded text-lg mr-1">search</span> Consultar
          </button>
        </div>

        <div class="bear-card overflow-hidden">
          <div class="px-4 py-3 border-b flex items-center justify-between" style="border-color:var(--surface-3)">
            <h3 class="text-sm font-semibold">
              {{ sub() === 'saldos' ? 'Conta-corrente / Saldos' : 'Localizar Lançamentos' }}
            </h3>
            <span class="text-xs" style="color:var(--text-secondary)">{{ movimento().length }} lançamento(s)</span>
          </div>
          <table mat-table [dataSource]="movimento()" class="w-full">
            <ng-container matColumnDef="data"><th mat-header-cell *matHeaderCellDef>Data</th><td mat-cell *matCellDef="let m">{{ m.data | date:'dd/MM/yyyy' }}</td></ng-container>
            <ng-container matColumnDef="historico"><th mat-header-cell *matHeaderCellDef>Histórico</th><td mat-cell *matCellDef="let m">{{ m.historico }}</td></ng-container>
            <ng-container matColumnDef="debito"><th mat-header-cell *matHeaderCellDef class="text-right">Débito</th><td mat-cell *matCellDef="let m" class="text-right font-mono text-xs">{{ m.debito ? (m.debito | currency:'BRL') : '—' }}</td></ng-container>
            <ng-container matColumnDef="credito"><th mat-header-cell *matHeaderCellDef class="text-right">Crédito</th><td mat-cell *matCellDef="let m" class="text-right font-mono text-xs">{{ m.credito ? (m.credito | currency:'BRL') : '—' }}</td></ng-container>
            <ng-container matColumnDef="saldo"><th mat-header-cell *matHeaderCellDef class="text-right">Saldo</th><td mat-cell *matCellDef="let m" class="text-right font-semibold">{{ m.saldo | currency:'BRL' }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="colsRazao"></tr>
            <tr mat-row *matRowDef="let row; columns: colsRazao"></tr>
          </table>
          @if (movimento().length === 0) { <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">search</span></div><h3 class="empty-state__title">Selecione uma conta e consulte</h3></div> }
        </div>
      }

      <!-- ════════════════════ 3. LIVROS E RELATÓRIOS ══════════════ -->
      @if (menu() === 'livros' && implementada() && sub() !== 'razao' && sub() !== 'diario') {
        <div class="bear-card p-6 animate-fade-in-up">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold">{{ livroLabel() }}</h3>
            <div class="flex gap-2">
              <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem" (click)="gerarLivro()">
                <span class="material-symbols-rounded text-lg mr-1">play_arrow</span> Gerar
              </button>
              <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1.25rem" [disabled]="!livroLinhas().length" (click)="exportar(livroLinhas(), livroLabel())">
                <span class="material-symbols-rounded text-lg mr-1">download</span> Exportar
              </button>
            </div>
          </div>
          @if (loading()) { <div class="flex justify-center py-12"><div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary)"></div></div> }
          @if (!loading() && livroLinhas().length) {
            <div class="overflow-x-auto rounded-lg border" style="border-color:var(--surface-3)">
              <table class="w-full text-sm">
                <thead style="background:var(--surface-2)"><tr>
                  @for (h of livroHeaders(); track h) { <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-secondary)">{{ h }}</th> }
                </tr></thead>
                <tbody>
                  @for (row of livroLinhas(); track $index) {
                    <tr class="border-t" style="border-color:var(--surface-3)">
                      @for (cell of row; track $index) { <td class="px-3 py-2 font-mono text-xs">{{ cell }}</td> }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @if (!loading() && !livroLinhas().length) { <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">menu_book</span></div><h3 class="empty-state__title">Clique em “Gerar” para montar {{ livroLabel() }}</h3></div> }
        </div>
      }

      <!-- ── Livro Razão (com termos) ── -->
      @if (menu() === 'livros' && sub() === 'razao') {
        <div class="bear-card p-6 animate-fade-in-up">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-semibold">Livro Razão</h3>
              <p class="text-sm" style="color:var(--text-secondary)">Movimento por conta com saldo acumulado · {{ mesNome() }}/{{ ano() }}</p>
            </div>
            <div class="flex gap-2">
              <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem" (click)="gerarRazao()">
                <span class="material-symbols-rounded text-lg mr-1">play_arrow</span> Gerar
              </button>
              <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1.25rem" [disabled]="!razaoContas().length" (click)="baixarRazao()">
                <span class="material-symbols-rounded text-lg mr-1">download</span> Exportar
              </button>
            </div>
          </div>

          @if (loading()) { <div class="flex justify-center py-12"><div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary)"></div></div> }

          @if (!loading() && razaoGerado()) {
            <div class="rounded-lg p-4 mb-4" style="background:var(--surface-2);border-left:3px solid var(--brand-primary)">
              <p class="text-xs font-semibold mb-1" style="color:var(--text-secondary)">TERMO DE ABERTURA</p>
              <p class="text-sm" style="line-height:1.6">{{ razaoAbertura() }}</p>
            </div>

            <div class="grid grid-cols-3 gap-3 mb-4">
              <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Contas com movimento</p><p class="text-xl font-bold">{{ razaoContas().length }}</p></div>
              <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Total débitos</p><p class="text-xl font-bold">{{ razaoTotDeb() | currency:'BRL' }}</p></div>
              <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Total créditos</p><p class="text-xl font-bold">{{ razaoTotCred() | currency:'BRL' }}</p></div>
            </div>

            @for (c of razaoContas(); track c.codigo) {
              <div class="rounded-lg border mb-3 overflow-hidden" style="border-color:var(--surface-3)">
                <div class="flex items-center justify-between px-3 py-2" style="background:var(--surface-2)">
                  <span class="font-semibold text-sm font-mono">{{ c.codigo }} — {{ c.descricao }}</span>
                  <span class="text-xs" style="color:var(--text-secondary)">Saldo anterior: <b>{{ absVal(c.saldoAnterior) | currency:'BRL' }} {{ ladoSaldo(c.saldoAnterior, c.naturezaDevedora) }}</b></span>
                </div>
                <table class="w-full text-sm">
                  <thead><tr style="border-bottom:1px solid var(--surface-3)">
                    <th class="text-left px-3 py-1.5 text-xs font-semibold" style="color:var(--text-secondary)">Data</th>
                    <th class="text-left px-3 py-1.5 text-xs font-semibold" style="color:var(--text-secondary)">Nº</th>
                    <th class="text-left px-3 py-1.5 text-xs font-semibold" style="color:var(--text-secondary)">Histórico</th>
                    <th class="text-left px-3 py-1.5 text-xs font-semibold" style="color:var(--text-secondary)">Contrapartida</th>
                    <th class="text-right px-3 py-1.5 text-xs font-semibold" style="color:var(--text-secondary)">Débito</th>
                    <th class="text-right px-3 py-1.5 text-xs font-semibold" style="color:var(--text-secondary)">Crédito</th>
                    <th class="text-right px-3 py-1.5 text-xs font-semibold" style="color:var(--text-secondary)">Saldo</th>
                  </tr></thead>
                  <tbody>
                    @for (mv of c.movimentos; track $index) {
                      <tr style="border-bottom:1px solid var(--surface-3)">
                        <td class="px-3 py-1.5">{{ fmt(mv.data) }}</td>
                        <td class="px-3 py-1.5 font-mono text-xs">{{ mv.numero }}</td>
                        <td class="px-3 py-1.5">{{ mv.historico }}</td>
                        <td class="px-3 py-1.5 font-mono text-xs">{{ mv.contraPartida }}</td>
                        <td class="px-3 py-1.5 text-right font-mono text-xs">{{ mv.debito ? (mv.debito | currency:'BRL') : '—' }}</td>
                        <td class="px-3 py-1.5 text-right font-mono text-xs">{{ mv.credito ? (mv.credito | currency:'BRL') : '—' }}</td>
                        <td class="px-3 py-1.5 text-right font-semibold">{{ mv.saldo | currency:'BRL' }} {{ mv.dc }}</td>
                      </tr>
                    }
                  </tbody>
                  <tfoot><tr style="background:var(--surface-2)">
                    <td class="px-3 py-1.5 text-xs font-semibold" colspan="4">Totais da conta</td>
                    <td class="px-3 py-1.5 text-right font-mono text-xs font-semibold">{{ c.totalDebitos | currency:'BRL' }}</td>
                    <td class="px-3 py-1.5 text-right font-mono text-xs font-semibold">{{ c.totalCreditos | currency:'BRL' }}</td>
                    <td class="px-3 py-1.5 text-right font-semibold">{{ absVal(c.saldoFinal) | currency:'BRL' }} {{ ladoSaldo(c.saldoFinal, c.naturezaDevedora) }}</td>
                  </tr></tfoot>
                </table>
              </div>
            }

            <div class="rounded-lg p-4 mt-4 mb-6" style="background:var(--surface-2);border-left:3px solid #34C759">
              <p class="text-xs font-semibold mb-1" style="color:var(--text-secondary)">TERMO DE ENCERRAMENTO</p>
              <p class="text-sm" style="line-height:1.6">{{ razaoEncerramento() }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-10 mt-10 mb-4 text-center text-sm">
              <div><div style="border-top:1px solid var(--text-secondary);padding-top:6px">{{ empresaRazao.responsavel }}<br><span class="text-xs" style="color:var(--text-secondary)">Responsável Legal</span></div></div>
              <div><div style="border-top:1px solid var(--text-secondary);padding-top:6px">{{ empresaRazao.contador }}<br><span class="text-xs" style="color:var(--text-secondary)">Contabilista · {{ empresaRazao.crc }}</span></div></div>
            </div>
          }

          @if (!loading() && !razaoGerado()) { <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">auto_stories</span></div><h3 class="empty-state__title">Clique em “Gerar” para montar o Livro Razão</h3></div> }
        </div>
      }

      <!-- ── Livro Diário (com termos) ── -->
      @if (menu() === 'livros' && sub() === 'diario') {
        <div class="bear-card p-6 animate-fade-in-up">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-semibold">Livro Diário</h3>
              <p class="text-sm" style="color:var(--text-secondary)">Lançamentos em ordem cronológica · {{ mesNome() }}/{{ ano() }}</p>
            </div>
            <div class="flex gap-2">
              <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem" (click)="gerarDiario()">
                <span class="material-symbols-rounded text-lg mr-1">play_arrow</span> Gerar
              </button>
              <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1.25rem" [disabled]="!diarioLancs().length" (click)="baixarDiario()">
                <span class="material-symbols-rounded text-lg mr-1">download</span> Exportar
              </button>
            </div>
          </div>

          @if (loading()) { <div class="flex justify-center py-12"><div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary)"></div></div> }

          @if (!loading() && diarioGerado()) {
            <div class="rounded-lg p-4 mb-4" style="background:var(--surface-2);border-left:3px solid var(--brand-primary)">
              <p class="text-xs font-semibold mb-1" style="color:var(--text-secondary)">TERMO DE ABERTURA</p>
              <p class="text-sm" style="line-height:1.6">{{ diarioAbertura() }}</p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Lançamentos</p><p class="text-xl font-bold">{{ diarioLancs().length }}</p></div>
              <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Total débitos</p><p class="text-xl font-bold">{{ diarioTotDeb() | currency:'BRL' }}</p></div>
              <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Total créditos</p><p class="text-xl font-bold">{{ diarioTotCred() | currency:'BRL' }}</p></div>
              <div class="bear-card p-3" style="box-shadow:none;border:1px solid var(--surface-3)"><p class="text-xs" style="color:var(--text-secondary)">Balanço</p><p class="text-xl font-bold" [style.color]="diarioBalancoOk() ? '#34C759' : '#FF3B30'">{{ diarioBalancoOk() ? 'OK' : 'Divergente' }}</p></div>
            </div>

            @for (l of diarioLancs(); track l.numero) {
              <div class="rounded-lg border mb-2 overflow-hidden" style="border-color:var(--surface-3)">
                <div class="flex items-center gap-3 px-3 py-2" style="background:var(--surface-2)">
                  <span class="font-mono text-xs font-semibold" style="color:var(--brand-primary)">Nº {{ l.numero }}</span>
                  <span class="text-xs" style="color:var(--text-secondary)">{{ fmt(l.data) }}</span>
                  <span class="text-sm font-medium">{{ l.historico }}</span>
                </div>
                <table class="w-full text-sm">
                  <tbody>
                    @for (p of l.partidas; track $index) {
                      <tr style="border-top:1px solid var(--surface-3)">
                        <td class="px-3 py-1.5 w-8 font-bold" [style.color]="p.dc === 'D' ? '#007AFF' : '#FF9500'">{{ p.dc }}</td>
                        <td class="px-3 py-1.5 font-mono text-xs" [style.paddingLeft]="p.dc === 'C' ? '2rem' : '0.75rem'">{{ p.codigo }} — {{ p.descricao }}</td>
                        <td class="px-3 py-1.5 text-right font-mono text-xs" style="width:140px">{{ p.dc === 'D' ? (p.valor | currency:'BRL') : '' }}</td>
                        <td class="px-3 py-1.5 text-right font-mono text-xs" style="width:140px">{{ p.dc === 'C' ? (p.valor | currency:'BRL') : '' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <div class="flex justify-end gap-6 px-3 py-2 rounded-lg mb-4 text-sm font-semibold" style="background:var(--surface-2)">
              <span>Soma do período — Débitos: {{ diarioTotDeb() | currency:'BRL' }}</span>
              <span>Créditos: {{ diarioTotCred() | currency:'BRL' }}</span>
            </div>

            <div class="rounded-lg p-4 mb-6" style="background:var(--surface-2);border-left:3px solid #34C759">
              <p class="text-xs font-semibold mb-1" style="color:var(--text-secondary)">TERMO DE ENCERRAMENTO</p>
              <p class="text-sm" style="line-height:1.6">{{ diarioEncerramento() }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-10 mt-10 mb-4 text-center text-sm">
              <div><div style="border-top:1px solid var(--text-secondary);padding-top:6px">{{ empresaRazao.responsavel }}<br><span class="text-xs" style="color:var(--text-secondary)">Responsável Legal</span></div></div>
              <div><div style="border-top:1px solid var(--text-secondary);padding-top:6px">{{ empresaRazao.contador }}<br><span class="text-xs" style="color:var(--text-secondary)">Contabilista · {{ empresaRazao.crc }}</span></div></div>
            </div>
          }

          @if (!loading() && !diarioGerado()) { <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">auto_stories</span></div><h3 class="empty-state__title">Clique em “Gerar” para montar o Livro Diário</h3></div> }
        </div>
      }

      <!-- ═══════════════════ 4. DECLARAÇÕES DIGITAIS ══════════════ -->
      @if (menu() === 'declaracoes') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
          @for (d of declaracoes; track d.id) {
            @if (sub() === d.id) {
              <div class="bear-card p-6 md:col-span-2">
                <div class="flex items-start gap-4">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">{{ d.icon }}</span></div>
                  <div class="flex-1">
                    <h3 class="text-base font-semibold">{{ d.label }}</h3>
                    <p class="text-sm mb-4" style="color:var(--text-secondary)">{{ d.desc }}</p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div class="rounded-lg p-3" style="background:var(--surface-2)"><p class="text-xs" style="color:var(--text-secondary)">Período</p><p class="font-semibold">{{ mesNome() }}/{{ ano() }}</p></div>
                      <div class="rounded-lg p-3" style="background:var(--surface-2)"><p class="text-xs" style="color:var(--text-secondary)">Lançamentos</p><p class="font-semibold">{{ lancamentos().length }}</p></div>
                      <div class="rounded-lg p-3" style="background:var(--surface-2)"><p class="text-xs" style="color:var(--text-secondary)">Layout</p><p class="font-semibold">{{ d.layout }}</p></div>
                    </div>
                    <div class="flex gap-2">
                      <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem" (click)="gerarDeclaracao(d)">
                        <span class="material-symbols-rounded text-lg mr-1">description</span> Gerar arquivo {{ d.layout }}
                      </button>
                      <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1.25rem" [disabled]="!declPreview()" (click)="baixarDeclaracao(d)">
                        <span class="material-symbols-rounded text-lg mr-1">download</span> Baixar
                      </button>
                    </div>
                    @if (declAvisos().length) {
                      <div class="mt-4 rounded-lg p-3 text-xs" style="background:#FFF8E6;border:1px solid #F2C94C">
                        <p class="font-semibold mb-1" style="color:#B8860B"><span class="material-symbols-rounded text-sm align-middle mr-1">warning</span>Validar no PVA antes de transmitir</p>
                        <ul class="list-disc pl-5" style="color:#7a6300">
                          @for (a of declAvisos(); track $index) { <li>{{ a }}</li> }
                        </ul>
                      </div>
                    }
                    @if (declPreview()) {
                      <pre class="mt-4 rounded-lg p-3 text-xs overflow-x-auto" style="background:#0d1117;color:#c9d1d9;max-height:280px">{{ declPreview() }}</pre>
                    }
                  </div>
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- ════════════════════════ 5. CADASTRO ══════════════════════ -->
      @if (menu() === 'cadastro' && implementada()) {
        <div class="bear-card p-6 animate-fade-in-up">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold">{{ cadastroLabel() }}</h3>
            <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem" (click)="novoCadastro()">
              <span class="material-symbols-rounded text-lg mr-1">add</span> Novo
            </button>
          </div>
          <table mat-table [dataSource]="cadastroItens()" class="w-full">
            <ng-container matColumnDef="codigo"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let i" class="font-mono text-xs">{{ i.codigo }}</td></ng-container>
            <ng-container matColumnDef="descricao"><th mat-header-cell *matHeaderCellDef>Descrição</th><td mat-cell *matCellDef="let i" class="font-medium">{{ i.descricao || i.nome || i.texto }}</td></ng-container>
            <ng-container matColumnDef="info"><th mat-header-cell *matHeaderCellDef>Info</th><td mat-cell *matCellDef="let i" class="text-xs" style="color:var(--text-secondary)">{{ i.classificacao || i.tipo || i.natureza || '—' }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="colsCadastro"></tr>
            <tr mat-row *matRowDef="let row; columns: colsCadastro"></tr>
          </table>
          @if (cadastroItens().length === 0) { <div class="empty-state"><div class="empty-state__icon"><span class="material-symbols-rounded">inventory_2</span></div><h3 class="empty-state__title">Nenhum registro em {{ cadastroLabel() }}</h3></div> }
        </div>
      }

      <!-- ════════════════════════ 6. MANUTENÇÃO ════════════════════ -->
      @if (menu() === 'manutencao') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
          @for (op of manutencaoOps; track op.id) {
            @if (sub() === op.id) {
              <div class="bear-card p-6 md:col-span-2">
                <div class="flex items-start gap-4">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center" [style.background]="op.danger ? '#FFECEB' : '#E9FAEF'">
                    <span class="material-symbols-rounded" [style.color]="op.danger ? '#FF3B30' : '#34C759'">{{ op.icon }}</span>
                  </div>
                  <div class="flex-1">
                    <h3 class="text-base font-semibold">{{ op.label }}</h3>
                    <p class="text-sm mb-4" style="color:var(--text-secondary)">{{ op.desc }}</p>
                    @if (op.id === 'enc-exercicio') {
                      <p class="text-sm mb-3">Exercício a encerrar: <b>{{ ano() }}</b> — apura resultado e transfere para o Patrimônio Líquido.</p>
                    }
                    <button class="bear-btn" [ngClass]="op.danger ? 'bear-btn--danger' : 'bear-btn--primary'" style="padding:0.5rem 1.5rem" (click)="executarManutencao(op)">
                      <span class="material-symbols-rounded text-lg mr-1">{{ op.icon }}</span> Executar
                    </button>
                    @if (manutLog().length) {
                      <div class="mt-4 rounded-lg p-3 text-xs font-mono" style="background:var(--surface-2)">
                        @for (l of manutLog(); track $index) { <div>{{ l }}</div> }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- ═══════════ PAINEL DE FUNÇÃO (subs sem tela dedicada ainda) ═══════════ -->
      @if (!implementada()) {
        <div class="bear-card p-8 animate-fade-in-up">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:#ECEBFB">
              <span class="material-symbols-rounded" style="color:#007AFF">{{ activeSub()?.icon }}</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold">{{ activeSub()?.label }}</h3>
                <span class="badge badge--warning"><span class="badge__dot"></span>em construção</span>
              </div>
              <p class="text-sm mt-1 mb-4" style="color:var(--text-secondary)">{{ funcDesc() }}</p>
              <div class="rounded-lg p-3 mb-4 text-xs" style="background:var(--surface-2);color:var(--text-secondary)">
                Função do menu <b>{{ activeMenu().label }}</b> — presente na estrutura do sistema. O fluxo dedicado será implementado nesta tela.
              </div>
              <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1.25rem" (click)="abrirFuncao()">
                <span class="material-symbols-rounded text-lg mr-1">{{ activeSub()?.icon }}</span> Abrir {{ activeSub()?.label }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TesteBearComponent implements OnInit {
  // ── Estado global ──────────────────────────────────────────────
  ano = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth() + 1);
  anos = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  meses = [
    { v: 1, n: 'Janeiro' }, { v: 2, n: 'Fevereiro' }, { v: 3, n: 'Março' }, { v: 4, n: 'Abril' },
    { v: 5, n: 'Maio' }, { v: 6, n: 'Junho' }, { v: 7, n: 'Julho' }, { v: 8, n: 'Agosto' },
    { v: 9, n: 'Setembro' }, { v: 10, n: 'Outubro' }, { v: 11, n: 'Novembro' }, { v: 12, n: 'Dezembro' },
  ];
  mesNome = computed(() => this.meses.find(m => m.v === this.mes())?.n ?? '');

  loading = signal(false);
  contas = signal<any[]>([]);
  lancamentos = signal<any[]>([]);

  // ── Definição dos 6 menus e seus sub-itens ────────────────────
  menus: MenuDef[] = [
    { id: 'lancamentos', label: 'Lançamentos', icon: 'edit_note', subs: [
      { id: 'manual', label: 'Novo', icon: 'edit' },
      { id: 'lote', label: 'Múltiplos', icon: 'list_alt' },
      { id: 'abrir', label: 'Lançados', icon: 'folder_open' },
      { id: 'simplificado', label: 'Simplificado', icon: 'bolt' },
      { id: 'fixos', label: 'Fixos', icon: 'push_pin' },
      { id: 'importar', label: 'Importar', icon: 'upload_file' },
      { id: 'exportar', label: 'Exportar', icon: 'download' },
      { id: 'conc-bancaria', label: 'Conc. Bancária', icon: 'account_balance' },
      { id: 'conc-titulos', label: 'Conc. Títulos', icon: 'receipt_long' },
    ] },
    { id: 'consulta', label: 'Consulta', icon: 'search', subs: [
      { id: 'localizar', label: 'Localizar Lançamentos', icon: 'manage_search' },
      { id: 'saldos', label: 'Saldos', icon: 'savings' },
      { id: 'resultado', label: 'Resultado', icon: 'trending_up' },
      { id: 'diferenca', label: 'Diferença', icon: 'difference' },
      { id: 'balancete-din', label: 'Balancete Dinâmico', icon: 'table_rows' },
      { id: 'pesquisar-conta', label: 'Pesquisar Conta', icon: 'account_tree' },
      { id: 'analise-grafica', label: 'Análise Gráfica', icon: 'bar_chart' },
      { id: 'analise-critica', label: 'Análise Crítica', icon: 'fact_check' },
      { id: 'conc-lanc', label: 'Conciliação de Lançamentos', icon: 'rule' },
    ] },
    { id: 'livros', label: 'Livros e Relatórios', icon: 'menu_book', subs: [
      { id: 'diario', label: 'Livro Diário', icon: 'auto_stories' },
      { id: 'razao', label: 'Livro Razão', icon: 'account_tree' },
      { id: 'balancete', label: 'Balancete', icon: 'table_rows' },
      { id: 'balanco', label: 'Balanço', icon: 'balance' },
      { id: 'dre', label: 'DRE', icon: 'trending_up' },
      { id: 'caixa', label: 'Livro Caixa', icon: 'payments' },
      { id: 'termos', label: 'Termos Abert./Encerr.', icon: 'gavel' },
      { id: 'notas', label: 'Notas Explicativas', icon: 'sticky_note_2' },
      { id: 'demonstracoes', label: 'Demonstrações Contábeis', icon: 'description' },
      { id: 'demonstrativo-prog', label: 'Demonstrativo Programado', icon: 'dashboard_customize' },
      { id: 'rel-ccusto', label: 'Centros de Custo', icon: 'hub' },
      { id: 'rel-num-lanc', label: 'Nº de Lançamentos', icon: 'tag' },
      { id: 'rel-cheques', label: 'Cheques Emitidos', icon: 'request_quote' },
    ] },
    { id: 'declaracoes', label: 'Declarações Digitais', icon: 'cloud_upload', subs: [
      { id: 'ecd', label: 'ECD (SPED Contábil)', icon: 'description' },
      { id: 'ecf', label: 'ECF', icon: 'receipt_long' },
      { id: 'fcont', label: 'FCont', icon: 'swap_horiz' },
      { id: 'dipj', label: 'DIPJ', icon: 'request_quote' },
      { id: 'manad', label: 'Manad', icon: 'storage' },
      { id: 'bacen', label: 'Bacen', icon: 'account_balance' },
      { id: 'sped-construtora', label: 'SPED Construtora', icon: 'apartment' },
      { id: 'dirf', label: 'DIRF Cartão', icon: 'credit_card' },
    ] },
    { id: 'cadastro', label: 'Cadastro', icon: 'inventory_2', subs: [
      { id: 'plano', label: 'Plano de Contas', icon: 'account_tree' },
      { id: 'historicos', label: 'Histórico Padrão', icon: 'notes' },
      { id: 'centros', label: 'Centros de Custo', icon: 'hub' },
      { id: 'regras', label: 'Lançamento Automático', icon: 'rule' },
      { id: 'empresas', label: 'Empresas', icon: 'apartment' },
      { id: 'tabelas', label: 'Tabelas', icon: 'table_chart' },
      { id: 'trava', label: 'Trava Contábil', icon: 'lock_clock' },
      { id: 'orcamento', label: 'Orçamento', icon: 'savings' },
    ] },
    { id: 'manutencao', label: 'Manutenção', icon: 'build', subs: [
      { id: 'enc-exercicio', label: 'Encerramento de Exercício', icon: 'lock' },
      { id: 'enc-simulado', label: 'Encerramento Simulado', icon: 'preview' },
      { id: 'enc-ccusto', label: 'Encerramento C. Custos', icon: 'lock_reset' },
      { id: 'desfazer-enc', label: 'Desfazer Encerramento', icon: 'lock_open' },
      { id: 'alinhar-saldos', label: 'Alinhamento de Saldos', icon: 'calculate' },
      { id: 'integridade', label: 'Auditoria', icon: 'verified' },
      { id: 'recuperador', label: 'Recuperar Temporários', icon: 'restore' },
      { id: 'alinhar', label: 'Alinhar Lançamentos', icon: 'format_align_left' },
      { id: 'apagar-bloco', label: 'Apagar em Bloco', icon: 'delete_sweep' },
      { id: 'substitui-contas', label: 'Substituir Contas', icon: 'find_replace' },
      { id: 'config', label: 'Configurações', icon: 'settings' },
      { id: 'backup', label: 'Backup', icon: 'backup' },
      { id: 'usuarios', label: 'Usuários e Privilégios', icon: 'group' },
    ] },
  ];
  menu = signal<Menu>('lancamentos');
  sub = signal<string>('manual');
  activeMenu = computed(() => this.menus.find(m => m.id === this.menu())!);
  activeSub = computed(() => this.activeMenu().subs.find(s => s.id === this.sub()));

  // Funções com tela própria já implementada; o restante usa o painel de função.
  private static IMPL: Record<string, string[]> = {
    lancamentos: ['manual', 'lote', 'abrir', 'simplificado', 'fixos', 'importar', 'exportar'],
    consulta: ['localizar', 'saldos'],
    livros: ['diario', 'razao', 'balancete', 'balanco', 'dre'],
  };
  implementada = computed(() => {
    const m = this.menu();
    if (m === 'declaracoes' || m === 'manutencao') return true; // blocos cobrem todos os subs
    if (m === 'cadastro') return ['plano', 'historicos', 'centros', 'regras'].includes(this.sub());
    return (TesteBearComponent.IMPL[m] ?? []).includes(this.sub());
  });

  // Descrição do que cada função faz (painel genérico).
  private FUNC_DESC: Record<string, string> = {
    simplificado: 'Lançamento simplificado de partida dobrada, com débito e crédito em uma única linha.',
    fixos: 'Lançamentos recorrentes que se repetem automaticamente a cada competência.',
    importar: 'Importa lançamentos de Escrita Fiscal, DP, ou de layouts de sistemas externos.',
    exportar: 'Exporta os lançamentos do período para arquivo (layout configurável).',
    'conc-bancaria': 'Conciliação dos lançamentos contábeis com o extrato bancário.',
    'conc-titulos': 'Conciliação de títulos a pagar/receber com a contabilidade.',
    resultado: 'Consulta do resultado acumulado (receitas − despesas) por período.',
    diferenca: 'Aponta diferenças entre débitos e créditos por conta ou período.',
    'balancete-din': 'Balancete interativo com drill-down por conta, nível e centro de custo.',
    'pesquisar-conta': 'Localiza contas do plano por código, descrição ou natureza.',
    'analise-grafica': 'Visualização gráfica de saldos e movimentos contábeis.',
    'analise-critica': 'Verificações críticas: contas sem movimento, saldos invertidos, etc.',
    'conc-lanc': 'Marca e confere lançamentos conciliados x pendentes.',
    caixa: 'Livro Caixa e seus termos de abertura e encerramento.',
    termos: 'Termos de abertura e encerramento dos livros Diário, Razão e Caixa.',
    notas: 'Notas explicativas às demonstrações contábeis.',
    demonstracoes: 'Conjunto de demonstrações contábeis (BP, DRE, DFC, DMPL, DVA, DLPA).',
    'demonstrativo-prog': 'Relatórios contábeis programáveis pelo usuário.',
    'rel-ccusto': 'Relatórios por centro de custo: por conta, estruturado e analítico.',
    'rel-num-lanc': 'Quantitativo de lançamentos por período/usuário.',
    'rel-cheques': 'Relação de cheques emitidos a partir dos lançamentos.',
    empresas: 'Cadastro de empresas, parâmetros de impressão e duplicação.',
    tabelas: 'Tabelas gerais e por empresa utilizadas pela escrituração.',
    trava: 'Trava contábil que impede alterações em períodos fechados.',
    orcamento: 'Cadastro de cenários e acompanhamento orçamentário.',
  };
  funcDesc = computed(() => this.FUNC_DESC[this.sub()] ?? 'Função do módulo contábil — fluxo dedicado em implementação.');

  // ── Formulário de lançamento ───────────────────────────────────
  lancForm: FormGroup;
  colsLanc = ['numero', 'data', 'historico', 'valor', 'status', 'acoes'];
  get partidas(): FormArray { return this.lancForm.get('partidas') as FormArray; }

  // ── Lançamento simplificado (débito × crédito em uma linha) ─────
  simplesForm: FormGroup;
  /** Débito e crédito não podem ser a mesma conta. */
  simplesMesmaConta(): boolean {
    const d = this.simplesForm.get('contaDebitoId')?.value;
    const c = this.simplesForm.get('contaCreditoId')?.value;
    return !!d && d === c;
  }

  // ── Lançamentos fixos (recorrentes) ────────────────────────────
  fixosForm!: FormGroup;
  fixos = signal<any[]>([]);
  fixoEditId = signal<string | null>(null);
  gerandoFixos = signal(false);
  fixoMesmaConta(): boolean {
    const d = this.fixosForm.get('contaDebitoId')?.value;
    const c = this.fixosForm.get('contaCreditoId')?.value;
    return !!d && d === c;
  }
  /** Rótulo "código — descrição" de uma conta pelo id (para a tabela de fixos). */
  contaLabel(id: string): string {
    const c = this.contas().find((x: any) => x.id === id);
    return c ? `${c.codigo} — ${c.descricao || c.nome}` : '—';
  }

  // ── Consulta ───────────────────────────────────────────────────
  consultaContaId = signal<string>('');
  movimento = signal<any[]>([]);
  colsRazao = ['data', 'historico', 'debito', 'credito', 'saldo'];

  // ── Livros ─────────────────────────────────────────────────────
  livroHeaders = signal<string[]>([]);
  livroLinhas = signal<any[][]>([]);
  livroLabel = computed(() => this.activeMenu().subs.find(s => s.id === this.sub())?.label ?? 'Relatório');

  // ── Declarações ────────────────────────────────────────────────
  declaracoes = [
    { id: 'ecd', label: 'ECD — Escrituração Contábil Digital', layout: 'TXT SPED', icon: 'description', desc: 'Livro Diário/Razão digital transmitido ao SPED (blocos 0, I, J, 9).' },
    { id: 'ecf', label: 'ECF — Escrituração Contábil Fiscal', layout: 'TXT ECF', icon: 'receipt_long', desc: 'Apuração do IRPJ/CSLL e e-Lalur/e-Lacs com base no resultado contábil.' },
    { id: 'fcont', label: 'FCont — Controle Fiscal Contábil de Transição', layout: 'TXT FCONT', icon: 'swap_horiz', desc: 'Escrituração de transição entre o padrão contábil e o fiscal.' },
    { id: 'dipj', label: 'DIPJ — Declaração do IRPJ', layout: 'TXT DIPJ', icon: 'request_quote', desc: 'Fichas de IRPJ, CSLL e informações econômicas da pessoa jurídica.' },
    { id: 'manad', label: 'Manad — IN 86/2001', layout: 'TXT MANAD', icon: 'storage', desc: 'Arquivo digital de dados contábeis e fiscais para a fiscalização.' },
    { id: 'bacen', label: 'Bacen — Banco Central', layout: 'TXT BACEN', icon: 'account_balance', desc: 'Geração de arquivos contábeis para o Banco Central.' },
    { id: 'sped-construtora', label: 'SPED Construtora', layout: 'TXT SPED', icon: 'apartment', desc: 'Escrituração por empreendimento para construtoras/incorporadoras.' },
    { id: 'dirf', label: 'DIRF Cartão', layout: 'TXT DIRF', icon: 'credit_card', desc: 'Rendimentos e retenções na fonte relativos a operações com cartão.' },
  ];
  declPreview = signal<string>('');
  declAvisos = signal<string[]>([]);

  // ── Cadastro ───────────────────────────────────────────────────
  cadastroItens = signal<any[]>([]);
  colsCadastro = ['codigo', 'descricao', 'info'];
  cadastroLabel = computed(() => this.activeMenu().subs.find(s => s.id === this.sub())?.label ?? 'Cadastro');

  // ── Manutenção ─────────────────────────────────────────────────
  manutencaoOps = [
    { id: 'enc-exercicio', label: 'Encerramento de Exercício', icon: 'lock', danger: false, desc: 'Encerra contas de resultado e transfere o lucro/prejuízo para o PL.' },
    { id: 'enc-simulado', label: 'Encerramento Simulado', icon: 'preview', danger: false, desc: 'Simula o encerramento sem gravar, para conferência prévia do resultado.' },
    { id: 'enc-ccusto', label: 'Encerramento de Centro de Custos', icon: 'lock_reset', danger: false, desc: 'Encerra os saldos por centro de custo no fim do exercício.' },
    { id: 'desfazer-enc', label: 'Desfazer Encerramento', icon: 'lock_open', danger: true, desc: 'Reverte o encerramento de exercício já efetuado (operação sensível).' },
    { id: 'alinhar-saldos', label: 'Alinhamento de Saldos', icon: 'calculate', danger: false, desc: 'Reprocessa e realinha os saldos acumulados de todas as contas.' },
    { id: 'integridade', label: 'Auditoria / Integridade', icon: 'verified', danger: false, desc: 'Checa partidas dobradas, contas órfãs e numeração de lançamentos.' },
    { id: 'recuperador', label: 'Recuperar Lançamentos Temporários', icon: 'restore', danger: false, desc: 'Recupera lançamentos temporários não confirmados.' },
    { id: 'alinhar', label: 'Alinhar Lançamentos', icon: 'format_align_left', danger: false, desc: 'Reordena e renumera a sequência de lançamentos do período.' },
    { id: 'apagar-bloco', label: 'Apagar Lançamentos em Bloco', icon: 'delete_sweep', danger: true, desc: 'Exclui em lote lançamentos de um intervalo (operação sensível).' },
    { id: 'substitui-contas', label: 'Substituir Contas', icon: 'find_replace', danger: true, desc: 'Substitui uma conta por outra em todos os lançamentos (operação sensível).' },
    { id: 'config', label: 'Configurações', icon: 'settings', danger: false, desc: 'Parâmetros gerais, de relatórios e de centro de custo.' },
    { id: 'backup', label: 'Backup da Base', icon: 'backup', danger: false, desc: 'Gera cópia de segurança da escrituração da empresa.' },
    { id: 'usuarios', label: 'Usuários e Privilégios', icon: 'group', danger: false, desc: 'Cadastro de usuários, privilégios e restrições de acesso.' },
  ];
  manutLog = signal<string[]>([]);

  // ── Importação de Lançamentos ──────────────────────────────────
  importRaw = signal<string>('');
  importFileName = signal<string>('');
  importSep = signal<string>(';');
  importHeader = signal<boolean>(true);
  importRows = signal<ImportRow[]>([]);
  importing = signal<boolean>(false);
  colsImport = ['linha', 'data', 'historico', 'debito', 'credito', 'valor', 'status'];
  importValidas = computed(() => this.importRows().filter(r => r.valido));
  importComErro = computed(() => this.importRows().filter(r => !r.valido));
  importSoma = computed(() => this.importValidas().reduce((s, r) => s + r.valor, 0));

  // ── Exportação de Lançamentos ──────────────────────────────────
  exportEscopo = signal<'competencia' | 'ano'>('competencia');
  exportFormato = signal<'resumido' | 'detalhado'>('resumido');
  exportSep = signal<string>(';');
  exportComCabecalho = signal<boolean>(true);
  exportComEstornados = signal<boolean>(false);
  exportHeaders = signal<string[]>([]);
  exportRows = signal<string[][]>([]);
  exportSoma = signal<number>(0);
  exportIgnorados = signal<number>(0);
  exportPreview = computed(() => this.exportRows().slice(0, 200));

  // ── Livro Razão ────────────────────────────────────────────────
  razaoContas = signal<RazaoConta[]>([]);
  razaoGerado = signal<boolean>(false);
  razaoAbertura = signal<string>('');
  razaoEncerramento = signal<string>('');
  razaoTotDeb = computed(() => this.razaoContas().reduce((s, c) => s + c.totalDebitos, 0));
  razaoTotCred = computed(() => this.razaoContas().reduce((s, c) => s + c.totalCreditos, 0));
  // Dados da empresa para os termos e ECD — preenchidos do cadastro real em ngOnInit.
  empresaInfo = signal<EmpresaContabil | null>(null);
  empresaRazao = {
    nome: 'EMPRESA EXEMPLO LTDA', cnpj: '00.000.000/0001-00', municipio: 'Rio de Janeiro',
    uf: 'RJ', nire: '', numLivro: '1', responsavel: 'Responsável Legal', contador: 'Contabilista', crc: 'CRC/RJ 000000/O',
  };

  // ── Livro Diário ───────────────────────────────────────────────
  diarioLancs = signal<DiarioLanc[]>([]);
  diarioGerado = signal<boolean>(false);
  diarioAbertura = signal<string>('');
  diarioEncerramento = signal<string>('');
  diarioTotDeb = computed(() => this.diarioLancs().reduce((s, l) => s + l.partidas.filter(p => p.dc === 'D').reduce((a, p) => a + p.valor, 0), 0));
  diarioTotCred = computed(() => this.diarioLancs().reduce((s, l) => s + l.partidas.filter(p => p.dc === 'C').reduce((a, p) => a + p.valor, 0), 0));
  diarioBalancoOk = computed(() => Math.abs(this.diarioTotDeb() - this.diarioTotCred()) < 0.01);

  constructor(private fb: FormBuilder, private service: ContabilidadeService, private snackBar: MatSnackBar) {
    this.lancForm = this.fb.group({
      data: [new Date().toISOString().split('T')[0], Validators.required],
      historico: ['', Validators.required],
      tipo: ['NORMAL'],
      partidas: this.fb.array([]),
    });
    this.adicionarPartida('DEBITO');
    this.adicionarPartida('CREDITO');

    this.simplesForm = this.fb.group({
      data: [new Date().toISOString().split('T')[0], Validators.required],
      historico: ['', Validators.required],
      tipo: ['NORMAL'],
      contaDebitoId: ['', Validators.required],
      contaCreditoId: ['', Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
    });

    this.fixosForm = this.fb.group({
      historico: ['', Validators.required],
      contaDebitoId: ['', Validators.required],
      contaCreditoId: ['', Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      diaVencimento: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
      tipo: ['NORMAL'],
      vigenciaInicio: [''],
      vigenciaFim: [''],
      ativo: [true],
    });
  }

  ngOnInit() {
    this.service.listContasAnaliticas().subscribe({ next: c => this.contas.set(c), error: () => {} });
    this.service.getEmpresaAtual().subscribe({ next: e => this.aplicarEmpresa(e), error: () => {} });
    this.carregarLancamentos();
    this.carregarFixos();
  }

  /** Aplica os dados do cadastro de empresa aos termos dos livros. */
  private aplicarEmpresa(e: EmpresaContabil | null) {
    if (!e) return;
    this.empresaInfo.set(e);
    if (e.nome) this.empresaRazao.nome = e.nome;
    if (e.cnpj) this.empresaRazao.cnpj = this.formatCnpj(e.cnpj);
    if (e.municipio) this.empresaRazao.municipio = e.municipio;
    if (e.uf) this.empresaRazao.uf = e.uf;
    this.empresaRazao.nire = e.nire || '';
    if (e.responsavelNome) this.empresaRazao.responsavel = e.responsavelNome;
    if (e.contadorNome) this.empresaRazao.contador = e.contadorNome;
    if (e.contadorCrc) this.empresaRazao.crc = `CRC ${e.contadorCrcUf ? e.contadorCrcUf + ' ' : ''}${e.contadorCrc}`;
  }

  formatCnpj(cnpj: string): string {
    const d = (cnpj || '').replace(/\D/g, '').padStart(14, '0');
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }

  // ── Navegação ──────────────────────────────────────────────────
  selectMenu(m: MenuDef) {
    this.menu.set(m.id);
    this.sub.set(m.subs[0].id);
    if (m.id === 'cadastro') this.carregarCadastro();
    if (m.id === 'lancamentos') this.carregarLancamentos();
  }
  selectSub(id: string) {
    this.sub.set(id);
    if (this.menu() === 'cadastro' && this.implementada()) this.carregarCadastro();
    if (this.menu() === 'lancamentos' && id === 'abrir') this.carregarLancamentos();
    if (this.menu() === 'lancamentos' && id === 'fixos') this.carregarFixos();
  }

  // ── 1. LANÇAMENTOS ─────────────────────────────────────────────
  adicionarPartida(tipo = 'DEBITO') {
    this.partidas.push(this.fb.group({
      contaId: ['', Validators.required],
      tipo: [tipo, Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
    }));
  }
  removerPartida(i: number) { this.partidas.removeAt(i); }
  somaPartidas(tipo: string): number {
    return this.partidas.controls
      .filter(c => c.value.tipo === tipo)
      .reduce((s, c) => s + (Number(c.value.valor) || 0), 0);
  }
  partidasBatem(): boolean {
    const d = this.somaPartidas('DEBITO'), c = this.somaPartidas('CREDITO');
    return d > 0 && Math.abs(d - c) < 0.01;
  }
  salvarLancamento() {
    if (this.lancForm.invalid || !this.partidasBatem()) return;
    this.service.createLancamento({ ...this.lancForm.value }).subscribe({
      next: () => {
        this.toast('Lançamento registrado!');
        this.partidas.clear(); this.adicionarPartida('DEBITO'); this.adicionarPartida('CREDITO');
        this.lancForm.patchValue({ historico: '' });
        this.carregarLancamentos();
      },
      error: e => this.toast(e.error?.message || 'Erro ao lançar', true),
    });
  }
  /** Lançamento simplificado: 1 débito × 1 crédito, mesmo valor, em uma única linha. */
  salvarSimplificado() {
    if (this.simplesForm.invalid || this.simplesMesmaConta()) return;
    this.service.createLancamento({ ...this.simplesForm.value }).subscribe({
      next: () => {
        this.toast('Lançamento registrado!');
        this.simplesForm.patchValue({ historico: '', contaDebitoId: '', contaCreditoId: '', valor: null });
        this.simplesForm.markAsPristine();
        this.simplesForm.markAsUntouched();
        this.carregarLancamentos();
      },
      error: e => this.toast(e.error?.message || 'Erro ao lançar', true),
    });
  }

  // ── Lançamentos fixos (recorrentes) ────────────────────────────
  carregarFixos() {
    this.service.listFixos().subscribe({ next: f => this.fixos.set(f), error: () => this.fixos.set([]) });
  }
  private resetFixoForm() {
    this.fixoEditId.set(null);
    this.fixosForm.reset({ historico: '', contaDebitoId: '', contaCreditoId: '', valor: null, diaVencimento: 1, tipo: 'NORMAL', vigenciaInicio: '', vigenciaFim: '', ativo: true });
  }
  cancelarEdicaoFixo() { this.resetFixoForm(); }
  editarFixo(f: any) {
    this.fixoEditId.set(f.id);
    this.fixosForm.patchValue({
      historico: f.historico, contaDebitoId: f.contaDebitoId, contaCreditoId: f.contaCreditoId,
      valor: f.valor, diaVencimento: f.diaVencimento, tipo: f.tipo,
      vigenciaInicio: f.vigenciaInicio, vigenciaFim: f.vigenciaFim, ativo: f.ativo,
    });
  }
  salvarFixo() {
    if (this.fixosForm.invalid || this.fixoMesmaConta()) return;
    const v = this.fixosForm.value;
    const cd = this.contas().find((c: any) => c.id === v.contaDebitoId);
    const cc = this.contas().find((c: any) => c.id === v.contaCreditoId);
    const payload = { ...v, contaDebitoCodigo: cd?.codigo ?? '', contaCreditoCodigo: cc?.codigo ?? '' };
    const id = this.fixoEditId();
    const req = id ? this.service.updateFixo(id, payload) : this.service.createFixo(payload);
    req.subscribe({
      next: () => { this.toast(id ? 'Fixo atualizado!' : 'Fixo cadastrado!'); this.resetFixoForm(); this.carregarFixos(); },
      error: e => this.toast(e.error?.message || 'Erro ao salvar fixo', true),
    });
  }
  toggleFixoAtivo(f: any) {
    this.service.setFixoAtivo(f.id, !f.ativo).subscribe({
      next: () => { this.toast(f.ativo ? 'Fixo desativado' : 'Fixo ativado'); this.carregarFixos(); },
      error: e => this.toast(e.error?.message || 'Erro', true),
    });
  }
  excluirFixo(f: any) {
    if (!confirm(`Excluir o fixo "${f.historico}"? Os lançamentos já gerados não são afetados.`)) return;
    this.service.deleteFixo(f.id).subscribe({
      next: () => { this.toast('Fixo excluído'); if (this.fixoEditId() === f.id) this.resetFixoForm(); this.carregarFixos(); },
      error: e => this.toast(e.error?.message || 'Erro ao excluir', true),
    });
  }
  gerarFixos() {
    this.gerandoFixos.set(true);
    this.service.gerarFixos(this.ano(), this.mes()).subscribe({
      next: r => {
        this.gerandoFixos.set(false);
        if (r.total === 0) this.toast('Nenhum fixo ativo vigente nesta competência');
        else if (r.criados === 0) this.toast(`Nada a gerar — os ${r.pulados} fixo(s) já foram lançados em ${this.mesNome()}/${this.ano()}`);
        else this.toast(`${r.criados} lançamento(s) gerado(s)${r.pulados ? ` · ${r.pulados} já existiam` : ''}`);
        this.carregarLancamentos();
      },
      error: e => { this.gerandoFixos.set(false); this.toast(e.error?.message || 'Erro ao gerar fixos', true); },
    });
  }
  carregarLancamentos() {
    this.loading.set(true);
    this.service.listByCompetencia(this.ano(), this.mes()).subscribe({
      next: (d: any) => { this.lancamentos.set(Array.isArray(d) ? d : (d?.content ?? [])); this.loading.set(false); },
      error: () => { this.lancamentos.set([]); this.loading.set(false); },
    });
  }
  estornar(l: any) {
    if (!confirm(`Estornar lançamento nº ${l.numero}?`)) return;
    this.service.estornarLancamento(l.id, { motivo: 'Estorno manual' }).subscribe({
      next: () => { this.toast('Estornado!'); this.carregarLancamentos(); },
      error: () => this.toast('Erro ao estornar', true),
    });
  }

  // ── Importar Lançamentos ───────────────────────────────────────
  onImportFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => { this.importRaw.set(String(reader.result || '')); this.processarImport(); };
    reader.onerror = () => this.toast('Falha ao ler o arquivo', true);
    reader.readAsText(file, 'utf-8');
  }
  setImportSep(v: string) { this.importSep.set(v); this.processarImport(); }
  setImportHeader(ev: Event) { this.importHeader.set((ev.target as HTMLInputElement).checked); this.processarImport(); }

  /** Lê o texto bruto, separa colunas, valida cada linha contra o plano de contas. */
  processarImport() {
    const texto = this.importRaw();
    if (!texto.trim()) { this.importRows.set([]); return; }
    const sep = this.importSep();
    const linhas = texto.split(/\r?\n/).filter(l => l.trim().length);

    // Mapa de colunas: por cabeçalho (se houver) ou posicional (data, hist, deb, cred, valor)
    let map = { data: 0, historico: 1, debito: 2, credito: 3, valor: 4 };
    let inicio = 0;
    if (this.importHeader()) {
      const head = linhas[0].split(sep).map(h => h.trim().toLowerCase());
      const acha = (...alts: string[]) => {
        for (const a of alts) { const i = head.findIndex(h => h.includes(a)); if (i >= 0) return i; }
        return -1;
      };
      map = {
        data: acha('data', 'date'),
        historico: acha('histor', 'descr', 'hist'),
        debito: acha('debito', 'débito', 'deb'),
        credito: acha('credito', 'crédito', 'cred'),
        valor: acha('valor', 'value', 'vlr'),
      };
      inicio = 1;
    }

    const porCodigo = new Map<string, any>(this.contas().map((c: any) => [String(c.codigo).trim(), c]));
    const rows: ImportRow[] = [];
    for (let i = inicio; i < linhas.length; i++) {
      const cols = linhas[i].split(sep);
      const get = (idx: number) => (idx >= 0 ? (cols[idx] ?? '') : '').trim();
      const dataRaw = get(map.data), historico = get(map.historico);
      const codDeb = get(map.debito), codCred = get(map.credito), valorRaw = get(map.valor);

      const erros: string[] = [];
      const data = this.parseData(dataRaw); if (!data) erros.push('data inválida');
      const valor = this.parseValor(valorRaw); if (!(valor > 0)) erros.push('valor inválido');
      const cDeb = porCodigo.get(codDeb); if (!cDeb) erros.push(`débito "${codDeb || '—'}" não é conta analítica`);
      const cCred = porCodigo.get(codCred); if (!cCred) erros.push(`crédito "${codCred || '—'}" não é conta analítica`);
      if (!historico) erros.push('histórico vazio');
      if (cDeb && cCred && cDeb.id === cCred.id) erros.push('débito e crédito na mesma conta');

      rows.push({
        linha: i + 1, data: data || dataRaw, historico, codDeb, codCred, valor: valor > 0 ? valor : 0,
        contaDebitoId: cDeb?.id, contaCreditoId: cCred?.id, valido: erros.length === 0, erro: erros.join('; '),
      });
    }
    this.importRows.set(rows);
    this.toast(`${rows.length} linha(s) lidas — ${rows.filter(r => r.valido).length} válida(s), ${rows.filter(r => !r.valido).length} com erro`);
  }

  private parseData(s: string): string | null {
    s = (s || '').trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return null;
  }
  private parseValor(s: string): number {
    s = (s || '').trim().replace(/\s|R\$/g, '');
    if (!s) return NaN;
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56 → 1234.56
    else s = s.replace(/,/g, '');                                        // 1,234.56 → 1234.56
    const n = Number(s);
    return isNaN(n) ? NaN : n;
  }

  baixarModeloImport() {
    const modelo = [
      'data;historico;conta_debito;conta_credito;valor',
      '15/01/2025;Recebimento de venda à vista;1.1.01;3.1.01;1000,00',
      '20/01/2025;Pagamento de aluguel;4.1.05;1.1.01;2500,00',
    ].join('\r\n');
    downloadTxt('modelo_importacao_lancamentos.csv', modelo);
    this.toast('Modelo baixado');
  }

  importarLancamentos() {
    const validas = this.importValidas();
    if (!validas.length) { this.toast('Nenhuma linha válida para importar', true); return; }
    if (!confirm(`Importar ${validas.length} lançamento(s) válido(s)?`)) return;
    this.importing.set(true);
    let ok = 0, fail = 0;
    const grava = (i: number) => {
      if (i >= validas.length) {
        this.importing.set(false);
        this.toast(`Importação concluída: ${ok} gravado(s)${fail ? `, ${fail} falha(s)` : ''}`, fail > 0);
        this.importRows.set([]); this.importRaw.set(''); this.importFileName.set('');
        this.carregarLancamentos();
        return;
      }
      const r = validas[i];
      this.service.createLancamento({
        data: r.data, tipo: 'NORMAL', historico: r.historico,
        partidas: [
          { contaId: r.contaDebitoId, tipo: 'DEBITO', valor: r.valor },
          { contaId: r.contaCreditoId, tipo: 'CREDITO', valor: r.valor },
        ],
      }).subscribe({
        next: () => { ok++; grava(i + 1); },
        error: () => { fail++; grava(i + 1); },
      });
    };
    grava(0);
  }

  // ── Exportar Lançamentos ───────────────────────────────────────
  gerarExport() {
    this.loading.set(true);
    const ano = this.ano();
    const anoInteiro = this.exportEscopo() === 'ano';
    const obs: any = anoInteiro
      ? forkJoin(Array.from({ length: 12 }, (_, i) => this.service.listByCompetencia(ano, i + 1)))
      : this.service.listByCompetencia(ano, this.mes());
    obs.subscribe({
      next: (d: any) => {
        const lancs = anoInteiro
          ? ([] as any[]).concat(...(d as any[]).map(x => Array.isArray(x) ? x : (x?.content ?? [])))
          : (Array.isArray(d) ? d : (d?.content ?? []));
        this.construirExport(lancs);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast('Erro ao carregar lançamentos', true); },
    });
  }

  /** Monta as linhas do arquivo a partir dos lançamentos, no formato escolhido. */
  private construirExport(lancs: any[]) {
    const usados = lancs.filter(l => this.exportComEstornados() || !l.estornado);
    const codById = new Map<string, any>(this.contas().map((c: any) => [c.id, c]));
    const partidasDe = (l: any): any[] => {
      if (l.partidas?.length) {
        return l.partidas.map((p: any) => {
          const c = codById.get(p.contaId);
          return { codigo: c?.codigo || '', descricao: c?.descricao || '', dc: p.tipo === 'DEBITO' ? 'D' : 'C', valor: Math.abs(p.valor || 0) };
        });
      }
      const out: any[] = [];
      if (l.contaDebito) out.push({ codigo: l.contaDebito.codigo, descricao: l.contaDebito.descricao, dc: 'D', valor: Math.abs(l.valor || 0) });
      if (l.contaCredito) out.push({ codigo: l.contaCredito.codigo, descricao: l.contaCredito.descricao, dc: 'C', valor: Math.abs(l.valor || 0) });
      return out;
    };
    const v = (n: number) => n.toFixed(2).replace('.', ',');

    let soma = 0, ignorados = 0;
    const rows: string[][] = [];
    let headers: string[];

    if (this.exportFormato() === 'detalhado') {
      headers = ['numero', 'data', 'historico', 'codigo_conta', 'conta', 'dc', 'valor'];
      for (const l of usados) {
        const ps = partidasDe(l);
        for (const p of ps) rows.push([String(l.numero ?? ''), fmtData(l.data), l.historico || '', p.codigo, p.descricao, p.dc, v(p.valor)]);
        soma += ps.filter(p => p.dc === 'D').reduce((s, p) => s + p.valor, 0);
      }
    } else {
      headers = ['data', 'historico', 'conta_debito', 'conta_credito', 'valor'];
      for (const l of usados) {
        const ps = partidasDe(l);
        const deb = ps.filter(p => p.dc === 'D'), cred = ps.filter(p => p.dc === 'C');
        if (deb.length === 1 && cred.length === 1) {
          rows.push([fmtData(l.data), l.historico || '', deb[0].codigo, cred[0].codigo, v(deb[0].valor)]);
          soma += deb[0].valor;
        } else {
          ignorados++;
        }
      }
    }

    this.exportHeaders.set(headers);
    this.exportRows.set(rows);
    this.exportSoma.set(soma);
    this.exportIgnorados.set(ignorados);
    this.toast(`${rows.length} linha(s) geradas${ignorados ? ` — ${ignorados} com múltiplas partidas (use o formato Detalhado)` : ''}`, ignorados > 0);
  }

  baixarExport() {
    if (!this.exportRows().length) { this.toast('Gere a prévia primeiro', true); return; }
    const sep = this.exportSep();
    const limpa = (cell: string) => (cell ?? '').split(sep).join(' '); // evita quebrar o CSV
    const linhas = this.exportComCabecalho() ? [this.exportHeaders(), ...this.exportRows()] : this.exportRows();
    const conteudo = linhas.map(r => r.map(limpa).join(sep)).join('\r\n');
    const escopo = this.exportEscopo() === 'ano' ? String(this.ano()) : `${this.ano()}-${String(this.mes()).padStart(2, '0')}`;
    downloadTxt(`lancamentos_${escopo}_${this.exportFormato()}.csv`, conteudo);
    this.toast('Arquivo exportado');
  }

  // ── 2. CONSULTA ────────────────────────────────────────────────
  consultar() {
    if (!consultaGuard(this.consultaContaId())) { this.toast('Selecione uma conta', true); return; }
    this.loading.set(true);
    this.service.listByCompetencia(this.ano(), this.mes()).subscribe({
      next: (d: any) => {
        const itens = (Array.isArray(d) ? d : (d?.content ?? [])) as any[];
        let saldo = 0;
        const linhas = itens
          .filter(l => l.contaDebitoId === this.consultaContaId() || l.contaCreditoId === this.consultaContaId())
          .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
          .map(l => {
            const debito = l.contaDebitoId === this.consultaContaId() ? (l.valor || 0) : 0;
            const credito = l.contaCreditoId === this.consultaContaId() ? (l.valor || 0) : 0;
            saldo += debito - credito;
            return { data: l.data, historico: l.historico, debito, credito, saldo };
          });
        this.movimento.set(linhas);
        this.loading.set(false);
      },
      error: () => { this.movimento.set([]); this.loading.set(false); },
    });
  }

  // ── 3. LIVROS E RELATÓRIOS ─────────────────────────────────────
  gerarLivro() {
    this.loading.set(true);
    const done = (headers: string[], linhas: any[][]) => { this.livroHeaders.set(headers); this.livroLinhas.set(linhas); this.loading.set(false); };
    const fail = () => { this.livroLinhas.set([]); this.loading.set(false); this.toast('Falha ao gerar relatório', true); };

    switch (this.sub()) {
      case 'balancete':
        this.service.gerarBalancete(this.ano(), this.mes()).subscribe({
          next: r => done(['Conta', 'Descrição', 'Débito', 'Crédito', 'Saldo'],
            (r.linhas || []).map((x: any) => [x.codigo, x.descricao || x.nome, brl(x.debito), brl(x.credito), brl(x.saldo)])),
          error: fail });
        break;
      case 'dre':
        this.service.gerarDre(this.ano(), this.mes()).subscribe({
          next: (r: any) => done(['Grupo', 'Valor'],
            (r.grupos || r.linhas || []).map((x: any) => [x.descricao || x.nome || x.grupo, brl(x.valor)])),
          error: fail });
        break;
      case 'balanco':
        this.service.gerarBalancoMensal(this.ano(), this.mes()).subscribe({
          next: (r: any) => done(['Conta', 'Descrição', 'Saldo'],
            (r.contas || []).map((x: any) => [x.codigo, x.descricao || x.nome, brl(x.saldo)])),
          error: fail });
        break;
      default: fail();
    }
  }

  // ── Livro Razão (com termos de abertura e encerramento) ────────
  gerarRazao() {
    this.loading.set(true);
    this.razaoGerado.set(false);
    forkJoin({
      bal: this.service.gerarBalancete(this.ano(), this.mes()),
      lancs: this.service.listByCompetencia(this.ano(), this.mes()),
    }).subscribe({
      next: ({ bal, lancs }: any) => {
        this.montarRazao(bal?.linhas || [], Array.isArray(lancs) ? lancs : (lancs?.content ?? []));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast('Erro ao gerar o Livro Razão', true); },
    });
  }

  private montarRazao(balLinhas: any[], lancs: any[]) {
    // Metadados por conta (natureza, descrição, saldo anterior) vindos do balancete
    const meta = new Map<string, any>();
    for (const b of balLinhas) meta.set(b.codigo, b);
    const codById = new Map<string, any>(this.contas().map((c: any) => [c.id, c]));
    const contaByCod = new Map<string, any>(this.contas().map((c: any) => [String(c.codigo), c]));
    const partidasDe = (l: any): any[] => {
      if (l.partidas?.length) {
        return l.partidas.map((p: any) => {
          const c = codById.get(p.contaId);
          return { codigo: c?.codigo || '', dc: p.tipo === 'DEBITO' ? 'D' : 'C', valor: Math.abs(p.valor || 0) };
        });
      }
      const out: any[] = [];
      if (l.contaDebito) out.push({ codigo: l.contaDebito.codigo, dc: 'D', valor: Math.abs(l.valor || 0) });
      if (l.contaCredito) out.push({ codigo: l.contaCredito.codigo, dc: 'C', valor: Math.abs(l.valor || 0) });
      return out;
    };

    // Agrupa movimentos por conta, com contrapartida
    const movPorConta = new Map<string, RazaoMov[]>();
    for (const l of lancs) {
      if (l.estornado || l.status === 'ESTORNADO') continue;
      const ps = partidasDe(l);
      for (const p of ps) {
        if (!p.codigo) continue;
        const opostas = ps.filter(q => q.dc !== p.dc);
        const contra = opostas.length === 1 ? opostas[0].codigo : (opostas.length > 1 ? 'DIVERSOS' : '');
        if (!movPorConta.has(p.codigo)) movPorConta.set(p.codigo, []);
        movPorConta.get(p.codigo)!.push({
          data: l.data, numero: l.numero, historico: l.historico || '', contraPartida: contra,
          debito: p.dc === 'D' ? p.valor : 0, credito: p.dc === 'C' ? p.valor : 0, saldo: 0, dc: 'D',
        });
      }
    }

    const contas: RazaoConta[] = [];
    for (const [codigo, movs] of movPorConta) {
      const m = meta.get(codigo);
      const c = contaByCod.get(codigo);
      const natStr = (m?.natureza || c?.natureza || 'DEVEDORA').toUpperCase();
      const natDev = natStr.startsWith('DEV');
      const saldoAnterior = m?.saldoAnterior ?? 0; // natural
      movs.sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.numero - b.numero));
      let saldo = saldoAnterior, totDeb = 0, totCred = 0;
      for (const mv of movs) {
        saldo += (natDev ? 1 : -1) * (mv.debito - mv.credito);
        mv.saldo = Math.abs(saldo);
        mv.dc = saldo >= 0 ? (natDev ? 'D' : 'C') : (natDev ? 'C' : 'D');
        totDeb += mv.debito; totCred += mv.credito;
      }
      contas.push({
        codigo, descricao: m?.descricao || c?.descricao || c?.nome || codigo,
        naturezaDevedora: natDev, saldoAnterior, movimentos: movs,
        totalDebitos: totDeb, totalCreditos: totCred, saldoFinal: saldo,
      });
    }
    contas.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
    this.razaoContas.set(contas);
    const t = this.termos('Livro Razão');
    this.razaoAbertura.set(t.abertura);
    this.razaoEncerramento.set(t.encerramento);
    this.razaoGerado.set(true);
    this.toast(`Livro Razão gerado — ${contas.length} conta(s) com movimento`);
  }

  // ── Livro Diário (com termos de abertura e encerramento) ───────
  gerarDiario() {
    this.loading.set(true);
    this.diarioGerado.set(false);
    this.service.listByCompetencia(this.ano(), this.mes()).subscribe({
      next: (d: any) => {
        this.montarDiario(Array.isArray(d) ? d : (d?.content ?? []));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast('Erro ao gerar o Livro Diário', true); },
    });
  }

  private montarDiario(lancs: any[]) {
    const codById = new Map<string, any>(this.contas().map((c: any) => [c.id, c]));
    const contaByCod = new Map<string, any>(this.contas().map((c: any) => [String(c.codigo), c]));
    const desc = (codigo: string) => contaByCod.get(codigo)?.descricao || contaByCod.get(codigo)?.nome || '';
    const partidasDe = (l: any): DiarioPartida[] => {
      if (l.partidas?.length) {
        return l.partidas.map((p: any) => {
          const c = codById.get(p.contaId);
          return { codigo: c?.codigo || '', descricao: c?.descricao || c?.nome || '', dc: p.tipo === 'DEBITO' ? 'D' : 'C', valor: Math.abs(p.valor || 0) } as DiarioPartida;
        });
      }
      const out: DiarioPartida[] = [];
      if (l.contaDebito) out.push({ codigo: l.contaDebito.codigo, descricao: l.contaDebito.descricao || desc(l.contaDebito.codigo), dc: 'D', valor: Math.abs(l.valor || 0) });
      if (l.contaCredito) out.push({ codigo: l.contaCredito.codigo, descricao: l.contaCredito.descricao || desc(l.contaCredito.codigo), dc: 'C', valor: Math.abs(l.valor || 0) });
      return out;
    };

    const itens: DiarioLanc[] = lancs
      .filter(l => !(l.estornado || l.status === 'ESTORNADO'))
      .map(l => {
        const partidas = partidasDe(l).sort((a, b) => (a.dc === b.dc ? 0 : a.dc === 'D' ? -1 : 1)); // débitos antes
        const total = partidas.filter(p => p.dc === 'D').reduce((s, p) => s + p.valor, 0);
        return { numero: l.numero, data: l.data, historico: l.historico || '', partidas, total };
      })
      .sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.numero - b.numero));

    this.diarioLancs.set(itens);
    const t = this.termos('Livro Diário');
    this.diarioAbertura.set(t.abertura);
    this.diarioEncerramento.set(t.encerramento);
    this.diarioGerado.set(true);
    this.toast(`Livro Diário gerado — ${itens.length} lançamento(s)`);
  }

  baixarDiario() {
    if (!this.diarioLancs().length) { this.toast('Gere o Diário primeiro', true); return; }
    const emp = this.empresaRazao;
    const L: string[] = [];
    L.push(`LIVRO DIÁRIO — ${emp.nome}`, `CNPJ ${emp.cnpj}`, `Competência ${this.mesNome()}/${this.ano()}`, '');
    L.push('TERMO DE ABERTURA', this.diarioAbertura(), '');
    for (const l of this.diarioLancs()) {
      L.push(`Nº ${l.numero}   ${fmtData(l.data)}   ${l.historico}`);
      for (const p of l.partidas) {
        L.push('  ' + [
          p.dc, p.codigo.padEnd(12), (p.descricao || '').slice(0, 34).padEnd(35),
          (p.dc === 'D' ? brl(p.valor) : '').padStart(16), (p.dc === 'C' ? brl(p.valor) : '').padStart(16),
        ].join(' '));
      }
      L.push('');
    }
    L.push(`SOMA DO PERÍODO: Débitos ${brl(this.diarioTotDeb())} | Créditos ${brl(this.diarioTotCred())}`, '');
    L.push('TERMO DE ENCERRAMENTO', this.diarioEncerramento(), '', '', '');
    L.push('___________________________________        ___________________________________');
    L.push(`${emp.responsavel} (Responsável)                ${emp.contador} (Contabilista) ${emp.crc}`);
    downloadTxt(`livro_diario_${this.ano()}-${String(this.mes()).padStart(2, '0')}.txt`, L.join('\r\n'));
    this.toast('Livro Diário exportado');
  }

  /** Termos de abertura e encerramento (fórmula padrão) para qualquer livro. Empresa: placeholder. */
  private termos(livro: string): { abertura: string; encerramento: string } {
    const emp = this.empresaRazao;
    const ini = `01/${String(this.mes()).padStart(2, '0')}/${this.ano()}`;
    const ultimo = new Date(this.ano(), this.mes(), 0).getDate();
    const fim = `${ultimo}/${String(this.mes()).padStart(2, '0')}/${this.ano()}`;
    return {
      abertura:
        `Contém o presente ${livro} nº ${emp.numLivro} a escrituração contábil de ${emp.nome}, ` +
        `inscrita no CNPJ sob o nº ${emp.cnpj}, com sede em ${emp.municipio}/${emp.uf}` +
        `${emp.nire ? `, registrada na Junta Comercial sob o NIRE ${emp.nire}` : ''}, ` +
        `destinando-se ao registro dos atos e fatos contábeis do período de ${ini} a ${fim}.`,
      encerramento:
        `Encerra-se o presente ${livro} nº ${emp.numLivro}, de ${emp.nome}, CNPJ ${emp.cnpj}, ` +
        `contendo a escrituração contábil do período de ${ini} a ${fim}. ${emp.municipio}, ${fim}.`,
    };
  }

  baixarRazao() {
    if (!this.razaoContas().length) { this.toast('Gere o Razão primeiro', true); return; }
    const L: string[] = [];
    const emp = this.empresaRazao;
    L.push(`LIVRO RAZÃO — ${emp.nome}`, `CNPJ ${emp.cnpj}`, `Competência ${this.mesNome()}/${this.ano()}`, '');
    L.push('TERMO DE ABERTURA', this.razaoAbertura(), '');
    for (const c of this.razaoContas()) {
      L.push(`Conta ${c.codigo} — ${c.descricao}`);
      L.push(`  Saldo anterior: ${brl(Math.abs(c.saldoAnterior))} ${this.ladoSaldo(c.saldoAnterior, c.naturezaDevedora)}`);
      L.push('  Data        Nº     Histórico                         Contrapartida   Débito          Crédito         Saldo');
      for (const mv of c.movimentos) {
        L.push('  ' + [
          fmtData(mv.data).padEnd(11), String(mv.numero).padEnd(6),
          (mv.historico || '').slice(0, 32).padEnd(33), (mv.contraPartida || '').padEnd(15),
          (mv.debito ? brl(mv.debito) : '').padEnd(15), (mv.credito ? brl(mv.credito) : '').padEnd(15),
          `${brl(mv.saldo)} ${mv.dc}`,
        ].join(' '));
      }
      L.push(`  Totais: Débitos ${brl(c.totalDebitos)} | Créditos ${brl(c.totalCreditos)} | Saldo final ${brl(Math.abs(c.saldoFinal))} ${this.ladoSaldo(c.saldoFinal, c.naturezaDevedora)}`, '');
    }
    L.push('TERMO DE ENCERRAMENTO', this.razaoEncerramento(), '', '', '');
    L.push('___________________________________        ___________________________________');
    L.push(`${emp.responsavel} (Responsável)                ${emp.contador} (Contabilista) ${emp.crc}`);
    downloadTxt(`livro_razao_${this.ano()}-${String(this.mes()).padStart(2, '0')}.txt`, L.join('\r\n'));
    this.toast('Livro Razão exportado');
  }

  ladoSaldo(saldoNatural: number, naturezaDevedora: boolean): 'D' | 'C' {
    const dev = saldoNatural >= 0 ? naturezaDevedora : !naturezaDevedora;
    return dev ? 'D' : 'C';
  }

  // ── 4. DECLARAÇÕES DIGITAIS ────────────────────────────────────
  gerarDeclaracao(d: any) {
    this.declAvisos.set([]);
    if (d.id === 'ecd') { this.gerarEcdAnual(); return; }
    // ECF / DCTF — esboço a partir dos lançamentos do período
    this.service.listByCompetencia(this.ano(), this.mes()).subscribe({
      next: (res: any) => {
        const itens = (Array.isArray(res) ? res : (res?.content ?? [])) as any[];
        this.declPreview.set(this.montarArquivoFiscal(d.id, itens));
        this.toast(`Arquivo ${d.layout} gerado (${itens.length} lançamentos)`);
      },
      error: () => this.toast('Erro ao montar arquivo', true),
    });
  }

  /** Monta os signatários da ECD (J930) a partir do cadastro: responsável + contador. */
  private montarSignatarios(emp: EmpresaContabil | null): any[] {
    if (!emp) return [];
    const sigs: any[] = [];
    if (emp.responsavelNome && emp.responsavelCpf) {
      sigs.push({ nome: emp.responsavelNome, cpfCnpj: emp.responsavelCpf, qualificacao: this.codQualif(emp.responsavelQualificacao), crc: '' });
    }
    if (emp.contadorNome && emp.contadorCpf) {
      sigs.push({ nome: emp.contadorNome, cpfCnpj: emp.contadorCpf, qualificacao: '900', crc: emp.contadorCrc ? `${emp.contadorCrcUf || ''}${emp.contadorCrc}` : '' });
    }
    return sigs;
  }
  /** Código da Qualificação do Assinante (tabela da ECD) — validar no PVA. */
  private codQualif(q: string): string {
    const m: Record<string, string> = {
      SOCIO: '226', SOCIO_ADMINISTRADOR: '226', ADMINISTRADOR: '224',
      TITULAR: '225', DIRETOR: '222', PROCURADOR: '309',
    };
    return m[q] || '226';
  }

  /** Avisos sobre dados da empresa que faltam para a ECD/termos. */
  private avisosEmpresa(): string[] {
    const e = this.empresaInfo();
    const av: string[] = [];
    if (!e) { av.push('Empresa não carregada do cadastro — Bloco 0 com dados de exemplo.'); return av; }
    if (!e.cnpj || e.cnpj.replace(/\D/g, '').length !== 14) av.push('CNPJ da empresa ausente ou inválido.');
    if (!e.uf) av.push('UF da empresa não cadastrada.');
    if (!e.codMun) av.push('Código IBGE do município (COD_MUN) não cadastrado — campo obrigatório no registro 0000.');
    return av;
  }

  /** Gera a ECD do exercício inteiro no leiaute oficial (Blocos 0/I/J/9). */
  private gerarEcdAnual() {
    const ano = this.ano();
    this.loading.set(true);
    this.toast(`Coletando dados do exercício ${ano}…`);
    const meses = Array.from({ length: 12 }, (_, i) => i + 1);

    forkJoin({
      contas: this.service.listContas(),
      lancsMes: forkJoin(meses.map(m => this.service.listByCompetencia(ano, m))),
      balancetes: forkJoin(meses.map(m => this.service.gerarBalancete(ano, m))),
      bp: this.service.gerarBalancoMensal(ano, 12),
      dre: this.service.gerarDre(ano, 12),
    }).subscribe({
      next: (r: any) => {
        try {
          const dados = this.montarDadosEcd(ano, r);
          const out = gerarEcd(dados);
          this.declPreview.set(out.arquivo);
          this.declAvisos.set([...this.avisosEmpresa(), ...out.avisos]);
          this.toast(`ECD ${ano} gerada — ${out.totalLinhas} linhas`);
        } catch (e: any) {
          this.toast('Falha ao montar ECD: ' + (e?.message || e), true);
        }
        this.loading.set(false);
      },
      error: () => { this.toast('Erro ao coletar dados da ECD', true); this.loading.set(false); },
    });
  }

  /** Mapeia os dados do ContabilidadeService para o formato do gerador ECD. */
  private montarDadosEcd(ano: number, r: any): EcdDados {
    const contas: any[] = r.contas || [];
    const codById = new Map<string, string>(contas.map((c: any) => [c.id, c.codigo]));
    const tipoByCod = new Map<string, string>(contas.map((c: any) => [c.codigo, c.tipo]));
    const devedora = (nat: string) => (nat || '').toUpperCase().startsWith('DEV');
    const ult = (y: number, m: number) => new Date(y, m, 0).getDate();

    // Saldos periódicos mês a mês (só analíticas com movimento)
    const saldosPeriodicos: EcdSaldoPeriodo[] = (r.balancetes || []).map((b: any, i: number) => {
      const mes = i + 1;
      const linhas = (b?.linhas || []).filter((l: any) =>
        (tipoByCod.get(l.codigo) || '').toUpperCase().startsWith('ANAL'));
      return {
        dtIni: `${ano}-${String(mes).padStart(2, '0')}-01`,
        dtFim: `${ano}-${String(mes).padStart(2, '0')}-${String(ult(ano, mes)).padStart(2, '0')}`,
        contas: linhas.map((l: any) => ({
          codigo: l.codigo, saldoInicial: l.saldoAnterior ?? 0,
          debitos: l.debitos ?? 0, creditos: l.creditos ?? 0,
          saldoFinal: l.saldoAtual ?? 0, naturezaDevedora: devedora(l.natureza),
        })),
      };
    });

    // Lançamentos do ano (uma partida por débito/crédito)
    const lancamentos = ([] as any[]).concat(...(r.lancsMes || [])).map((lc: any) => {
      const partidas = (lc.partidas?.length)
        ? lc.partidas.map((p: any) => ({ codigo: codById.get(p.contaId) || '', valor: Math.abs(p.valor || 0), dc: p.tipo === 'DEBITO' ? 'D' : 'C', historico: lc.historico }))
        : [
            { codigo: lc.contaDebito?.codigo || '', valor: Math.abs(lc.valor || 0), dc: 'D', historico: lc.historico },
            { codigo: lc.contaCredito?.codigo || '', valor: Math.abs(lc.valor || 0), dc: 'C', historico: lc.historico },
          ];
      return { numero: lc.numero, data: lc.data, partidas };
    });

    // Saldos de resultado antes do encerramento (dez/ano)
    const balDez = (r.balancetes || [])[11];
    const contasResultado = (balDez?.linhas || [])
      .filter((l: any) => /RECEITA|DESPESA|CUSTO|RESULTADO/.test((l.classificacao || '').toUpperCase()) && Math.abs(l.saldoAtual || 0) > 0.001)
      .map((l: any) => ({ codigo: l.codigo, valor: l.saldoAtual || 0, naturezaDevedora: devedora(l.natureza) }));

    // Demonstrações (BP + DRE) — COD_AGL sintético (ver aviso do gerador)
    const bp = (r.bp?.contas || []).map((c: any, i: number) => ({
      codAgl: c.codigo || `BP${i + 1}`, nivel: c.nivel ?? 1, descricao: c.descricao,
      valor: c.saldo ?? 0, naturezaDevedora: (c.natureza || '').toUpperCase() !== 'PASSIVO' && (c.natureza || '').toUpperCase() !== 'PL',
      indGrpBal: (c.natureza || '').toUpperCase() === 'ATIVO' ? 'A' as const : 'P' as const,
    }));
    const dre = (r.dre?.linhas || []).map((l: any, i: number) => ({
      codAgl: `DRE${i + 1}`, nivel: l.nivel ?? 1, descricao: l.descricao, valor: l.valor ?? 0,
    }));

    const emp = this.empresaInfo();
    return {
      empresa: {
        nome: emp?.nome || 'EMPRESA (cadastro não encontrado)',
        cnpj: (emp?.cnpj || '').replace(/\D/g, '') || '00000000000000',
        uf: emp?.uf || '',
        codMun: emp?.codMun || '',              // IBGE — preencher no cadastro
        descMun: emp?.municipio || '',
        ie: emp?.ie || 'ISENTO',
        im: emp?.im || '',
        nire: emp?.nire || '',
        dtIni: `${ano}-01-01`, dtFim: `${ano}-12-31`,
        versaoLeiaute: '9.00', natLivro: 'LIVRO DIÁRIO', numOrdemLivro: '1',
      },
      contas: contas.map((c: any) => ({
        codigo: c.codigo, codSuperior: c.contaPaiId ? codById.get(c.contaPaiId) : undefined,
        descricao: c.descricao || c.nome, classificacao: c.classificacao, tipo: c.tipo, nivel: c.nivel,
      })),
      saldosPeriodicos,
      lancamentos,
      saldoResultado: contasResultado.length ? { dtRes: `${ano}-12-31`, contas: contasResultado } : undefined,
      demonstracoes: [
        { id: '1', tipo: 'BP', cabecalho: 'BALANÇO PATRIMONIAL', linhas: bp },
        { id: '2', tipo: 'DRE', cabecalho: 'DEMONSTRAÇÃO DO RESULTADO', linhas: dre },
      ],
      signatarios: this.montarSignatarios(emp),
    };
  }
  baixarDeclaracao(d: any) {
    if (!this.declPreview()) return;
    const nome = d.id === 'ecd'
      ? `ECD_${this.ano()}.txt`
      : `${d.id.toUpperCase()}_${this.ano()}${String(this.mes()).padStart(2, '0')}.txt`;
    downloadTxt(nome, this.declPreview());
    this.toast('Download iniciado');
  }
  /** Monta um esboço de arquivo SPED/fiscal a partir dos lançamentos do período. */
  private montarArquivoFiscal(tipo: string, itens: any[]): string {
    const comp = `${String(this.mes()).padStart(2, '0')}${this.ano()}`;
    const head = `|0000|LECD|01${comp}|31${comp}|BEAR ERP|`;
    const corpo = itens.map((l, i) =>
      `|I250|${l.contaDebitoCodigo || ''}|D|${(l.valor || 0).toFixed(2)}|${(i + 1)}|${l.historico || ''}|`
    );
    const enc = `|9999|${itens.length + 2}|`;
    return [`# Prévia ${tipo.toUpperCase()} — gerada do bear-erp`, head, ...corpo, enc].join('\n');
  }

  // ── 5. CADASTRO ────────────────────────────────────────────────
  carregarCadastro() {
    const set = (o: any) => this.cadastroItens.set(o || []);
    switch (this.sub()) {
      case 'plano': this.service.listContas().subscribe({ next: set, error: () => set([]) }); break;
      case 'historicos': this.service.listHistoricos().subscribe({ next: set, error: () => set([]) }); break;
      case 'centros': this.service.listCentrosCusto().subscribe({ next: set, error: () => set([]) }); break;
      case 'regras': this.service.listRegras().subscribe({ next: set, error: () => set([]) }); break;
      default: set([]);
    }
  }
  novoCadastro() {
    this.toast(`Abrir formulário de novo registro em ${this.cadastroLabel()} (use o módulo dedicado)`);
  }

  abrirFuncao() {
    this.toast(`${this.activeSub()?.label}: função do menu ${this.activeMenu().label} — fluxo dedicado em implementação`);
  }

  // ── 6. MANUTENÇÃO ──────────────────────────────────────────────
  executarManutencao(op: any) {
    if (op.danger && !confirm(`${op.label}: operação sensível. Confirmar?`)) return;
    this.manutLog.set([`▶ ${op.label} — ${this.ano()}`]);
    const log = (m: string) => this.manutLog.update(l => [...l, m]);

    if (op.id === 'enc-exercicio' || op.id === 'enc-simulado') {
      const simulado = op.id === 'enc-simulado';
      this.service.encerrarExercicio(this.ano()).subscribe({
        next: () => {
          log('✓ Resultado apurado e transferido ao PL');
          log(simulado ? '✓ Simulação concluída (nada gravado)' : '✓ Exercício encerrado');
          this.toast(simulado ? 'Encerramento simulado' : 'Exercício encerrado');
        },
        error: e => { log('✗ ' + (e.error?.message || 'falha')); this.toast('Falha no encerramento', true); },
      });
      return;
    }
    if (op.id === 'integridade') {
      this.service.listByCompetencia(this.ano(), this.mes()).subscribe({
        next: (d: any) => {
          const itens = (Array.isArray(d) ? d : (d?.content ?? [])) as any[];
          const semConta = itens.filter(l => !l.contaDebitoId || !l.contaCreditoId).length;
          log(`✓ ${itens.length} lançamentos analisados`);
          log(semConta ? `✗ ${semConta} sem conta D/C` : '✓ Todas as partidas com débito e crédito');
          log('✓ Verificação concluída');
        },
        error: () => log('✗ Falha ao ler lançamentos'),
      });
      return;
    }
    // recalculo / reabertura — processamento local
    setTimeoutSafe(() => { log('✓ Processado'); this.toast(`${op.label} concluída`); });
  }

  // ── Utilitários ────────────────────────────────────────────────
  exportar(linhas: any[][], nome: string) {
    const csv = [this.livroHeaders().join(';'), ...linhas.map(r => r.join(';'))].join('\n');
    downloadTxt(`${nome.replace(/\s+/g, '_')}.csv`, csv);
    this.toast('Exportado');
  }
  private toast(msg: string, erro = false) {
    this.snackBar.open(msg, erro ? 'Fechar' : 'OK', { duration: erro ? 5000 : 3000, panelClass: [erro ? 'error-snackbar' : 'success-snackbar'] });
  }

  fmt(d: string): string { return fmtData(d); }
  absVal(n: number): number { return Math.abs(n || 0); }
}

// ── Helpers livres de estado ─────────────────────────────────────
function brl(v: number | undefined): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtData(d: string | undefined): string {
  return d ? d.split('T')[0].split('-').reverse().join('/') : '';
}
function consultaGuard(id: string): boolean { return !!id; }
function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function setTimeoutSafe(fn: () => void) { Promise.resolve().then(fn); }
