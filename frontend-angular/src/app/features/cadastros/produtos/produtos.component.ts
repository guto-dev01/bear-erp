import { Component, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface Produto {
  $id: string;
  codigo: string;
  descricao: string;
  tipo: string;                 // PRODUTO | SERVICO
  unidade: string;
  ncm: string;
  cest: string;
  cfop: string;
  preco: number;                // valor de venda
  custoMedio: number;           // valor de custo
  estoqueAtual: number;
  estoqueMinimo: number;
  categoria: string;
  marca: string;
  status: string;               // ATIVO | INATIVO
  empresaId: string;
  tenantId: string;
  $createdAt: string;
}

/** Status visual derivado (combina status + situação de estoque). */
type StatusVisual = 'ATIVO' | 'INATIVO' | 'SEM_ESTOQUE' | 'BAIXO_ESTOQUE';

@Component({
  selector: 'bear-produtos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTooltipModule, MatSnackBarModule],
  template: `
    <div class="cat">
      <div class="cat-page">
        <!-- ═══ Header ═══ -->
        <div class="cat-page__head">
          <div>
            <h1 class="cat-page__title">Produtos e Serviços</h1>
            <p class="cat-page__sub">Catálogo completo de produtos e serviços da empresa.</p>
          </div>
          <div class="cat-head__actions">
            <div class="cat-search">
              <span class="material-symbols-rounded">search</span>
              <input placeholder="Pesquisar por nome, código ou NCM…" [value]="searchTerm()" (input)="onSearch($event)">
            </div>
            <button class="cat-btn-primary" (click)="openForm()">
              <span class="material-symbols-rounded">add</span> Novo Item
            </button>
          </div>
        </div>

        <!-- ═══ KPI cards ═══ -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--blue"><span class="material-symbols-rounded">inventory_2</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Total de Produtos</p>
              <p class="kpi-card__value">{{ countProdutos() }}</p>
              <p class="kpi-card__delta kpi-card__delta--up"><span class="material-symbols-rounded">arrow_upward</span> {{ novosEsteMes() }} este mês</p>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--purple"><span class="material-symbols-rounded">design_services</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Total de Serviços</p>
              <p class="kpi-card__value">{{ countServicos() }}</p>
              <p class="kpi-card__delta kpi-card__delta--purple">{{ pct(countServicos()) }}% do catálogo</p>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--green"><span class="material-symbols-rounded">check_circle</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Itens Ativos</p>
              <p class="kpi-card__value">{{ countAtivos() }}</p>
              <p class="kpi-card__delta kpi-card__delta--ok">{{ pct(countAtivos()) }}% do total</p>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--amber"><span class="material-symbols-rounded">payments</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Valor Total em Estoque</p>
              <p class="kpi-card__value kpi-card__value--sm">{{ valorEstoque() | currency:'BRL' }}</p>
              <p class="kpi-card__delta kpi-card__delta--muted">{{ countProdutos() }} produtos</p>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--red"><span class="material-symbols-rounded">warning</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Baixo Estoque</p>
              <p class="kpi-card__value">{{ countBaixoEstoque() }}</p>
              <p class="kpi-card__delta kpi-card__delta--warn">itens abaixo do mínimo</p>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--teal"><span class="material-symbols-rounded">star</span></div>
            <div class="kpi-card__body">
              <p class="kpi-card__label">Mais Vendidos</p>
              <p class="kpi-card__value">{{ maisVendidos().length }}</p>
              <p class="kpi-card__delta kpi-card__delta--teal">produtos em destaque</p>
            </div>
          </div>
        </div>

        <!-- ═══ Toolbar de filtros ═══ -->
        <div class="panel panel--table">
          <div class="cat-toolbar">
            <div class="seg">
              @for (s of segmentos; track s.value) {
                <button class="seg__btn" [class.is-active]="segmento() === s.value" (click)="setSegmento(s.value)">
                  {{ s.label }}
                  @if (s.value === '') { <span class="seg__count">{{ items().length }}</span> }
                </button>
              }
            </div>
            <div class="cat-toolbar__right">
              <div class="cat-search cat-search--inline">
                <span class="material-symbols-rounded">search</span>
                <input placeholder="Pesquisar por nome, código ou NCM…" [value]="searchTerm()" (input)="onSearch($event)">
              </div>
              <button class="cat-chip" [class.is-active]="showAdvanced()" (click)="showAdvanced.set(!showAdvanced())">
                <span class="material-symbols-rounded">tune</span> Filtros avançados
                <span class="material-symbols-rounded cat-chip__caret" [class.is-open]="showAdvanced()">expand_more</span>
              </button>
            </div>
          </div>

          <!-- Filtros avançados -->
          @if (showAdvanced()) {
            <div class="adv">
              <div class="adv__field">
                <label>Categoria</label>
                <select [value]="fCategoria()" (change)="fCategoria.set($any($event.target).value); page.set(1)">
                  <option value="">Todas</option>
                  @for (c of categorias(); track c) { <option [value]="c">{{ c }}</option> }
                </select>
              </div>
              <div class="adv__field">
                <label>Marca</label>
                <select [value]="fMarca()" (change)="fMarca.set($any($event.target).value); page.set(1)">
                  <option value="">Todas</option>
                  @for (m of marcas(); track m) { <option [value]="m">{{ m }}</option> }
                </select>
              </div>
              <div class="adv__field">
                <label>Unidade</label>
                <select [value]="fUnidade()" (change)="fUnidade.set($any($event.target).value); page.set(1)">
                  <option value="">Todas</option>
                  @for (u of unidadesUsadas(); track u) { <option [value]="u">{{ u }}</option> }
                </select>
              </div>
              <div class="adv__field">
                <label>Status</label>
                <select [value]="fStatus()" (change)="fStatus.set($any($event.target).value); page.set(1)">
                  <option value="">Todos</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                  <option value="BAIXO_ESTOQUE">Baixo estoque</option>
                  <option value="SEM_ESTOQUE">Sem estoque</option>
                </select>
              </div>
              <button class="adv__clear" (click)="clearAdvanced()"><span class="material-symbols-rounded">restart_alt</span> Limpar</button>
            </div>
          }

          <!-- ═══ Tabela ═══ -->
          <div class="tbl-wrap">
            <div class="tbl">
              <div class="tbl__head">
                <span class="tbl__c-center">Foto</span>
                <span>Código</span>
                <span>Produto / Serviço</span>
                <span>Categoria</span>
                <span class="tbl__c-center">Tipo</span>
                <span class="tbl__c-center">Unid.</span>
                <span class="tbl__c-center">Estoque</span>
                <span class="tbl__c-right">Valor Venda</span>
                <span class="tbl__c-right">Valor Custo</span>
                <span class="tbl__c-right">Margem</span>
                <span class="tbl__c-center">Status</span>
                <span class="tbl__c-right">Ações</span>
              </div>

              @if (loading()) {
                @for (i of [1,2,3,4,5,6]; track i) {
                  <div class="tbl__row">
                    <div class="cat-skel cat-skel--thumb" style="margin:0 auto"></div>
                    <div class="cat-skel" style="width:70%"></div>
                    <div><div class="cat-skel" style="width:80%"></div><div class="cat-skel" style="width:50%;margin-top:.4rem"></div></div>
                    <div class="cat-skel" style="width:60%"></div>
                    <div class="cat-skel" style="width:50%;margin:0 auto"></div>
                    <div class="cat-skel" style="width:40%;margin:0 auto"></div>
                    <div class="cat-skel" style="width:40%;margin:0 auto"></div>
                    <div class="cat-skel" style="width:70%;margin-left:auto"></div>
                    <div class="cat-skel" style="width:70%;margin-left:auto"></div>
                    <div class="cat-skel" style="width:50%;margin-left:auto"></div>
                    <div class="cat-skel" style="width:60%;margin:0 auto"></div>
                    <span></span>
                  </div>
                }
              } @else if (filtered().length === 0) {
                <div class="cat-empty">
                  <div class="cat-empty__icon"><span class="material-symbols-rounded">inventory_2</span></div>
                  <h3 class="cat-empty__title">{{ temFiltro() ? 'Nenhum item encontrado' : 'Nenhum produto cadastrado' }}</h3>
                  <p class="cat-empty__desc">
                    {{ temFiltro()
                        ? 'Tente ajustar a busca ou os filtros aplicados.'
                        : 'Comece cadastrando seu primeiro produto ou serviço para organizar seu catálogo.' }}
                  </p>
                  @if (!temFiltro()) {
                    <button class="cat-btn-primary" (click)="openForm()"><span class="material-symbols-rounded">add</span> Cadastrar Produto</button>
                  } @else {
                    <button class="cat-btn-outline" (click)="resetFiltros()"><span class="material-symbols-rounded">restart_alt</span> Limpar filtros</button>
                  }
                </div>
              } @else {
                @for (p of paged(); track p.$id) {
                  <div class="tbl__row">
                    <span class="tbl__c-center" data-label="Foto">
                      <div class="cat-thumb" [style.background]="thumbBg(p)">
                        <span class="material-symbols-rounded">{{ p.tipo === 'SERVICO' ? 'handyman' : 'inventory_2' }}</span>
                      </div>
                    </span>
                    <span class="tbl__code" data-label="Código">{{ p.codigo || '—' }}</span>
                    <span class="tbl__cell-name" data-label="Produto / Serviço">
                      <span class="tbl__name-text">
                        <span class="tbl__name">{{ p.descricao || '—' }}</span>
                        <span class="tbl__doc">{{ p.ncm ? 'NCM ' + p.ncm : (p.marca || (p.tipo === 'SERVICO' ? 'Serviço' : 'Produto')) }}</span>
                      </span>
                    </span>
                    <span class="tbl__muted" data-label="Categoria">{{ p.categoria || '—' }}</span>
                    <span class="tbl__c-center" data-label="Tipo">
                      <span class="cat-badge" [ngClass]="p.tipo === 'SERVICO' ? 'cat-badge--purple' : 'cat-badge--info'">
                        {{ p.tipo === 'SERVICO' ? 'Serviço' : 'Produto' }}
                      </span>
                    </span>
                    <span class="tbl__c-center tbl__muted" data-label="Unidade">{{ p.unidade || '—' }}</span>
                    <span class="tbl__c-center" data-label="Estoque">
                      @if (p.tipo === 'SERVICO') {
                        <span class="tbl__muted">—</span>
                      } @else {
                        <span class="tbl__stock" [ngClass]="stockClass(p)">{{ p.estoqueAtual || 0 }}</span>
                      }
                    </span>
                    <span class="tbl__c-right tbl__price" data-label="Valor Venda">{{ p.preco | currency:'BRL' }}</span>
                    <span class="tbl__c-right tbl__muted" data-label="Valor Custo">{{ (p.custoMedio || 0) | currency:'BRL' }}</span>
                    <span class="tbl__c-right" data-label="Margem">
                      <span class="tbl__margin" [ngClass]="margemClass(p)">{{ margem(p) }}</span>
                    </span>
                    <span class="tbl__c-center" data-label="Status">
                      <span class="cat-badge" [ngClass]="statusBadgeClass(p)"><span class="cat-badge__dot"></span>{{ statusLabel(p) }}</span>
                    </span>
                    <span class="tbl__c-right cat-actions" data-label="Ações">
                      <button class="cat-actions__trigger" matTooltip="Ações" (click)="toggleMenu(p.$id, $event)">
                        <span class="material-symbols-rounded">more_vert</span>
                      </button>
                      @if (openMenuId() === p.$id) {
                        <div class="cat-menu" (click)="$event.stopPropagation()">
                          <button (click)="openForm(p, true)"><span class="material-symbols-rounded">visibility</span> Visualizar</button>
                          <button (click)="openForm(p)"><span class="material-symbols-rounded">edit</span> Editar</button>
                          <button (click)="duplicar(p)"><span class="material-symbols-rounded">content_copy</span> Duplicar</button>
                          <button (click)="movimentar(p)"><span class="material-symbols-rounded">swap_vert</span> Movimentar Estoque</button>
                          <button (click)="historico(p)"><span class="material-symbols-rounded">history</span> Histórico</button>
                          <div class="cat-menu__sep"></div>
                          <button class="cat-menu__danger" (click)="excluir(p)"><span class="material-symbols-rounded">delete</span> Excluir</button>
                        </div>
                      }
                    </span>
                  </div>
                }
              }
            </div>
          </div>

          <!-- Paginação -->
          @if (!loading() && filtered().length > 0) {
            <div class="pager">
              <span class="pager__info">Mostrando {{ rangeStart() }} a {{ rangeEnd() }} de {{ filtered().length }} itens</span>
              <div class="pager__nav">
                <button class="pager__btn" [disabled]="page() === 1" (click)="goTo(page() - 1)"><span class="material-symbols-rounded">chevron_left</span></button>
                @for (p of pages(); track $index) {
                  @if (p === -1) { <span class="pager__dots">…</span> }
                  @else { <button class="pager__btn" [class.is-active]="p === page()" (click)="goTo(p)">{{ p }}</button> }
                }
                <button class="pager__btn" [disabled]="page() === totalPages()" (click)="goTo(page() + 1)"><span class="material-symbols-rounded">chevron_right</span></button>
              </div>
              <div class="pager__size">
                <select [value]="pageSize()" (change)="setPageSize($event)">
                  <option [value]="10">10 por página</option>
                  <option [value]="25">25 por página</option>
                  <option [value]="50">50 por página</option>
                </select>
              </div>
            </div>
          }
        </div>

        <!-- ═══ Widgets inferiores ═══ -->
        <div class="widgets">
          <!-- Produtos mais vendidos -->
          <div class="panel widget">
            <div class="panel__head">
              <h3 class="widget__title"><span class="material-symbols-rounded">trophy</span> Produtos mais vendidos</h3>
              <button class="cat-chip cat-chip--sm">Ver relatório</button>
            </div>
            <div class="rank">
              @for (b of maisVendidos(); track b.nome; let i = $index) {
                <div class="rank-row">
                  <span class="rank-row__pos rank-row__pos--{{ i + 1 }}">{{ i + 1 }}</span>
                  <div class="rank-row__main">
                    <span class="rank-row__name">{{ b.nome }}</span>
                    <div class="rank-row__track"><div class="rank-row__fill" [style.width.%]="b.barPct"></div></div>
                  </div>
                  <span class="rank-row__val">{{ b.valor | currency:'BRL' }}<small>{{ b.qtd }} un.</small></span>
                </div>
              } @empty {
                <p class="widget__empty">Sem dados de vendas.</p>
              }
            </div>
          </div>

          <!-- Distribuição por categoria (donut) -->
          <div class="panel widget">
            <div class="panel__head">
              <h3 class="widget__title"><span class="material-symbols-rounded">donut_large</span> Distribuição por categoria</h3>
              <button class="cat-chip cat-chip--sm">Ver todas</button>
            </div>
            <div class="donut-wrap">
              <div class="donut" [style.background]="donutGradient()">
                <div class="donut__hole">
                  <span class="donut__total">{{ items().length }}</span>
                  <span class="donut__cap">Itens</span>
                </div>
              </div>
              <ul class="legend">
                @for (c of categoriaStats(); track c.nome) {
                  <li><span class="legend__dot" [style.background]="c.color"></span> {{ c.nome }} <b>{{ c.pct }}% ({{ c.count }})</b></li>
                } @empty {
                  <li class="widget__empty">Sem categorias.</li>
                }
              </ul>
            </div>
          </div>

          <!-- Evolução de estoque -->
          <div class="panel widget">
            <div class="panel__head">
              <h3 class="widget__title"><span class="material-symbols-rounded">show_chart</span> Evolução de estoque</h3>
              <span class="widget__hl">{{ valorEstoque() | currency:'BRL' }}</span>
            </div>
            <p class="widget__empty">Sem histórico de movimentação de estoque.</p>
          </div>
        </div>
      </div>

      <!-- ═══ Modal de cadastro (abas) ═══ -->
      @if (showForm()) {
        <div class="cat-modal__backdrop" (click)="closeForm()"></div>
        <div class="cat-modal">
          <div class="nc-head">
            <div>
              <h2 class="nc-title">{{ readonly() ? 'Detalhes do Item' : (editingId() ? 'Editar Produto/Serviço' : 'Novo Produto/Serviço') }}</h2>
              <p class="nc-sub">Preencha as informações do item para compor o catálogo.</p>
            </div>
            <button class="cat-icon-btn" (click)="closeForm()"><span class="material-symbols-rounded">close</span></button>
          </div>

          <div class="nc-tabs">
            @for (t of tabs; track t.id) {
              <button class="nc-tab" [class.is-active]="activeTab() === t.id" (click)="activeTab.set(t.id)">
                <span class="material-symbols-rounded">{{ t.icon }}</span> {{ t.label }}
              </button>
            }
          </div>

          <form [formGroup]="form" (ngSubmit)="salvar()">
            <fieldset [disabled]="readonly()" style="border:0;padding:0;margin:0;min-width:0;">
            <!-- Aba 1: Informações Gerais -->
            @if (activeTab() === 'geral') {
              <div class="nc-form-grid">
                <div class="nc-field span-2"><label>Nome <span class="nc-req">*</span></label><input class="nc-input" formControlName="descricao" placeholder="Ex.: Fone de Ouvido Bluetooth"></div>
                <div class="nc-field"><label>Tipo</label><select class="nc-input" formControlName="tipo"><option value="PRODUTO">Produto</option><option value="SERVICO">Serviço</option></select></div>
                <div class="nc-field"><label>Código / SKU</label><input class="nc-input" formControlName="codigo" placeholder="Gerado automaticamente"></div>
                <div class="nc-field"><label>Categoria</label><input class="nc-input" formControlName="categoria" list="cat-categorias" placeholder="Ex.: Eletrônicos"><datalist id="cat-categorias">@for (c of categorias(); track c) { <option [value]="c"></option> }</datalist></div>
                <div class="nc-field"><label>Marca</label><input class="nc-input" formControlName="marca" list="cat-marcas" placeholder="Ex.: Genérica"><datalist id="cat-marcas">@for (m of marcas(); track m) { <option [value]="m"></option> }</datalist></div>
                <div class="nc-field"><label>Status</label><select class="nc-input" formControlName="status"><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option></select></div>
              </div>
            }
            <!-- Aba 2: Fiscal -->
            @if (activeTab() === 'fiscal') {
              <div class="nc-form-grid">
                <div class="nc-field"><label>NCM</label><input class="nc-input" formControlName="ncm" placeholder="0000.00.00"></div>
                <div class="nc-field"><label>CEST</label><input class="nc-input" formControlName="cest" placeholder="00.000.00"></div>
                <div class="nc-field"><label>CFOP</label><input class="nc-input" formControlName="cfop" placeholder="5102"></div>
                <div class="nc-field"><label>Origem</label>
                  <select class="nc-input" formControlName="origem">
                    <option value="0">0 - Nacional</option>
                    <option value="1">1 - Estrangeira (importação direta)</option>
                    <option value="2">2 - Estrangeira (mercado interno)</option>
                  </select>
                </div>
              </div>
            }
            <!-- Aba 3: Preços -->
            @if (activeTab() === 'precos') {
              <div class="nc-form-grid">
                <div class="nc-field"><label>Valor de Custo</label><div class="nc-prefix"><span>R$</span><input class="nc-input" type="number" step="0.01" formControlName="custoMedio" placeholder="0,00"></div></div>
                <div class="nc-field"><label>Valor de Venda <span class="nc-req">*</span></label><div class="nc-prefix"><span>R$</span><input class="nc-input" type="number" step="0.01" formControlName="preco" placeholder="0,00"></div></div>
                <div class="nc-field span-2">
                  <div class="nc-margin-box">
                    <span class="material-symbols-rounded">trending_up</span>
                    <div><span class="nc-margin-box__cap">Margem de lucro estimada</span><b [ngClass]="margemFormClass()">{{ margemForm() }}</b></div>
                  </div>
                </div>
              </div>
            }
            <!-- Aba 4: Estoque -->
            @if (activeTab() === 'estoque') {
              <div class="nc-form-grid">
                <div class="nc-field"><label>Quantidade em Estoque</label><input class="nc-input" type="number" formControlName="estoqueAtual" placeholder="0" [attr.disabled]="form.value.tipo === 'SERVICO' ? true : null"></div>
                <div class="nc-field"><label>Estoque Mínimo</label><input class="nc-input" type="number" formControlName="estoqueMinimo" placeholder="0" [attr.disabled]="form.value.tipo === 'SERVICO' ? true : null"></div>
                <div class="nc-field"><label>Unidade</label>
                  <select class="nc-input" formControlName="unidade">
                    @for (u of unidades; track u.value) { <option [value]="u.value">{{ u.label }}</option> }
                  </select>
                </div>
                @if (form.value.tipo === 'SERVICO') {
                  <div class="nc-field span-2"><p class="nc-info"><span class="material-symbols-rounded">info</span> Serviços não controlam estoque.</p></div>
                }
              </div>
            }
            </fieldset>

            <div class="nc-foot">
              <div class="nc-foot__tabs-hint">
                <span class="material-symbols-rounded">lightbulb</span> {{ readonly() ? 'Modo somente leitura' : 'Navegue pelas abas para completar o cadastro' }}
              </div>
              <div class="nc-foot__actions">
                <button type="button" class="cat-btn-outline" (click)="closeForm()">{{ readonly() ? 'Fechar' : 'Cancelar' }}</button>
                @if (!readonly()) {
                  <button type="submit" class="cat-btn-primary" [disabled]="form.invalid">
                    <span class="material-symbols-rounded">{{ editingId() ? 'save' : 'add' }}</span>{{ editingId() ? 'Salvar' : 'Criar' }}
                  </button>
                }
              </div>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; min-height:100%; background:var(--bg-canvas); }
    .cat {
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
    .cat-page { padding:1.75rem; max-width:1480px; margin:0 auto; }
    .cat-page__head { display:flex; align-items:flex-start; justify-content:space-between; gap:1.5rem; margin-bottom:1.5rem; flex-wrap:wrap; }
    .cat-page__title { font-size:2rem; font-weight:800; letter-spacing:-.02em; margin:0; color:var(--text-title); }
    .cat-page__sub { color:var(--txt-2); font-size:.9rem; margin:.3rem 0 0; }
    .cat-head__actions { display:flex; align-items:center; gap:.75rem; }

    .cat-search { position:relative; display:flex; align-items:center; }
    .cat-search input { width:300px; max-width:42vw; height:44px; border-radius:12px; border:1px solid var(--line-strong);
      background:var(--panel); color:var(--txt); padding:0 1rem 0 2.6rem; font-size:.875rem; font-family:inherit; outline:none; transition:border-color .15s, box-shadow .15s; }
    .cat-search input::placeholder { color:var(--txt-3); }
    .cat-search input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-softer); }
    .cat-search > .material-symbols-rounded { position:absolute; left:.85rem; top:50%; transform:translateY(-50%); color:var(--txt-3); font-size:1.2rem; }
    .cat-search--inline input { width:280px; height:40px; }

    .cat-btn-primary { display:inline-flex; align-items:center; gap:.45rem; height:44px; padding:0 1.3rem; border:none; cursor:pointer;
      border-radius:12px; font-weight:600; font-size:.875rem; color:var(--on-accent); font-family:inherit; white-space:nowrap;
      background:linear-gradient(135deg,var(--accent),var(--accent-2)); box-shadow:0 6px 20px var(--accent-glow); transition:filter .15s; }
    .cat-btn-primary:hover { filter:brightness(1.05); }
    .cat-btn-primary:disabled { opacity:.5; cursor:not-allowed; box-shadow:none; }
    .cat-btn-primary .material-symbols-rounded { font-size:1.2rem; }
    .cat-btn-outline { height:42px; padding:0 1.25rem; border-radius:12px; border:1px solid var(--line-strong);
      background:transparent; color:var(--txt-2); font-weight:600; font-size:.875rem; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; gap:.4rem; }
    .cat-btn-outline:hover { color:var(--txt); border-color:var(--accent); }
    .cat-icon-btn { width:38px; height:38px; border-radius:10px; border:1px solid var(--line-strong); background:var(--panel);
      color:var(--txt-2); display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .cat-icon-btn:hover { color:var(--txt); border-color:var(--accent); }

    .cat-chip { display:inline-flex; align-items:center; gap:.4rem; height:40px; padding:0 .95rem; border-radius:11px;
      border:1px solid var(--line-strong); background:var(--panel); color:var(--txt-2); font-size:.82rem; font-weight:600; cursor:pointer; font-family:inherit; }
    .cat-chip:hover { color:var(--txt); border-color:var(--accent); }
    .cat-chip.is-active { color:var(--accent); border-color:var(--accent); background:var(--accent-soft); }
    .cat-chip .material-symbols-rounded { font-size:1.05rem; }
    .cat-chip__caret { transition:transform .2s; }
    .cat-chip__caret.is-open { transform:rotate(180deg); }
    .cat-chip--sm { height:32px; padding:0 .8rem; font-size:.78rem; font-weight:500; }

    /* KPI */
    .kpi-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:1rem; margin-bottom:1.5rem; }
    .kpi-card { display:flex; align-items:flex-start; gap:.9rem; background:var(--panel); border:1px solid var(--line);
      border-radius:16px; padding:1.15rem; position:relative; overflow:hidden;
      transition:transform .18s var(--ease-ios,ease), border-color .18s, box-shadow .18s; }
    .kpi-card::after { content:''; position:absolute; inset:0 0 auto 0; height:3px; opacity:0; transition:opacity .2s;
      background:linear-gradient(90deg,var(--accent),var(--accent-2)); }
    .kpi-card:hover { transform:translateY(-2px); border-color:var(--line-strong); box-shadow:var(--shadow-md); }
    .kpi-card:hover::after { opacity:1; }
    .kpi-card__icon { width:46px; height:46px; border-radius:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .kpi-card__icon .material-symbols-rounded { font-size:1.45rem; }
    .kpi-card__icon--blue { background:var(--color-info-light); color:var(--color-info); }
    .kpi-card__icon--green { background:var(--color-success-light); color:var(--color-success); }
    .kpi-card__icon--purple { background:var(--brand-accent-light); color:var(--brand-accent); }
    .kpi-card__icon--teal { background:var(--accent-soft); color:var(--accent); }
    .kpi-card__icon--amber { background:var(--color-warning-light); color:var(--color-warning); }
    .kpi-card__icon--red { background:var(--color-error-light); color:var(--color-error); }
    .kpi-card__body { min-width:0; }
    .kpi-card__label { font-size:.76rem; font-weight:500; color:var(--txt-2); margin:0; }
    .kpi-card__value { font-size:1.75rem; font-weight:800; line-height:1.1; margin:.2rem 0 .25rem; color:var(--text-title); }
    .kpi-card__value--sm { font-size:1.3rem; }
    .kpi-card__delta { font-size:.74rem; font-weight:600; margin:0; display:inline-flex; align-items:center; gap:.2rem; }
    .kpi-card__delta .material-symbols-rounded { font-size:.95rem; }
    .kpi-card__delta--up, .kpi-card__delta--ok { color:var(--color-success); }
    .kpi-card__delta--teal { color:var(--accent); }
    .kpi-card__delta--purple { color:var(--brand-accent); }
    .kpi-card__delta--warn { color:var(--color-warning); }
    .kpi-card__delta--muted { color:var(--txt-3); }

    /* Panel */
    .panel { background:var(--panel); border:1px solid var(--line); border-radius:18px; padding:1.25rem 1.4rem; }
    .panel--table { padding:0; overflow:hidden; }
    .panel__head { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
    .panel__title { font-size:1.05rem; font-weight:700; margin:0; color:var(--text-title); }

    /* Toolbar */
    .cat-toolbar { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1.1rem 1.4rem; flex-wrap:wrap; border-bottom:1px solid var(--line); }
    .cat-toolbar__right { display:flex; align-items:center; gap:.65rem; }
    .seg { display:inline-flex; background:var(--surface-2); border:1px solid var(--line); border-radius:12px; padding:4px; gap:2px; }
    .seg__btn { display:inline-flex; align-items:center; gap:.4rem; height:32px; padding:0 .85rem; border:none; background:transparent; cursor:pointer;
      border-radius:9px; font-size:.82rem; font-weight:600; color:var(--txt-2); font-family:inherit; transition:background .15s, color .15s; }
    .seg__btn:hover { color:var(--txt); }
    .seg__btn.is-active { background:var(--panel); color:var(--accent); box-shadow:var(--shadow-sm,0 1px 3px rgba(0,0,0,.2)); }
    .seg__count { font-size:.7rem; font-weight:700; background:var(--accent-soft); color:var(--accent); padding:.05rem .4rem; border-radius:6px; }

    /* Filtros avançados */
    .adv { display:flex; align-items:flex-end; gap:1rem; padding:1.1rem 1.4rem; border-bottom:1px solid var(--line); background:var(--surface-1); flex-wrap:wrap; }
    .adv__field { display:flex; flex-direction:column; gap:.35rem; min-width:160px; flex:1; }
    .adv__field label { font-size:.7rem; font-weight:600; color:var(--txt-2); letter-spacing:.02em; text-transform:uppercase; }
    .adv__field select { height:40px; border-radius:10px; border:1px solid var(--line-strong); background:var(--panel); color:var(--txt);
      font-size:.85rem; font-family:inherit; padding:0 .8rem; cursor:pointer; outline:none; }
    .adv__field select:focus { border-color:var(--accent); }
    .adv__clear { height:40px; padding:0 1rem; border-radius:10px; border:1px solid var(--line-strong); background:transparent; color:var(--txt-2);
      font-size:.82rem; font-weight:600; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; gap:.35rem; }
    .adv__clear:hover { color:var(--color-error); border-color:var(--color-error); }

    /* Table */
    .tbl-wrap { width:100%; overflow-x:auto; }
    .tbl { width:100%; min-width:1180px; }
    .tbl__head, .tbl__row { display:grid;
      grid-template-columns:56px 96px minmax(180px,2fr) 1.1fr 92px 64px 84px 1fr 1fr 84px 116px 60px;
      align-items:center; gap:.85rem; padding:.8rem 1.4rem; }
    .tbl__head { font-size:.68rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--txt-3); border-bottom:1px solid var(--line); }
    .tbl__row { border-bottom:1px solid var(--line); transition:background .12s; }
    .tbl__row:last-child { border-bottom:none; }
    .tbl__row:hover { background:var(--surface-1); }
    .tbl__c-center { text-align:center; }
    .tbl__c-right { text-align:right; }
    .tbl__code { font-family:var(--font-mono,ui-monospace,monospace); font-size:.78rem; color:var(--txt-2); font-weight:600; }
    .tbl__cell-name { display:flex; align-items:center; gap:.8rem; min-width:0; }
    .tbl__name-text { display:flex; flex-direction:column; min-width:0; }
    .tbl__name { font-weight:600; font-size:.875rem; color:var(--txt); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tbl__doc { font-size:.73rem; color:var(--txt-3); margin-top:.1rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tbl__muted { font-size:.83rem; color:var(--txt-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tbl__price { font-size:.86rem; font-weight:700; color:var(--text-title); }
    .tbl__stock { display:inline-flex; min-width:30px; justify-content:center; font-size:.84rem; font-weight:700; padding:.15rem .45rem; border-radius:7px; }
    .tbl__stock--ok { color:var(--txt); }
    .tbl__stock--low { color:var(--color-warning); background:var(--color-warning-light); }
    .tbl__stock--out { color:var(--color-error); background:var(--color-error-light); }
    .tbl__margin { font-size:.82rem; font-weight:700; }
    .tbl__margin--good { color:var(--color-success); }
    .tbl__margin--mid { color:var(--color-warning); }
    .tbl__margin--bad { color:var(--color-error); }

    .cat-thumb { width:42px; height:42px; border-radius:11px; display:inline-flex; align-items:center; justify-content:center;
      color:#fff; flex-shrink:0; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
    .cat-thumb .material-symbols-rounded { font-size:1.3rem; }

    /* Badges */
    .cat-badge { display:inline-flex; align-items:center; gap:.32rem; font-size:.72rem; font-weight:600; padding:.28rem .6rem; border-radius:999px; white-space:nowrap; }
    .cat-badge__dot { width:6px; height:6px; border-radius:50%; background:currentColor; }
    .cat-badge--ok { background:var(--color-success-light); color:var(--color-success); }
    .cat-badge--muted { background:var(--surface-2); color:var(--txt-2); }
    .cat-badge--warn { background:var(--color-warning-light); color:var(--color-warning); }
    .cat-badge--danger { background:var(--color-error-light); color:var(--color-error); }
    .cat-badge--info { background:var(--color-info-light); color:var(--color-info); }
    .cat-badge--purple { background:var(--brand-accent-light); color:var(--brand-accent); }

    /* Actions + dropdown */
    .cat-actions { position:relative; display:flex; justify-content:flex-end; }
    .cat-actions__trigger { width:32px; height:32px; border-radius:8px; border:none; background:transparent; color:var(--txt-3);
      display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .cat-actions__trigger:hover { background:var(--surface-2); color:var(--accent); }
    .cat-menu { position:absolute; top:calc(100% + 4px); right:0; z-index:30; min-width:200px; background:var(--panel-2);
      border:1px solid var(--line-strong); border-radius:12px; padding:.4rem; box-shadow:0 16px 40px rgba(0,0,0,.45); animation:cat-pop .14s var(--ease-ios,ease); }
    @keyframes cat-pop { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
    .cat-menu button { display:flex; align-items:center; gap:.65rem; width:100%; padding:.55rem .7rem; border:none; background:transparent;
      color:var(--txt); font-size:.83rem; font-weight:500; text-align:left; cursor:pointer; border-radius:8px; font-family:inherit; }
    .cat-menu button:hover { background:var(--surface-2); }
    .cat-menu button .material-symbols-rounded { font-size:1.15rem; color:var(--txt-2); }
    .cat-menu__sep { height:1px; background:var(--line); margin:.35rem .2rem; }
    .cat-menu__danger { color:var(--color-error) !important; }
    .cat-menu__danger .material-symbols-rounded { color:var(--color-error) !important; }

    /* Pagination */
    .pager { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 1.4rem; flex-wrap:wrap; border-top:1px solid var(--line); }
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
    .widget .panel__head { margin-bottom:1.1rem; }
    .widget__title { display:inline-flex; align-items:center; gap:.45rem; font-size:.95rem; font-weight:700; margin:0; color:var(--text-title); }
    .widget__title .material-symbols-rounded { font-size:1.15rem; color:var(--accent); }
    .widget__hl { font-size:.95rem; font-weight:800; color:var(--accent); }
    .widget__empty { color:var(--txt-3); font-size:.85rem; text-align:center; padding:1.5rem 0; }

    /* Ranking */
    .rank { display:flex; flex-direction:column; }
    .rank-row { display:flex; align-items:center; gap:.7rem; padding:.6rem 0; border-bottom:1px solid var(--line); }
    .rank-row:last-child { border-bottom:none; }
    .rank-row__pos { width:24px; height:24px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-size:.74rem; font-weight:700; background:var(--surface-2); color:var(--txt-2); }
    .rank-row__pos--1 { background:var(--color-warning-light); color:var(--color-warning); }
    .rank-row__pos--2 { background:var(--accent-soft); color:var(--accent); }
    .rank-row__pos--3 { background:var(--color-info-light); color:var(--color-info); }
    .rank-row__main { flex:1; min-width:0; display:flex; flex-direction:column; gap:.3rem; }
    .rank-row__name { font-size:.82rem; font-weight:500; color:var(--txt); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rank-row__track { height:6px; border-radius:999px; background:var(--surface-2); overflow:hidden; }
    .rank-row__fill { height:100%; border-radius:999px; background:linear-gradient(90deg,var(--accent),var(--accent-2)); transition:width .4s var(--ease-ios,ease); }
    .rank-row__val { font-size:.8rem; font-weight:700; color:var(--txt); white-space:nowrap; display:flex; flex-direction:column; align-items:flex-end; line-height:1.2; }
    .rank-row__val small { font-size:.68rem; font-weight:500; color:var(--txt-3); }

    /* Donut */
    .donut-wrap { display:flex; align-items:center; gap:1.5rem; }
    .donut { width:130px; height:130px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .donut__hole { width:88px; height:88px; border-radius:50%; background:var(--panel); display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .donut__total { font-size:1.6rem; font-weight:800; color:var(--text-title); line-height:1; }
    .donut__cap { font-size:.72rem; color:var(--txt-3); margin-top:.15rem; }
    .legend { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.6rem; flex:1; min-width:0; }
    .legend li { display:flex; align-items:center; gap:.5rem; font-size:.8rem; color:var(--txt-2); }
    .legend li b { margin-left:auto; color:var(--txt); font-weight:600; white-space:nowrap; }
    .legend__dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }

    /* Skeleton / empty */
    .cat-skel { height:12px; border-radius:6px; background:linear-gradient(90deg,var(--surface-2),var(--surface-3),var(--surface-2)); animation:cat-shimmer 1.3s infinite; }
    .cat-skel--thumb { width:42px; height:42px; border-radius:11px; }
    @keyframes cat-shimmer { 0% { opacity:.6; } 50% { opacity:1; } 100% { opacity:.6; } }
    .cat-empty { grid-column:1/-1 !important; display:flex; flex-direction:column; align-items:center; text-align:center; padding:4rem 1rem; }
    .cat-empty__icon { width:80px; height:80px; border-radius:24px; display:flex; align-items:center; justify-content:center;
      background:var(--accent-soft); color:var(--accent); margin-bottom:1.25rem; }
    .cat-empty__icon .material-symbols-rounded { font-size:2.5rem; }
    .cat-empty__title { font-size:1.15rem; font-weight:700; color:var(--text-title); margin:0 0 .5rem; }
    .cat-empty__desc { font-size:.88rem; color:var(--txt-2); margin:0 0 1.5rem; max-width:360px; }

    /* Modal */
    .cat-modal__backdrop { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(2px); z-index:40; }
    .cat-modal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:min(720px,94vw); max-height:90vh; overflow:auto;
      background:var(--panel-2); border:1px solid var(--line-strong); border-radius:18px; padding:1.5rem; z-index:41; box-shadow:0 24px 60px rgba(0,0,0,.5); }
    .nc-head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.25rem; }
    .nc-title { font-size:1.4rem; font-weight:800; color:var(--text-title); margin:0; letter-spacing:-.01em; }
    .nc-sub { color:var(--txt-2); font-size:.85rem; margin:.25rem 0 0; }
    .nc-tabs { display:flex; gap:.3rem; padding:4px; background:var(--surface-2); border-radius:12px; margin-bottom:1.4rem; overflow-x:auto; }
    .nc-tab { display:inline-flex; align-items:center; gap:.4rem; height:38px; padding:0 1rem; border:none; background:transparent; cursor:pointer;
      border-radius:9px; font-size:.82rem; font-weight:600; color:var(--txt-2); font-family:inherit; white-space:nowrap; transition:background .15s,color .15s; }
    .nc-tab:hover { color:var(--txt); }
    .nc-tab.is-active { background:var(--panel); color:var(--accent); }
    .nc-tab .material-symbols-rounded { font-size:1.05rem; }
    .nc-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .nc-field { display:flex; flex-direction:column; gap:.35rem; }
    .nc-field.span-2 { grid-column:1/-1; }
    .nc-field label { font-size:.72rem; font-weight:600; color:var(--txt-2); letter-spacing:.02em; }
    .nc-req { color:var(--color-error); }
    .nc-input { height:44px; width:100%; box-sizing:border-box; border-radius:10px; border:1px solid var(--line-strong);
      background:var(--bg); color:var(--txt); padding:0 .85rem; font-size:.875rem; font-family:inherit; outline:none; transition:border-color .15s, box-shadow .15s; }
    .nc-input::placeholder { color:var(--txt-3); }
    .nc-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-softer); }
    .nc-input:disabled { opacity:.55; cursor:not-allowed; }
    select.nc-input { appearance:none; -webkit-appearance:none; cursor:pointer; padding-right:2.2rem;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2393a4b1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat:no-repeat; background-position:right .8rem center; }
    select.nc-input option { background:var(--panel-2); color:var(--txt); }
    .nc-prefix { position:relative; display:flex; align-items:center; }
    .nc-prefix span { position:absolute; left:.85rem; font-size:.82rem; font-weight:600; color:var(--txt-3); pointer-events:none; }
    .nc-prefix .nc-input { padding-left:2.4rem; }
    .nc-margin-box { display:flex; align-items:center; gap:.85rem; padding:1rem 1.15rem; border-radius:12px; border:1px dashed var(--line-strong); background:var(--surface-1); }
    .nc-margin-box .material-symbols-rounded { font-size:1.6rem; color:var(--accent); }
    .nc-margin-box__cap { display:block; font-size:.74rem; color:var(--txt-2); }
    .nc-margin-box b { font-size:1.4rem; font-weight:800; }
    .nc-margin-box b.tbl__margin--good { color:var(--color-success); }
    .nc-margin-box b.tbl__margin--mid { color:var(--color-warning); }
    .nc-margin-box b.tbl__margin--bad { color:var(--color-error); }
    .nc-info { display:flex; align-items:center; gap:.5rem; font-size:.82rem; color:var(--txt-2); margin:.3rem 0 0; }
    .nc-info .material-symbols-rounded { font-size:1.15rem; color:var(--color-info); }
    .nc-foot { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1.6rem; padding-top:1.25rem; border-top:1px solid var(--line); }
    .nc-foot__tabs-hint { display:inline-flex; align-items:center; gap:.4rem; font-size:.76rem; color:var(--txt-3); }
    .nc-foot__tabs-hint .material-symbols-rounded { font-size:1.05rem; color:var(--color-warning); }
    .nc-foot__actions { display:flex; gap:.75rem; }

    /* ── Responsivo ── */
    @media (max-width:1400px) { .kpi-grid { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:1100px) { .widgets { grid-template-columns:1fr; } }
    @media (max-width:900px) {
      .kpi-grid { grid-template-columns:repeat(2,1fr); }
      .cat-toolbar { flex-direction:column; align-items:stretch; }
      .cat-toolbar__right { flex-direction:column; align-items:stretch; }
      .cat-search--inline input { width:100%; }
      .seg { overflow-x:auto; }
    }
    @media (max-width:760px) {
      .cat-page { padding:1.1rem; }
      .cat-page__head { flex-direction:column; align-items:stretch; }
      .cat-page__title { font-size:1.6rem; }
      .cat-head__actions { flex-direction:column; align-items:stretch; }
      .cat-search input { width:100%; max-width:none; }
      .cat-btn-primary { justify-content:center; }
      .kpi-grid { grid-template-columns:1fr; }
      .adv { flex-direction:column; align-items:stretch; }

      /* Tabela → cards empilhados */
      .tbl-wrap { overflow-x:visible; }
      .tbl { min-width:0; }
      .tbl__head { display:none; }
      .tbl__row { display:block; padding:1rem 1.1rem; margin:0 1rem .75rem; border:1px solid var(--line); border-radius:14px; background:var(--panel); position:relative; }
      .tbl__row > span[data-label] { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.5rem 0; border-top:1px solid var(--line); text-align:left !important; }
      .tbl__row > span[data-label]:first-child { border-top:none; }
      .tbl__row > span[data-label]::before { content:attr(data-label); font-size:.68rem; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--txt-3); }
      .tbl__row .cat-actions { position:absolute; top:1rem; right:1rem; }
      .tbl__cell-name { justify-content:flex-start !important; }
      .pager { flex-direction:column; align-items:stretch; text-align:center; }
      .pager__nav { justify-content:center; }
      .donut-wrap { flex-direction:column; align-items:center; text-align:center; }
      .legend { width:100%; }
      .nc-form-grid { grid-template-columns:1fr; }
      .nc-field.span-2 { grid-column:1; }
      .nc-foot { flex-direction:column-reverse; align-items:stretch; }
      .nc-foot__actions { flex-direction:column-reverse; }
      .nc-foot__actions .cat-btn-primary, .nc-foot__actions .cat-btn-outline { width:100%; justify-content:center; }
    }
  `],
})
export class ProdutosComponent implements OnInit {
  items = signal<Produto[]>([]);
  loading = signal(true);
  showForm = signal(false);
  readonly = signal(false);
  editingId = signal<string | null>(null);
  searchTerm = signal('');
  segmento = signal<'' | 'PRODUTO' | 'SERVICO' | 'ATIVO' | 'INATIVO'>('');
  showAdvanced = signal(false);
  fCategoria = signal('');
  fMarca = signal('');
  fUnidade = signal('');
  fStatus = signal('');
  openMenuId = signal<string | null>(null);
  activeTab = signal<'geral' | 'fiscal' | 'precos' | 'estoque'>('geral');
  page = signal(1);
  pageSize = signal(10);
  form!: FormGroup;

