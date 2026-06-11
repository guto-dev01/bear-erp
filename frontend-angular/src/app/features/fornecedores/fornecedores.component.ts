import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { environment } from '@env/environment';

/** Dados de CNPJ retornados pelo backend (integracoes-service). */
interface DadosCnpj {
  razaoSocial?: string;
  nomeFantasia?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

interface Fornecedor {
  $id: string;
  nome: string;                 // atributo obrigatório da collection
  razaoSocial?: string;
  nomeFantasia?: string;
  cpfCnpj: string;              // schema usa cpfCnpj (não cnpjCpf)
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;                  // schema usa uf (não estado)
  cep?: string;
  status: string;
  tipo: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  chavePix?: string;
  $createdAt: string;
}

@Component({
  selector: 'bear-fornecedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTooltipModule, MatSnackBarModule],
  template: `
    <div class="crm">
      <div class="crm-page">
        <!-- ═══ Header ═══ -->
        <div class="crm-page__head">
          <div>
            <h1 class="crm-page__title">Fornecedores</h1>
            <p class="crm-page__sub">Gerencie seus fornecedores e parceiros de negócio.</p>
          </div>
          <div class="crm-head__actions">
            <div class="crm-search">
              <span class="material-symbols-rounded">search</span>
              <input placeholder="Pesquisar fornecedor..." [value]="searchTerm()" (input)="onSearch($event)">
            </div>
            <button class="crm-btn-primary" (click)="openForm()">
              <span class="material-symbols-rounded">add</span> Novo Fornecedor
            </button>
          </div>
        </div>

        <!-- ═══ KPI cards ═══ -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--blue"><span class="material-symbols-rounded">groups</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Total de Fornecedores</p>
              <p class="kpi-card__value">{{ total() }}</p>
              <p class="kpi-card__delta kpi-card__delta--up"><span class="material-symbols-rounded">arrow_upward</span> {{ novosEsteMes() }} novos este mês</p>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--green"><span class="material-symbols-rounded">verified_user</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Fornecedores Ativos</p>
              <p class="kpi-card__value">{{ countActive() }}</p>
              <p class="kpi-card__delta kpi-card__delta--ok">{{ pct(countActive()) }}% do total</p>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--teal"><span class="material-symbols-rounded">account_balance</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Fornecedores com PIX</p>
              <p class="kpi-card__value">{{ countWithPix() }}</p>
              <p class="kpi-card__delta kpi-card__delta--teal">{{ pct(countWithPix()) }}% do total</p>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--amber"><span class="material-symbols-rounded">schedule</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Pendentes / Inativos</p>
              <p class="kpi-card__value">{{ countInactive() }}</p>
              <p class="kpi-card__delta kpi-card__delta--warn">{{ pct(countInactive()) }}% do total</p>
            </div>
          </div>
        </div>

        <!-- ═══ Lista (tabela) ═══ -->
        <div class="panel panel--table">
          <div class="panel__head">
            <h2 class="panel__title">Lista de Fornecedores</h2>
            <button class="crm-chip"><span class="material-symbols-rounded">filter_list</span> Filtros</button>
          </div>

          <div class="tbl">
            <div class="tbl__head">
              <span>Fornecedor</span><span>Cidade</span><span>E-mail</span><span>Telefone</span>
              <span class="tbl__c-center">PIX</span><span class="tbl__c-center">Status</span><span class="tbl__c-right">Ações</span>
            </div>

            @if (loading()) {
              @for (i of [1,2,3,4,5]; track i) {
                <div class="tbl__row">
                  <div class="tbl__cell-name"><div class="crm-skel crm-skel--av"></div><div style="flex:1"><div class="crm-skel" style="width:60%"></div><div class="crm-skel" style="width:40%;margin-top:.4rem"></div></div></div>
                  <div class="crm-skel" style="width:70%"></div><div class="crm-skel" style="width:80%"></div><div class="crm-skel" style="width:60%"></div>
                  <div class="crm-skel" style="width:24px;margin:0 auto"></div><div class="crm-skel" style="width:60%;margin:0 auto"></div><span></span>
                </div>
              }
            } @else if (filtered().length === 0) {
              <div class="crm-empty">
                <span class="material-symbols-rounded">local_shipping</span>
                <p>{{ searchTerm() ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado' }}</p>
                @if (!searchTerm()) {
                  <button class="crm-btn-primary" style="margin-top:1rem" (click)="openForm()"><span class="material-symbols-rounded">add</span> Adicionar fornecedor</button>
                }
              </div>
            } @else {
              @for (f of paged(); track f.$id) {
                <div class="tbl__row">
                  <div class="tbl__cell-name">
                    <div class="crm-avatar" [style.background]="avatarBg(f)">{{ initials(nomeDe(f)) }}</div>
                    <div class="tbl__name-text">
                      <span class="tbl__name">{{ nomeDe(f) }}</span>
                      <span class="tbl__doc">{{ formatDoc(f.cpfCnpj) }}</span>
                    </div>
                  </div>
                  <span class="tbl__muted" data-label="Cidade">{{ f.cidade ? f.cidade + (f.uf ? ' - ' + f.uf : '') : '—' }}</span>
                  <span class="tbl__muted" data-label="E-mail">{{ f.email || '—' }}</span>
                  <span class="tbl__muted" data-label="Telefone">{{ f.telefone || '—' }}</span>
                  <span class="tbl__c-center" data-label="PIX">
                    @if (f.chavePix) {
                      <span class="material-symbols-rounded pix-on" matTooltip="{{ f.chavePix }}">check_circle</span>
                    } @else {
                      <span class="material-symbols-rounded pix-off">cancel</span>
                    }
                  </span>
                  <span class="tbl__c-center" data-label="Status">
                    @if (isActive(f)) {
                      <span class="crm-badge crm-badge--ok">Ativo</span>
                    } @else {
                      <span class="crm-badge crm-badge--muted">Inativo</span>
                    }
                  </span>
                  <span class="crm-actions" data-label="Ações">
                    <button matTooltip="Editar" (click)="openForm(f)"><span class="material-symbols-rounded">edit</span></button>
                    <button matTooltip="Excluir" (click)="delete(f)"><span class="material-symbols-rounded">delete</span></button>
                  </span>
                </div>
              }
            }
          </div>

          <!-- Paginação -->
          @if (!loading() && filtered().length > 0) {
            <div class="pager">
              <span class="pager__info">Mostrando {{ rangeStart() }} a {{ rangeEnd() }} de {{ filtered().length }} fornecedores</span>
              <div class="pager__nav">
                <button class="pager__btn" [disabled]="page() === 1" (click)="goTo(page() - 1)"><span class="material-symbols-rounded">chevron_left</span></button>
                @for (p of pages(); track p) {
                  @if (p === -1) { <span class="pager__dots">…</span> }
                  @else { <button class="pager__btn" [class.is-active]="p === page()" (click)="goTo(p)">{{ p }}</button> }
                }
                <button class="pager__btn" [disabled]="page() === totalPages()" (click)="goTo(page() + 1)"><span class="material-symbols-rounded">chevron_right</span></button>
              </div>
              <div class="pager__size">
                <select [value]="pageSize()" (change)="setPageSize($event)">
                  <option [value]="5">5 por página</option>
                  <option [value]="10">10 por página</option>
                  <option [value]="25">25 por página</option>
                </select>
              </div>
            </div>
          }
        </div>

        <!-- ═══ Widgets inferiores ═══ -->
        <div class="widgets">
          <!-- Compras por fornecedor -->
          <div class="panel widget">
            <div class="panel__head">
              <h3 class="widget__title"><span class="material-symbols-rounded">bar_chart</span> Compras por fornecedor (mês)</h3>
              <button class="crm-chip crm-chip--sm">Ver relatório</button>
            </div>
            <div class="bars">
              @for (b of topCompras(); track b.nome) {
                <div class="bar-row">
                  <span class="bar-row__name">{{ b.nome }}</span>
                  <div class="bar-row__track"><div class="bar-row__fill" [style.width.%]="b.barPct"></div></div>
                  <span class="bar-row__val">{{ b.valor | currency:'BRL' }}</span>
                </div>
              } @empty {
                <p class="widget__empty">Sem dados de compras.</p>
              }
            </div>
          </div>

          <!-- Top fornecedores -->
          <div class="panel widget">
            <div class="panel__head">
              <h3 class="widget__title"><span class="material-symbols-rounded">leaderboard</span> Top fornecedores</h3>
              <button class="crm-chip crm-chip--sm">Ver todos</button>
            </div>
            <div class="rank">
              @for (b of topCompras(); track b.nome; let i = $index) {
                <div class="rank-row">
                  <span class="rank-row__pos rank-row__pos--{{ i + 1 }}">{{ i + 1 }}</span>
                  <span class="rank-row__name">{{ b.nome }}</span>
                  <span class="rank-row__val">{{ b.valor | currency:'BRL' }}</span>
                  <span class="rank-row__pct">{{ b.pct }}%</span>
                </div>
              } @empty {
                <p class="widget__empty">Sem dados de compras.</p>
              }
            </div>
          </div>

          <!-- Status de fornecedores (donut) -->
          <div class="panel widget">
            <div class="panel__head"><h3 class="widget__title">Status de fornecedores</h3></div>
            <div class="donut-wrap">
              <div class="donut" [style.background]="donutGradient()">
                <div class="donut__hole">
                  <span class="donut__total">{{ total() }}</span>
                  <span class="donut__cap">Total</span>
                </div>
              </div>
              <ul class="legend">
                <li><span class="legend__dot legend__dot--ok"></span> Ativos <b>{{ countActive() }} ({{ pct(countActive()) }}%)</b></li>
                <li><span class="legend__dot legend__dot--warn"></span> Inativos <b>{{ countInactive() }} ({{ pct(countInactive()) }}%)</b></li>
                <li><span class="legend__dot legend__dot--muted"></span> Pendentes <b>{{ countPendentes() }} ({{ pct(countPendentes()) }}%)</b></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Modal de cadastro ═══ -->
      @if (showForm()) {
        <div class="crm-modal__backdrop" (click)="closeForm()"></div>
        <div class="crm-modal">
          <div class="nc-head">
            <div>
              <h2 class="nc-title">{{ editingId() ? 'Editar Fornecedor' : 'Novo Fornecedor' }}</h2>
              <p class="nc-sub">Preencha os dados do fornecedor e seus dados bancários.</p>
            </div>
            <button class="crm-icon-btn" (click)="closeForm()"><span class="material-symbols-rounded">close</span></button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <h3 class="nc-section">Dados Gerais</h3>
            <div class="nc-form-grid">
              <div class="nc-field span-2"><label>Razão Social <span class="nc-req">*</span></label><input class="nc-input" formControlName="razaoSocial"></div>
              <div class="nc-field"><label>Nome Fantasia <span class="nc-req">*</span></label><input class="nc-input" formControlName="nomeFantasia"></div>
              <div class="nc-field"><label>Tipo</label><select class="nc-input" formControlName="tipo"><option value="PJ">Pessoa Jurídica</option><option value="PF">Pessoa Física</option></select></div>
              <div class="nc-field">
                <label>CNPJ / CPF <span class="nc-req">*</span></label>
                <div class="nc-input-wrap">
                  <input class="nc-input" formControlName="cnpjCpf" maxlength="18" placeholder="Somente números"
                         (input)="onCnpjInput($any($event.target).value)">
                  <button type="button" class="nc-fetch" matTooltip="Buscar dados na Receita Federal"
                          [disabled]="cnpjLoading() || onlyDigits(form.value.cnpjCpf).length !== 14"
                          (click)="buscarCnpj(onlyDigits(form.value.cnpjCpf))">
                    @if (cnpjLoading()) { <span class="material-symbols-rounded nc-spin">progress_activity</span> }
                    @else { <span class="material-symbols-rounded">cloud_download</span> }
                  </button>
                </div>
                <span class="nc-hint">
                  @if (cnpjLoading()) { Consultando Receita Federal… }
                  @else { Digite o CNPJ (14 dígitos) para preencher automaticamente. }
                </span>
              </div>
              <div class="nc-field"><label>Inscrição Estadual</label><input class="nc-input" formControlName="inscricaoEstadual"></div>
              <div class="nc-field"><label>Email <span class="nc-req">*</span></label><input class="nc-input" type="email" formControlName="email"></div>
              <div class="nc-field"><label>Telefone</label><input class="nc-input" formControlName="telefone"></div>
            </div>

            <h3 class="nc-section">Endereço</h3>
            <div class="nc-form-grid">
              <div class="nc-field span-2"><label>Endereço</label><input class="nc-input" formControlName="endereco"></div>
              <div class="nc-field"><label>Cidade</label><input class="nc-input" formControlName="cidade"></div>
              <div class="nc-field"><label>Estado</label><select class="nc-input" formControlName="estado"><option value="">—</option>@for(uf of ufs;track uf){<option [value]="uf">{{uf}}</option>}</select></div>
              <div class="nc-field"><label>CEP</label><input class="nc-input" formControlName="cep" maxlength="8"></div>
            </div>

            <h3 class="nc-section">Dados Bancários</h3>
            <div class="nc-form-grid">
              <div class="nc-field"><label>Banco</label><input class="nc-input" formControlName="banco"></div>
              <div class="nc-field"><label>Agência</label><input class="nc-input" formControlName="agencia"></div>
              <div class="nc-field"><label>Conta</label><input class="nc-input" formControlName="conta"></div>
              <div class="nc-field"><label>Chave PIX</label><input class="nc-input" formControlName="chavePix"></div>
            </div>

            <div class="nc-foot">
              <span></span>
              <div class="nc-foot__actions">
                <button type="button" class="crm-btn-outline" (click)="closeForm()">Cancelar</button>
                <button type="submit" class="crm-btn-primary" [disabled]="form.invalid">
                  <span class="material-symbols-rounded">{{ editingId() ? 'save' : 'add' }}</span>{{ editingId() ? 'Salvar' : 'Criar' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; min-height:100%; background:var(--bg-canvas); }
    .crm {
      --bg: var(--bg-canvas); --panel: var(--surface-card); --panel-2: var(--surface-raised);
      --line: var(--border-subtle); --line-strong: var(--border-color);
      --txt: var(--text-primary); --txt-2: var(--text-secondary); --txt-3: var(--text-tertiary);
      --accent: var(--brand-primary); --accent-2: var(--brand-accent);
      --accent-soft: var(--brand-primary-light); --accent-softer: var(--brand-primary-muted);
      --accent-glow: var(--brand-primary-glow); --on-accent: var(--text-on-brand, #fff);
      min-height:100%; width:100%; background:var(--bg); color:var(--txt); padding-bottom:3rem; font-family:inherit;
    }
    .material-symbols-rounded { font-variation-settings:'wght' 400; vertical-align:middle; }

    /* Page */
    .crm-page { padding:1.75rem; max-width:1320px; margin:0 auto; }
    .crm-page__head { display:flex; align-items:flex-start; justify-content:space-between; gap:1.5rem; margin-bottom:1.5rem; flex-wrap:wrap; }
    .crm-page__title { font-size:2rem; font-weight:800; letter-spacing:-.02em; margin:0; color:var(--text-title); }
    .crm-page__sub { color:var(--txt-2); font-size:.9rem; margin:.3rem 0 0; }
    .crm-head__actions { display:flex; align-items:center; gap:.75rem; }

    .crm-search { position:relative; display:flex; align-items:center; }
    .crm-search input { width:300px; max-width:42vw; height:44px; border-radius:12px; border:1px solid var(--line-strong);
      background:var(--panel); color:var(--txt); padding:0 1rem 0 2.6rem; font-size:.875rem; font-family:inherit; outline:none; transition:border-color .15s, box-shadow .15s; }
    .crm-search input::placeholder { color:var(--txt-3); }
    .crm-search input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-softer); }
    .crm-search > .material-symbols-rounded { position:absolute; left:.85rem; top:50%; transform:translateY(-50%); color:var(--txt-3); font-size:1.2rem; }

    .crm-btn-primary { display:inline-flex; align-items:center; gap:.45rem; height:44px; padding:0 1.3rem; border:none; cursor:pointer;
      border-radius:12px; font-weight:600; font-size:.875rem; color:var(--on-accent); font-family:inherit; white-space:nowrap;
      background:linear-gradient(135deg,var(--accent),var(--accent-2)); box-shadow:0 6px 20px var(--accent-glow); }
    .crm-btn-primary:hover { filter:brightness(1.05); }
    .crm-btn-primary:disabled { opacity:.5; cursor:not-allowed; box-shadow:none; }
    .crm-btn-primary .material-symbols-rounded { font-size:1.2rem; }
    .crm-btn-outline { height:42px; padding:0 1.25rem; border-radius:12px; border:1px solid var(--line-strong);
      background:transparent; color:var(--txt-2); font-weight:600; font-size:.875rem; cursor:pointer; font-family:inherit; }
    .crm-btn-outline:hover { color:var(--txt); }
    .crm-icon-btn { width:38px; height:38px; border-radius:10px; border:1px solid var(--line-strong); background:var(--panel);
      color:var(--txt-2); display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .crm-icon-btn:hover { color:var(--txt); border-color:var(--accent); }

    .crm-chip { display:inline-flex; align-items:center; gap:.4rem; height:38px; padding:0 .95rem; border-radius:10px;
      border:1px solid var(--line-strong); background:var(--panel); color:var(--txt-2); font-size:.82rem; font-weight:600; cursor:pointer; font-family:inherit; }
    .crm-chip:hover { color:var(--txt); border-color:var(--accent); }
    .crm-chip .material-symbols-rounded { font-size:1.05rem; }
    .crm-chip--sm { height:32px; padding:0 .8rem; font-size:.78rem; font-weight:500; }

    /* KPI */
    .kpi-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1.1rem; margin-bottom:1.5rem; }
    .kpi-card { display:flex; align-items:flex-start; gap:1rem; background:var(--panel); border:1px solid var(--line);
      border-radius:16px; padding:1.25rem; transition:transform .18s var(--ease-ios,ease), border-color .18s, box-shadow .18s; }
    .kpi-card:hover { transform:translateY(-2px); border-color:var(--line-strong); box-shadow:var(--shadow-md); }
    .kpi-card__icon { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .kpi-card__icon .material-symbols-rounded { font-size:1.5rem; }
    .kpi-card__icon--blue { background:var(--color-info-light); color:var(--color-info); }
    .kpi-card__icon--green { background:var(--color-success-light); color:var(--color-success); }
    .kpi-card__icon--teal { background:var(--accent-soft); color:var(--accent); }
    .kpi-card__icon--amber { background:var(--color-warning-light); color:var(--color-warning); }
    .kpi-card__body { min-width:0; }
    .kpi-card__label { font-size:.8rem; font-weight:500; color:var(--txt-2); margin:0; }
    .kpi-card__value { font-size:2rem; font-weight:800; line-height:1.1; margin:.2rem 0 .25rem; color:var(--text-title); }
    .kpi-card__delta { font-size:.76rem; font-weight:600; margin:0; display:inline-flex; align-items:center; gap:.2rem; }
    .kpi-card__delta .material-symbols-rounded { font-size:.95rem; }
    .kpi-card__delta--up, .kpi-card__delta--ok { color:var(--color-success); }
    .kpi-card__delta--teal { color:var(--accent); }
    .kpi-card__delta--warn { color:var(--color-warning); }

    /* Panel */
    .panel { background:var(--panel); border:1px solid var(--line); border-radius:18px; padding:1.25rem 1.4rem; }
    .panel--table { padding:1.25rem 0 .5rem; }
    .panel__head { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1rem; padding:0 1.4rem; }
    .panel--table .panel__head { padding:0 1.4rem; }
    .panel__title { font-size:1.05rem; font-weight:700; margin:0; color:var(--text-title); }

    /* Table */
    .tbl { width:100%; }
    .tbl__head, .tbl__row { display:grid; grid-template-columns:2.4fr 1.1fr 1.8fr 1.1fr .7fr .9fr .8fr; align-items:center; gap:1rem; padding:.85rem 1.4rem; }
    .tbl__head { font-size:.7rem; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--txt-3); border-bottom:1px solid var(--line); border-top:1px solid var(--line); }
    .tbl__row { border-bottom:1px solid var(--line); transition:background .12s; }
    .tbl__row:last-child { border-bottom:none; }
    .tbl__row:hover { background:var(--surface-1); }
    .tbl__c-center { text-align:center; }
    .tbl__c-right { text-align:right; }
    .tbl__cell-name { display:flex; align-items:center; gap:.8rem; min-width:0; }
    .tbl__name-text { display:flex; flex-direction:column; min-width:0; }
    .tbl__name { font-weight:600; font-size:.875rem; color:var(--txt); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tbl__doc { font-size:.74rem; color:var(--txt-3); margin-top:.1rem; }
    .tbl__muted { font-size:.85rem; color:var(--txt-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .crm-avatar { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-weight:700; font-size:.85rem; color:#fff; flex-shrink:0; }

    .pix-on { color:var(--color-success); font-size:1.25rem; }
    .pix-off { color:var(--txt-3); font-size:1.25rem; }

    /* Badges */
    .crm-badge { display:inline-flex; align-items:center; gap:.32rem; font-size:.74rem; font-weight:600; padding:.3rem .7rem; border-radius:999px; white-space:nowrap; }
    .crm-badge--ok { background:var(--color-success-light); color:var(--color-success); }
    .crm-badge--muted { background:var(--surface-2); color:var(--txt-2); }
    .crm-badge--warn { background:var(--color-warning-light); color:var(--color-warning); }

    /* Actions */
    .crm-actions { display:flex; gap:.25rem; justify-content:flex-end; }
    .crm-actions button { width:32px; height:32px; border-radius:8px; border:none; background:transparent; color:var(--txt-3);
      display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .crm-actions button:hover { background:var(--surface-2); color:var(--accent); }
    .crm-actions button:last-child:hover { color:var(--color-error); }
    .crm-actions button .material-symbols-rounded { font-size:1.1rem; }

    /* Pagination */
    .pager { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 1.4rem .5rem; flex-wrap:wrap; }
    .pager__info { font-size:.82rem; color:var(--txt-3); }
    .pager__nav { display:flex; align-items:center; gap:.35rem; }
    .pager__btn { min-width:34px; height:34px; padding:0 .5rem; border-radius:9px; border:1px solid var(--line-strong);
      background:var(--panel); color:var(--txt-2); font-size:.82rem; font-weight:600; cursor:pointer; font-family:inherit;
      display:inline-flex; align-items:center; justify-content:center; }
    .pager__btn:hover:not(:disabled) { border-color:var(--accent); color:var(--txt); }
    .pager__btn.is-active { background:linear-gradient(135deg,var(--accent),var(--accent-2)); border-color:transparent; color:var(--on-accent); }
    .pager__btn:disabled { opacity:.4; cursor:not-allowed; }
    .pager__btn .material-symbols-rounded { font-size:1.1rem; }
    .pager__dots { color:var(--txt-3); padding:0 .2rem; }
    .pager__size select { height:34px; border-radius:9px; border:1px solid var(--line-strong); background:var(--panel); color:var(--txt-2);
      font-size:.82rem; font-family:inherit; padding:0 .6rem; cursor:pointer; outline:none; }

    /* Widgets */
    .widgets { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1.1rem; margin-top:1.5rem; }
    .widget { padding:1.25rem 1.4rem; }
    .widget .panel__head { padding:0; margin-bottom:1.1rem; }
    .widget__title { display:inline-flex; align-items:center; gap:.45rem; font-size:.95rem; font-weight:700; margin:0; color:var(--text-title); }
    .widget__title .material-symbols-rounded { font-size:1.15rem; color:var(--accent); }
    .widget__empty { color:var(--txt-3); font-size:.85rem; text-align:center; padding:1.5rem 0; }

    /* Bars */
    .bars { display:flex; flex-direction:column; gap:.95rem; }
    .bar-row { display:grid; grid-template-columns:1fr; gap:.3rem; }
    .bar-row__name { font-size:.78rem; color:var(--txt-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .bar-row__track { height:9px; border-radius:999px; background:var(--surface-2); overflow:hidden; }
    .bar-row__fill { height:100%; border-radius:999px; background:linear-gradient(90deg,var(--accent),var(--accent-2)); transition:width .4s var(--ease-ios,ease); }
    .bar-row__val { font-size:.74rem; font-weight:600; color:var(--txt-3); }

    /* Ranking */
    .rank { display:flex; flex-direction:column; }
    .rank-row { display:flex; align-items:center; gap:.7rem; padding:.6rem 0; border-bottom:1px solid var(--line); }
    .rank-row:last-child { border-bottom:none; }
    .rank-row__pos { width:24px; height:24px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-size:.74rem; font-weight:700; background:var(--surface-2); color:var(--txt-2); }
    .rank-row__pos--1 { background:var(--color-warning-light); color:var(--color-warning); }
    .rank-row__pos--2 { background:var(--accent-soft); color:var(--accent); }
    .rank-row__pos--3 { background:var(--color-info-light); color:var(--color-info); }
    .rank-row__name { flex:1; font-size:.82rem; font-weight:500; color:var(--txt); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rank-row__val { font-size:.8rem; font-weight:600; color:var(--txt-2); white-space:nowrap; }
    .rank-row__pct { font-size:.74rem; color:var(--txt-3); width:36px; text-align:right; }

    /* Donut */
    .donut-wrap { display:flex; align-items:center; gap:1.5rem; }
    .donut { width:130px; height:130px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .donut__hole { width:88px; height:88px; border-radius:50%; background:var(--panel); display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .donut__total { font-size:1.6rem; font-weight:800; color:var(--text-title); line-height:1; }
    .donut__cap { font-size:.72rem; color:var(--txt-3); margin-top:.15rem; }
    .legend { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.7rem; flex:1; }
    .legend li { display:flex; align-items:center; gap:.5rem; font-size:.82rem; color:var(--txt-2); }
    .legend li b { margin-left:auto; color:var(--txt); font-weight:600; }
    .legend__dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .legend__dot--ok { background:var(--color-success); }
    .legend__dot--warn { background:var(--color-warning); }
    .legend__dot--muted { background:var(--surface-4); }

    /* Skeleton / empty */
    .crm-skel { height:12px; border-radius:6px; background:linear-gradient(90deg,var(--surface-2),var(--surface-3),var(--surface-2)); }
    .crm-skel--av { width:40px; height:40px; border-radius:50%; flex-shrink:0; }
    .crm-empty { text-align:center; padding:3.5rem 1rem; color:var(--txt-3); }
    .crm-empty .material-symbols-rounded { font-size:2.5rem; opacity:.5; }
    .crm-empty p { margin:.75rem 0 0; font-size:.9rem; }

    /* Modal */
    .crm-modal__backdrop { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(2px); z-index:40; }
    .crm-modal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:min(760px,94vw); max-height:90vh; overflow:auto;
      background:var(--panel-2); border:1px solid var(--line-strong); border-radius:18px; padding:1.5rem; z-index:41; box-shadow:0 24px 60px rgba(0,0,0,.5); }
    .nc-head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.25rem; }
    .nc-title { font-size:1.4rem; font-weight:800; color:var(--text-title); margin:0; letter-spacing:-.01em; }
    .nc-sub { color:var(--txt-2); font-size:.85rem; margin:.25rem 0 0; }
    .nc-section { font-size:.95rem; font-weight:700; color:var(--accent); margin:1.4rem 0 .8rem; }
    .nc-section:first-of-type { margin-top:0; }
    .nc-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .nc-field { display:flex; flex-direction:column; gap:.35rem; }
    .nc-field.span-2 { grid-column:1/-1; }
    .nc-field label { font-size:.72rem; font-weight:600; color:var(--txt-2); letter-spacing:.02em; }
    .nc-req { color:var(--color-error); }
    .nc-input { height:44px; width:100%; box-sizing:border-box; border-radius:10px; border:1px solid var(--line-strong);
      background:var(--bg); color:var(--txt); padding:0 .85rem; font-size:.875rem; font-family:inherit; outline:none; transition:border-color .15s, box-shadow .15s; }
    .nc-input::placeholder { color:var(--txt-3); }
    .nc-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-softer); }
    select.nc-input { appearance:none; -webkit-appearance:none; cursor:pointer; padding-right:2.2rem;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2393a4b1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat:no-repeat; background-position:right .8rem center; }
    select.nc-input option { background:var(--panel-2); color:var(--txt); }
    .nc-input-wrap { position:relative; display:flex; align-items:center; }
    .nc-input-wrap .nc-input { padding-right:3rem; }
    .nc-fetch { position:absolute; right:5px; top:50%; transform:translateY(-50%); width:34px; height:34px; border-radius:8px;
      border:none; background:var(--accent-soft); color:var(--accent); cursor:pointer; display:flex; align-items:center; justify-content:center; }
    .nc-fetch:hover:not(:disabled) { background:var(--accent-softer); }
    .nc-fetch:disabled { opacity:.4; cursor:not-allowed; }
    .nc-fetch .material-symbols-rounded { font-size:1.15rem; }
    .nc-spin { animation:nc-spin 1s linear infinite; }
    @keyframes nc-spin { to { transform:rotate(360deg); } }
    .nc-hint { font-size:.7rem; color:var(--txt-3); }
    .nc-foot { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1.5rem; }
    .nc-foot__actions { display:flex; gap:.75rem; }

    /* ── Responsivo ── */
    @media (max-width:1280px) { .kpi-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:1100px) { .widgets { grid-template-columns:1fr; } }
    @media (max-width:1024px) {
      .tbl__head, .tbl__row { grid-template-columns:2fr 1.4fr 1fr .7fr .9fr .8fr; }
      .tbl__head span:nth-child(3), .tbl__row > span:nth-child(3) { display:none; } /* esconde E-mail */
    }
    @media (max-width:760px) {
      .crm-page { padding:1.1rem; }
      .crm-page__head { flex-direction:column; align-items:stretch; }
      .crm-page__title { font-size:1.6rem; }
      .crm-head__actions { flex-direction:column; align-items:stretch; }
      .crm-search input { width:100%; max-width:none; }
      .crm-btn-primary { justify-content:center; }
      .kpi-grid { grid-template-columns:1fr; }

      /* Tabela → cards empilhados */
      .tbl__head { display:none; }
      .tbl__row { display:block; padding:1rem 1.1rem; margin:0 1rem .75rem; border:1px solid var(--line); border-radius:14px; background:var(--panel); }
      .panel--table { padding:1.25rem 0; }
      .tbl__cell-name { margin-bottom:.6rem; }
      .tbl__row > span[data-label] { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.5rem 0; border-top:1px solid var(--line); text-align:left !important; }
      .tbl__row > span[data-label]::before { content:attr(data-label); font-size:.68rem; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--txt-3); }
      .crm-actions { justify-content:flex-end; }
      .pager { flex-direction:column; align-items:stretch; text-align:center; }
      .pager__nav { justify-content:center; }
      .donut-wrap { flex-direction:column; align-items:center; text-align:center; }
      .legend { width:100%; }
      .nc-form-grid { grid-template-columns:1fr; }
      .nc-field.span-2 { grid-column:1; }
      .nc-foot { flex-direction:column-reverse; align-items:stretch; }
      .nc-foot__actions { flex-direction:column-reverse; }
      .nc-foot__actions .crm-btn-primary, .nc-foot__actions .crm-btn-outline { width:100%; justify-content:center; }
    }
  `],
})
export class FornecedoresComponent implements OnInit {
  items = signal<Fornecedor[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  searchTerm = signal('');
  page = signal(1);
  pageSize = signal(5);
  cnpjLoading = signal(false);
  form: FormGroup;
  ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  // Paleta determinística para avatares (tokens de chart).
  private avatarPalette = [
    'linear-gradient(135deg,var(--chart-1),var(--chart-6))',
    'linear-gradient(135deg,var(--chart-2),var(--chart-12))',
    'linear-gradient(135deg,var(--chart-3),var(--chart-8))',
    'linear-gradient(135deg,var(--chart-4),var(--chart-7))',
    'linear-gradient(135deg,var(--chart-5),var(--chart-9))',
    'linear-gradient(135deg,var(--chart-7),var(--chart-4))',
  ];

  constructor(private fb: FormBuilder, private appwrite: AppwriteService, private snackBar: MatSnackBar, private http: HttpClient) {
    this.form = this.fb.group({
      razaoSocial: ['', Validators.required], nomeFantasia: ['', Validators.required],
      tipo: ['PJ'], cnpjCpf: ['', Validators.required], inscricaoEstadual: [''],
      email: ['', [Validators.required, Validators.email]], telefone: [''],
      endereco: [''], cidade: [''], estado: [''], cep: [''],
      banco: [''], agencia: [''], conta: [''], chavePix: [''],
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.appwrite.listDocuments<Fornecedor>('fornecedores').subscribe({
      next: d => { this.items.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Filtro + paginação ──
  filtered = computed(() => {
    const t = this.searchTerm().toLowerCase().trim();
    const list = this.items();
    if (!t) return list;
    return list.filter(f =>
      this.nomeDe(f).toLowerCase().includes(t) ||
      f.razaoSocial?.toLowerCase().includes(t) ||
      (f.cpfCnpj || '').includes(t) ||
      f.cidade?.toLowerCase().includes(t),
    );
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  rangeStart = computed(() => this.filtered().length === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1);
  rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.filtered().length));

  pages = computed<number[]>(() => {
    const total = this.totalPages(), cur = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out: number[] = [1];
    const from = Math.max(2, cur - 1), to = Math.min(total - 1, cur + 1);
    if (from > 2) out.push(-1);
    for (let p = from; p <= to; p++) out.push(p);
    if (to < total - 1) out.push(-1);
    out.push(total);
    return out;
  });

  onSearch(ev: Event) { this.searchTerm.set((ev.target as HTMLInputElement).value); this.page.set(1); }
  goTo(p: number) { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }
  setPageSize(ev: Event) { this.pageSize.set(+(ev.target as HTMLSelectElement).value); this.page.set(1); }

  // ── KPIs ──
  total = computed(() => this.items().length);
  isActive(f: Fornecedor): boolean { return (f.status || 'ATIVO').toUpperCase() === 'ATIVO'; }
  countActive = computed(() => this.items().filter(f => this.isActive(f)).length);
  countWithPix = computed(() => this.items().filter(f => !!f.chavePix).length);
  countPendentes = computed(() => this.items().filter(f => (f.status || '').toUpperCase() === 'PENDENTE').length);
  countInactive = computed(() => this.items().filter(f => { const s = (f.status || 'ATIVO').toUpperCase(); return s === 'INATIVO' || s === 'PENDENTE'; }).length);

  pct(n: number): number { const t = this.total(); return t ? Math.round((n / t) * 100) : 0; }

  novosEsteMes = computed(() => {
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();
    return this.items().filter(f => {
      if (!f.$createdAt) return false;
      const d = new Date(f.$createdAt);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  });

  // ── Donut (background conic-gradient a partir dos status reais) ──
  donutGradient = computed(() => {
    const t = this.total();
    if (!t) return 'var(--surface-2)';
    const ok = this.countActive(), warn = this.countInactive() - this.countPendentes(), pend = this.countPendentes();
    const a1 = (ok / t) * 360;
    const a2 = a1 + (warn / t) * 360;
    const a3 = a2 + (pend / t) * 360;
    return `conic-gradient(var(--color-success) 0deg ${a1}deg, var(--color-warning) ${a1}deg ${a2}deg, var(--surface-4) ${a2}deg ${a3}deg, var(--surface-2) ${a3}deg 360deg)`;
  });

  // ── Widgets de compras (valores ilustrativos, derivados de forma determinística
  //    do cadastro até a integração com o módulo de Compras estar disponível) ──
  topCompras = computed(() => {
    const list = this.items().filter(f => this.isActive(f));
    const scored = list.map(f => ({ nome: this.nomeDe(f), valor: this.pseudoValor(f) }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
    const max = scored.length ? scored[0].valor : 1;
    const totalV = scored.reduce((s, x) => s + x.valor, 0) || 1;
    return scored.map(x => ({ ...x, pct: Math.round((x.valor / totalV) * 100), barPct: Math.round((x.valor / max) * 100) }));
  });

  private pseudoValor(f: Fornecedor): number {
    const seed = (f.cpfCnpj || f.razaoSocial || f.$id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return 8000 + (seed % 520) * 100; // R$ 8.000 – ~R$ 60.000
  }

  // ── Helpers visuais ──
  nomeDe(f: Fornecedor): string { return f.nomeFantasia || f.razaoSocial || f.nome || '—'; }

  initials(name?: string): string {
    if (!name || name === '—') return '?';
    return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  avatarBg(f: Fornecedor): string {
    const key = this.nomeDe(f);
    const idx = (key.charCodeAt(0) || 0) % this.avatarPalette.length;
    return this.avatarPalette[idx];
  }

  formatDoc(doc: string): string {
    if (!doc) return '';
    if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return doc;
  }

  // ── Puxador de dados: CNPJ na Receita Federal (integracoes-service) ──
  onlyDigits(v: string | null | undefined): string { return (v || '').replace(/\D/g, ''); }

  /** Dispara a busca na Receita quando o CNPJ tiver 14 dígitos. */
  onCnpjInput(value: string) {
    const digits = this.onlyDigits(value);
    if (this.form.get('cnpjCpf')?.value !== digits) {
      this.form.patchValue({ cnpjCpf: digits }, { emitEvent: false });
    }
    if (digits.length === 14 && this.form.value.tipo !== 'PF') {
      this.buscarCnpj(digits);
    }
  }

  /** Consulta os dados do CNPJ via backend e preenche o formulário. */
  buscarCnpj(cnpj: string) {
    if (this.cnpjLoading() || cnpj.length !== 14) return;
    this.cnpjLoading.set(true);

    this.http.get<DadosCnpj>(`${environment.apiUrl}/integracoes/cnpj/${cnpj}`).subscribe({
      next: (d) => {
        const endereco = [d.logradouro, d.numero]
          .filter((p): p is string => !!p && p.trim().length > 0)
          .join(' ')
          .trim();

        this.form.patchValue({
          razaoSocial: d.razaoSocial || this.form.value.razaoSocial,
          nomeFantasia: d.nomeFantasia || d.razaoSocial || this.form.value.nomeFantasia,
          email: d.email || this.form.value.email,
          telefone: d.telefone || this.form.value.telefone,
          endereco: endereco || this.form.value.endereco,
          cidade: d.municipio || this.form.value.cidade,
          estado: d.uf || this.form.value.estado,
          cep: (d.cep || '').toString().replace(/\D/g, '') || this.form.value.cep,
        });

        this.cnpjLoading.set(false);
        this.snackBar.open('Dados preenchidos pela Receita Federal', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: (err) => {
        this.cnpjLoading.set(false);
        const msg = err.status === 404 ? 'CNPJ não encontrado na Receita'
          : (err.error?.message || 'Não foi possível consultar o CNPJ');
        this.snackBar.open(msg, 'Fechar', { duration: 4000, panelClass: ['error-snackbar'] });
      },
    });
  }

  // ── CRUD ──
  openForm(f?: Fornecedor) {
    if (f) {
      this.editingId.set(f.$id);
      this.form.reset({ tipo: f.tipo || 'PJ' });
      this.form.patchValue({
        razaoSocial: f.razaoSocial || f.nome || '',
        nomeFantasia: f.nomeFantasia || f.nome || '',
        cnpjCpf: f.cpfCnpj || '',
        inscricaoEstadual: f.inscricaoEstadual || '',
        email: f.email || '', telefone: f.telefone || '',
        endereco: f.endereco || '', cidade: f.cidade || '',
        estado: f.uf || '', cep: f.cep || '',
        banco: f.banco || '', agencia: f.agencia || '', conta: f.conta || '', chavePix: f.chavePix || '',
      });
    } else {
      this.editingId.set(null);
      this.form.reset({ tipo: 'PJ' });
    }
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingId.set(null); }

  save() {
    if (this.form.invalid) return;
    const v = this.form.value;
    // Mapeia os campos do formulário para os atributos reais da collection Appwrite.
    const data: Record<string, any> = {
      nome: (v.nomeFantasia || v.razaoSocial || '').trim(),
      razaoSocial: v.razaoSocial || '',
      nomeFantasia: v.nomeFantasia || '',
      cpfCnpj: this.onlyDigits(v.cnpjCpf),
      tipo: v.tipo || 'PJ',
      inscricaoEstadual: v.inscricaoEstadual || '',
      email: v.email || '',
      telefone: v.telefone || '',
      endereco: v.endereco || '',
      cidade: v.cidade || '',
      uf: v.estado || '',
      cep: (v.cep || '').toString().replace(/\D/g, ''),
      banco: v.banco || '',
      agencia: v.agencia || '',
      conta: v.conta || '',
      chavePix: v.chavePix || '',
      status: 'ATIVO',
      empresaId: 'default',
      tenantId: 'default',
    };
    const id = this.editingId();
    if (!id) data['createdAt'] = new Date().toISOString();
    const obs = id ? this.appwrite.updateDocument('fornecedores', id, data) : this.appwrite.createDocument('fornecedores', data);
    obs.subscribe({
      next: () => { this.snackBar.open(id ? 'Atualizado!' : 'Criado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.closeForm(); this.load(); },
      error: e => this.snackBar.open(e.message || 'Erro', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] }),
    });
  }

  delete(f: Fornecedor) {
    if (!confirm(`Excluir "${this.nomeDe(f)}"?`)) return;
    this.appwrite.deleteDocument('fornecedores', f.$id).subscribe({
      next: () => { this.snackBar.open('Excluído', 'OK', { duration: 3000 }); this.load(); },
      error: () => this.snackBar.open('Erro ao excluir', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }
}