  segmentos = [
    { value: '' as const, label: 'Todos' },
    { value: 'PRODUTO' as const, label: 'Produtos' },
    { value: 'SERVICO' as const, label: 'Serviços' },
    { value: 'ATIVO' as const, label: 'Ativos' },
    { value: 'INATIVO' as const, label: 'Inativos' },
  ];
  tabs = [
    { id: 'geral' as const, label: 'Informações Gerais', icon: 'info' },
    { id: 'fiscal' as const, label: 'Fiscal', icon: 'receipt_long' },
    { id: 'precos' as const, label: 'Preços', icon: 'sell' },
    { id: 'estoque' as const, label: 'Estoque', icon: 'inventory' },
  ];
  unidades = [
    { value: 'UN', label: 'Unidade (UN)' }, { value: 'KG', label: 'Quilograma (KG)' },
    { value: 'LT', label: 'Litro (LT)' }, { value: 'MT', label: 'Metro (MT)' },
    { value: 'HR', label: 'Hora (HR)' }, { value: 'SV', label: 'Serviço (SV)' },
    { value: 'CX', label: 'Caixa (CX)' }, { value: 'PC', label: 'Peça (PC)' },
  ];
  private chartColors = [
    'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
    'var(--chart-7)', 'var(--chart-6)', 'var(--chart-10)', 'var(--chart-11)',
  ];
  private thumbPalette = [
    'linear-gradient(135deg,var(--chart-1),var(--chart-6))',
    'linear-gradient(135deg,var(--chart-2),var(--chart-12))',
    'linear-gradient(135deg,var(--chart-3),var(--chart-8))',
    'linear-gradient(135deg,var(--chart-4),var(--chart-7))',
    'linear-gradient(135deg,var(--chart-5),var(--chart-9))',
    'linear-gradient(135deg,var(--chart-7),var(--chart-4))',
  ];

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      descricao: ['', Validators.required],
      tipo: ['PRODUTO', Validators.required],
      codigo: [''],
      categoria: [''],
      marca: [''],
      status: ['ATIVO'],
      ncm: [''], cest: [''], cfop: [''], origem: ['0'],
      custoMedio: [null], preco: [null, [Validators.required, Validators.min(0.01)]],
      estoqueAtual: [0], estoqueMinimo: [0], unidade: ['UN'],
    });
    this.carregar();
  }

  // Fecha o menu de ações ao clicar fora.
  @HostListener('document:click')
  onDocClick() { if (this.openMenuId()) this.openMenuId.set(null); }

  carregar() {
    this.loading.set(true);
    const q = this.appwrite.query;
    const queries = [
      q.limit(100),
      q.orderDesc('$createdAt'),
      q.equal('tenantId', this.auth.tenantId() || 'default'),
    ];
    const empresaId = this.auth.empresaId();
    if (empresaId) queries.push(q.equal('empresaId', empresaId));
    this.appwrite.listDocuments<Produto>('produtos', queries).subscribe({
      next: (res) => { this.items.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Filtro + paginação ──
  filtered = computed(() => {
    const t = this.searchTerm().toLowerCase().trim();
    const seg = this.segmento();
    const fc = this.fCategoria(), fm = this.fMarca(), fu = this.fUnidade(), fs = this.fStatus();
    return this.items().filter(p => {
      if (t && !(
        (p.descricao || '').toLowerCase().includes(t) ||
        (p.codigo || '').toLowerCase().includes(t) ||
        (p.ncm || '').toLowerCase().includes(t) ||
        (p.categoria || '').toLowerCase().includes(t)
      )) return false;
      if (seg === 'PRODUTO' || seg === 'SERVICO') { if (p.tipo !== seg) return false; }
      else if (seg === 'ATIVO') { if (this.statusOf(p) === 'INATIVO') return false; }
      else if (seg === 'INATIVO') { if (this.statusOf(p) !== 'INATIVO') return false; }
      if (fc && p.categoria !== fc) return false;
      if (fm && p.marca !== fm) return false;
      if (fu && p.unidade !== fu) return false;
      if (fs && this.statusOf(p) !== fs) return false;
      return true;
    });
  });

  temFiltro = computed(() =>
    !!this.searchTerm() || this.segmento() !== '' || !!this.fCategoria() || !!this.fMarca() || !!this.fUnidade() || !!this.fStatus());

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
  setSegmento(v: '' | 'PRODUTO' | 'SERVICO' | 'ATIVO' | 'INATIVO') { this.segmento.set(v); this.page.set(1); }
  goTo(p: number) { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }
  setPageSize(ev: Event) { this.pageSize.set(+(ev.target as HTMLSelectElement).value); this.page.set(1); }
  clearAdvanced() { this.fCategoria.set(''); this.fMarca.set(''); this.fUnidade.set(''); this.fStatus.set(''); this.page.set(1); }
  resetFiltros() { this.searchTerm.set(''); this.segmento.set(''); this.clearAdvanced(); }

  // ── Distinct para filtros ──
  categorias = computed(() => [...new Set(this.items().map(p => p.categoria).filter(Boolean))].sort());
  marcas = computed(() => [...new Set(this.items().map(p => p.marca).filter(Boolean))].sort());
  unidadesUsadas = computed(() => [...new Set(this.items().map(p => p.unidade).filter(Boolean))].sort());

  // ── KPIs ──
  countProdutos = computed(() => this.items().filter(p => p.tipo !== 'SERVICO').length);
  countServicos = computed(() => this.items().filter(p => p.tipo === 'SERVICO').length);
  countAtivos = computed(() => this.items().filter(p => this.statusOf(p) !== 'INATIVO').length);
  countBaixoEstoque = computed(() => this.items().filter(p => { const s = this.statusOf(p); return s === 'BAIXO_ESTOQUE' || s === 'SEM_ESTOQUE'; }).length);
  valorEstoque = computed(() => this.items().filter(p => p.tipo !== 'SERVICO').reduce((s, p) => s + (p.preco || 0) * (p.estoqueAtual || 0), 0));
  pct(n: number): number { const t = this.items().length; return t ? Math.round((n / t) * 100) : 0; }

  novosEsteMes = computed(() => {
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();
    return this.items().filter(p => {
      if (!p.$createdAt) return false;
      const d = new Date(p.$createdAt);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  });

  // ── Status / estoque / margem ──
  statusOf(p: Produto): StatusVisual {
    if ((p.status || 'ATIVO').toUpperCase() === 'INATIVO') return 'INATIVO';
    if (p.tipo !== 'SERVICO') {
      const atual = p.estoqueAtual ?? 0, min = p.estoqueMinimo ?? 0;
      if (atual <= 0) return 'SEM_ESTOQUE';
      if (min > 0 && atual <= min) return 'BAIXO_ESTOQUE';
    }
    return 'ATIVO';
  }
  statusLabel(p: Produto): string {
    return { ATIVO: 'Ativo', INATIVO: 'Inativo', SEM_ESTOQUE: 'Sem Estoque', BAIXO_ESTOQUE: 'Baixo Estoque' }[this.statusOf(p)];
  }
  statusBadgeClass(p: Produto): string {
    return { ATIVO: 'cat-badge--ok', INATIVO: 'cat-badge--muted', SEM_ESTOQUE: 'cat-badge--danger', BAIXO_ESTOQUE: 'cat-badge--warn' }[this.statusOf(p)];
  }
  stockClass(p: Produto): string {
    const s = this.statusOf(p);
    return s === 'SEM_ESTOQUE' ? 'tbl__stock--out' : s === 'BAIXO_ESTOQUE' ? 'tbl__stock--low' : 'tbl__stock--ok';
  }
  margemValor(custo: number, venda: number): number {
    if (!venda || venda <= 0) return 0;
    return ((venda - (custo || 0)) / venda) * 100;
  }
  margem(p: Produto): string {
    if (!p.preco || !p.custoMedio) return '—';
    return this.margemValor(p.custoMedio, p.preco).toFixed(1).replace('.', ',') + '%';
  }
  margemClass(p: Produto): string {
    if (!p.preco || !p.custoMedio) return '';
    return this.margemBucket(this.margemValor(p.custoMedio, p.preco));
  }
  private margemBucket(m: number): string { return m >= 30 ? 'tbl__margin--good' : m >= 10 ? 'tbl__margin--mid' : 'tbl__margin--bad'; }
  margemForm(): string {
    const c = +this.form?.value.custoMedio || 0, v = +this.form?.value.preco || 0;
    if (!v) return '—';
    return this.margemValor(c, v).toFixed(1).replace('.', ',') + '%';
  }
  margemFormClass(): string {
    const v = +this.form?.value.preco || 0;
    if (!v) return '';
    return this.margemBucket(this.margemValor(+this.form?.value.custoMedio || 0, v));
  }

  // ── Thumb ──
  thumbBg(p: Produto): string {
    const key = (p.codigo || p.descricao || p.$id || '');
    const idx = (key.charCodeAt(0) || 0) % this.thumbPalette.length;
    return this.thumbPalette[idx];
  }

  // ── Widget: mais vendidos ──
  // Sem fonte real: a NF-e não persiste itens por produto e não há módulo de Vendas.
  // Fica vazio (estado "Sem dados de vendas.") até existir uma origem real de vendas.
  maisVendidos = signal<{ nome: string; qtd: number; valor: number; barPct: number }[]>([]);

  // ── Widget: distribuição por categoria ──
  categoriaStats = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.items()) { const k = p.categoria || 'Sem categoria'; map.set(k, (map.get(k) || 0) + 1); }
    const total = this.items().length || 1;
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6);
    const restCount = sorted.slice(6).reduce((s, e) => s + e[1], 0);
    const out = top.map(([nome, count], i) => ({ nome, count, pct: Math.round((count / total) * 100), color: this.chartColors[i % this.chartColors.length] }));
    if (restCount > 0) out.push({ nome: 'Outros', count: restCount, pct: Math.round((restCount / total) * 100), color: 'var(--surface-4)' });
    return out;
  });
  donutGradient = computed(() => {
    const stats = this.categoriaStats();
    const total = this.items().length;
    if (!total || !stats.length) return 'var(--surface-2)';
    let acc = 0; const segs: string[] = [];
    for (const c of stats) {
      const start = (acc / total) * 360;
      acc += c.count;
      const end = (acc / total) * 360;
      segs.push(`${c.color} ${start}deg ${end}deg`);
    }
    return `conic-gradient(${segs.join(',')})`;
  });

  // ── Menu de ações ──
  toggleMenu(id: string, ev: Event) { ev.stopPropagation(); this.openMenuId.set(this.openMenuId() === id ? null : id); }

  // ── CRUD ──
  openForm(p?: Produto, view = false) {
    this.openMenuId.set(null);
    this.readonly.set(view);
    this.activeTab.set('geral');
    if (p) {
      this.editingId.set(p.$id);
      this.form.reset({
        descricao: p.descricao ?? '', tipo: p.tipo ?? 'PRODUTO', codigo: p.codigo ?? '',
        categoria: p.categoria ?? '', marca: p.marca ?? '', status: (p.status || 'ATIVO').toUpperCase() === 'INATIVO' ? 'INATIVO' : 'ATIVO',
        ncm: p.ncm ?? '', cest: p.cest ?? '', cfop: p.cfop ?? '', origem: '0',
        custoMedio: p.custoMedio ?? null, preco: p.preco ?? null,
        estoqueAtual: p.estoqueAtual ?? 0, estoqueMinimo: p.estoqueMinimo ?? 0, unidade: p.unidade ?? 'UN',
      });
    } else {
      this.editingId.set(null);
      this.form.reset({ tipo: 'PRODUTO', status: 'ATIVO', unidade: 'UN', origem: '0', estoqueAtual: 0, estoqueMinimo: 0, custoMedio: null, preco: null });
    }
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingId.set(null); this.readonly.set(false); }

  salvar() {
    if (this.form.invalid || this.readonly()) return;
    const v = this.form.value;
    const id = this.editingId();
    const isServico = v.tipo === 'SERVICO';
    const data: Record<string, unknown> = {
      codigo: (v.codigo || '').trim() || (isServico ? `SRV-${Date.now()}` : `PRD-${Date.now()}`),
      descricao: v.descricao,
      tipo: v.tipo,
      categoria: v.categoria || '',
      marca: v.marca || '',
      unidade: v.unidade || 'UN',
      ncm: v.ncm || '', cest: v.cest || '', cfop: v.cfop || '',
      custoMedio: Number(v.custoMedio) || 0,
      preco: Number(v.preco) || 0,
      estoqueAtual: isServico ? 0 : Number(v.estoqueAtual) || 0,
      estoqueMinimo: isServico ? 0 : Number(v.estoqueMinimo) || 0,
      status: v.status || 'ATIVO',
      tenantId: this.auth.tenantId() || 'default',
      empresaId: this.auth.empresaId() || '',
    };
    const obs = id
      ? this.appwrite.updateDocument<Produto>('produtos', id, data)
      : this.appwrite.createDocument<Produto>('produtos', data);
    obs.subscribe({
      next: () => {
        this.snackBar.open(id ? 'Item atualizado!' : 'Item cadastrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
        this.closeForm();
        this.carregar();
      },
      error: (e) => this.snackBar.open(e.message || 'Erro ao salvar', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] }),
    });
  }

  duplicar(p: Produto) {
    this.openMenuId.set(null);
    const data: Record<string, unknown> = {
      codigo: `${p.codigo || 'PRD'}-COPIA`,
      descricao: `${p.descricao} (cópia)`,
      tipo: p.tipo, categoria: p.categoria || '', marca: p.marca || '', unidade: p.unidade || 'UN',
      ncm: p.ncm || '', cest: p.cest || '', cfop: p.cfop || '',
      custoMedio: p.custoMedio || 0, preco: p.preco || 0,
      estoqueAtual: 0, estoqueMinimo: p.estoqueMinimo || 0,
      status: 'ATIVO',
      tenantId: this.auth.tenantId() || 'default', empresaId: this.auth.empresaId() || '',
    };
    this.appwrite.createDocument<Produto>('produtos', data).subscribe({
      next: () => { this.snackBar.open('Item duplicado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.carregar(); },
      error: (e) => this.snackBar.open(e.message || 'Erro ao duplicar', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] }),
    });
  }

  movimentar(p: Produto) {
    this.openMenuId.set(null);
    this.snackBar.open(`Movimentação de estoque de "${p.descricao}" disponível em breve.`, 'OK', { duration: 3000 });
  }
  historico(p: Produto) {
    this.openMenuId.set(null);
    this.snackBar.open(`Histórico de "${p.descricao}" disponível em breve.`, 'OK', { duration: 3000 });
  }

  excluir(p: Produto) {
    this.openMenuId.set(null);
    if (!confirm(`Excluir "${p.descricao}"?`)) return;
    this.appwrite.deleteDocument('produtos', p.$id).subscribe({
      next: () => { this.snackBar.open('Item excluído', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao excluir', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }
}
