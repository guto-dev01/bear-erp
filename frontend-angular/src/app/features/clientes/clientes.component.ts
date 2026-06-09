import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';

type TipoCadastro = 'PF' | 'PJ';
interface DocReq { key: string; title: string; desc: string; icon: string; required: boolean; }

interface Cliente {
  $id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpjCpf: string;
  inscricaoEstadual: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  status: string;
  tipo: string;
  origem?: string;
  pendencias?: number;
  $createdAt: string;
}

@Component({
  selector: 'bear-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTooltipModule, MatSnackBarModule],
  template: `
    <div class="crm">
      <div class="crm-page">
        <!-- ═══ Page header ═══ -->
        <span class="crm-eyebrow"><span class="material-symbols-rounded">groups</span> BEAR FINANCE · CRM CONTÁBIL</span>
        <div class="crm-page__head">
          <div>
            <h1 class="crm-page__title">Clientes</h1>
            <p class="crm-page__sub">Gerencie clientes, vínculos jurídicos e informações cartorárias.</p>
          </div>
          <button class="crm-btn-primary" (click)="openForm()">
            <span class="material-symbols-rounded">add</span> Novo Cliente
          </button>
        </div>

        <!-- ═══ Stats ═══ -->
        <div class="crm-stats">
          <div class="crm-stat">
            <div class="crm-stat__icon crm-stat__icon--blue"><span class="material-symbols-rounded">groups</span></div>
            <div><p class="crm-stat__label">Total de clientes</p><p class="crm-stat__value">{{ clientes().length }}</p></div>
          </div>
          <div class="crm-stat">
            <div class="crm-stat__icon crm-stat__icon--violet"><span class="material-symbols-rounded">domain</span></div>
            <div><p class="crm-stat__label">Pessoas jurídicas</p><p class="crm-stat__value">{{ countByTipo('PJ') }}</p></div>
          </div>
          <div class="crm-stat">
            <div class="crm-stat__icon crm-stat__icon--teal"><span class="material-symbols-rounded">person</span></div>
            <div><p class="crm-stat__label">Pessoas físicas</p><p class="crm-stat__value">{{ countByTipo('PF') }}</p></div>
          </div>
        </div>

        <!-- ═══ Filters + view toggle ═══ -->
        <div class="crm-toolbar">
          <div class="crm-filters">
            <button class="crm-chip"><span class="material-symbols-rounded">filter_list</span> Todos os tipos <span class="material-symbols-rounded crm-chip__caret">expand_more</span></button>
            <button class="crm-chip"><span class="material-symbols-rounded">check_circle</span> Todos os status <span class="material-symbols-rounded crm-chip__caret">expand_more</span></button>
            <button class="crm-chip"><span class="material-symbols-rounded">sort</span> Todas as origens <span class="material-symbols-rounded crm-chip__caret">expand_more</span></button>
          </div>
          <div class="crm-segmented">
            <button [class.is-active]="view()==='tabela'" (click)="view.set('tabela')"><span class="material-symbols-rounded">table_rows</span> Tabela</button>
            <button [class.is-active]="view()==='cards'" (click)="view.set('cards')"><span class="material-symbols-rounded">grid_view</span> Cards</button>
          </div>
        </div>

        <!-- ═══ Table ═══ -->
        @if (view() === 'tabela') {
          <div class="crm-table">
            <div class="crm-table__head">
              <span>Cliente</span><span>Documento</span><span>Tipo</span><span>Status</span><span class="crm-col-actions">Ações</span>
            </div>
            @if (loading()) {
              @for (i of [1,2,3,4]; track i) {
                <div class="crm-row"><div class="crm-skel" style="width:60%"></div><div class="crm-skel" style="width:40%"></div><div class="crm-skel" style="width:50%"></div><div class="crm-skel" style="width:50%"></div><span></span></div>
              }
            } @else if (filtered().length === 0) {
              <div class="crm-empty">
                <span class="material-symbols-rounded">groups</span>
                <p>{{ searchTerm() ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado' }}</p>
              </div>
            } @else {
              @for (c of filtered(); track c.$id) {
                <div class="crm-row">
                  <div class="crm-cell-client">
                    @if (isPJ(c)) {
                      <div class="crm-avatar crm-avatar--pj"><span class="material-symbols-rounded">domain</span></div>
                    } @else {
                      <div class="crm-avatar crm-avatar--pf">{{ initials(c.nomeFantasia || c.razaoSocial) }}</div>
                    }
                    <div class="crm-cell-client__text">
                      <span class="crm-cell-client__name">{{ c.nomeFantasia || c.razaoSocial }}</span>
                      @if (isCartorioIa(c)) {
                        <span class="crm-tag crm-tag--ia"><span class="material-symbols-rounded">auto_awesome</span> Cartório IA</span>
                      }
                    </div>
                  </div>
                  <span class="crm-cell-doc" data-label="Documento">{{ formatDoc(c.cnpjCpf) }}</span>
                  <span data-label="Tipo">
                    <span class="crm-badge" [class.crm-badge--pj]="isPJ(c)" [class.crm-badge--pf]="!isPJ(c)">
                      <span class="material-symbols-rounded">{{ isPJ(c) ? 'domain' : 'person' }}</span>
                      {{ isPJ(c) ? 'Pessoa Jurídica' : 'Pessoa Física' }}
                    </span>
                  </span>
                  <span data-label="Status">
                    @if (pendencias(c) > 0) {
                      <span class="crm-badge crm-badge--warn"><span class="material-symbols-rounded">error</span> {{ pendencias(c) }} pendência(s)</span>
                    } @else {
                      <span class="crm-badge crm-badge--ok"><span class="material-symbols-rounded">check_circle</span> Completo</span>
                    }
                  </span>
                  <span class="crm-actions" data-label="Ações">
                    <button matTooltip="Visualizar" (click)="openForm(c)"><span class="material-symbols-rounded">visibility</span></button>
                    <button matTooltip="Editar" (click)="openForm(c)"><span class="material-symbols-rounded">edit</span></button>
                    <button matTooltip="Documentos"><span class="material-symbols-rounded">description</span></button>
                  </span>
                </div>
              }
            }
          </div>
        } @else {
          <!-- ═══ Cards view ═══ -->
          @if (!loading() && filtered().length > 0) {
            <div class="crm-cards">
              @for (c of filtered(); track c.$id) {
                <div class="crm-card">
                  <div class="crm-card__top">
                    @if (isPJ(c)) {
                      <div class="crm-avatar crm-avatar--pj"><span class="material-symbols-rounded">domain</span></div>
                    } @else {
                      <div class="crm-avatar crm-avatar--pf">{{ initials(c.nomeFantasia || c.razaoSocial) }}</div>
                    }
                    @if (pendencias(c) > 0) {
                      <span class="crm-badge crm-badge--warn"><span class="material-symbols-rounded">error</span> {{ pendencias(c) }}</span>
                    } @else {
                      <span class="crm-badge crm-badge--ok"><span class="material-symbols-rounded">check_circle</span> Completo</span>
                    }
                  </div>
                  <h3 class="crm-card__name">{{ c.nomeFantasia || c.razaoSocial }}</h3>
                  <p class="crm-card__doc">{{ formatDoc(c.cnpjCpf) }}</p>
                  <div class="crm-card__foot">
                    <span class="crm-badge" [class.crm-badge--pj]="isPJ(c)" [class.crm-badge--pf]="!isPJ(c)">{{ isPJ(c) ? 'Pessoa Jurídica' : 'Pessoa Física' }}</span>
                    <div class="crm-actions">
                      <button (click)="openForm(c)"><span class="material-symbols-rounded">edit</span></button>
                      <button (click)="delete(c)"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else if (!loading()) {
            <div class="crm-empty"><span class="material-symbols-rounded">groups</span><p>Nenhum cliente cadastrado</p></div>
          }
        }
      </div>

      <!-- ═══ Novo cadastro modal ═══ -->
      @if (showForm()) {
        <div class="crm-modal__backdrop" (click)="closeForm()"></div>
        <div class="crm-modal crm-modal--wide">
          <div class="nc-head">
            <div>
              <h2 class="nc-title">{{ editingId() ? 'Editar cadastro' : 'Novo cadastro' }}</h2>
              <p class="nc-sub">{{ flow() === 'manual' ? 'Preencha os dados do cliente manualmente.' : 'Anexe os documentos e o sistema preenche o cadastro pra você.' }}</p>
            </div>
            @if (flow() === 'manual' && !editingId()) {
              <button class="crm-btn-outline nc-back" (click)="flow.set('docs')"><span class="material-symbols-rounded">arrow_back</span> Voltar</button>
            } @else {
              <button class="crm-icon-btn" (click)="closeForm()"><span class="material-symbols-rounded">close</span></button>
            }
          </div>

          <!-- Abas de tipo -->
          <div class="nc-tabs">
            @for (t of tipos; track t.key) {
              <button class="nc-tab" [class.is-active]="tipoCadastro() === t.key" (click)="setTipo(t.key)">
                <span class="material-symbols-rounded">{{ t.icon }}</span> {{ t.label }}
              </button>
            }
          </div>

          @if (flow() === 'docs') {
            <!-- Stepper -->
            <div class="nc-stepper">
              @for (s of steps; track s.n; let last = $last) {
                <div class="nc-step" [class.is-active]="currentStep() === s.n" [class.is-done]="currentStep() > s.n">
                  <div class="nc-step__icon"><span class="material-symbols-rounded">{{ currentStep() > s.n ? 'check' : s.icon }}</span></div>
                  <div class="nc-step__text"><span class="nc-step__n">ETAPA {{ s.n }}</span><span class="nc-step__label">{{ s.label }}</span></div>
                </div>
                @if (!last) { <div class="nc-step__line"></div> }
              }
            </div>

            <!-- Etapa 1: documentos -->
            <h3 class="nc-section">Documentos necessários</h3>
            <p class="nc-section-sub">Anexe os documentos exigidos. O sistema vai ler automaticamente e preencher o cadastro pra você na próxima etapa.</p>
            <div class="nc-docs">
              @for (d of docsForTipo(); track d.key) {
                <div class="nc-doc" [class.nc-doc--req]="d.required">
                  <div class="nc-doc__head">
                    <div class="nc-doc__icon"><span class="material-symbols-rounded">{{ d.icon }}</span></div>
                    <div>
                      <div class="nc-doc__title">{{ d.title }} <span class="nc-pill" [class.nc-pill--req]="d.required">{{ d.required ? 'OBRIGATÓRIO' : 'OPCIONAL' }}</span></div>
                      <div class="nc-doc__desc">{{ d.desc }}</div>
                    </div>
                  </div>
                  <label class="nc-drop" [class.has-file]="uploads()[d.key]">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden (change)="onFile(d.key, $event)">
                    @if (uploads()[d.key]) {
                      <span class="material-symbols-rounded nc-drop__ok">check_circle</span>
                      <span class="nc-drop__name">{{ uploads()[d.key] }}</span>
                      <span class="nc-drop__hint">Clique para trocar</span>
                    } @else {
                      <span class="material-symbols-rounded nc-drop__cloud">cloud_upload</span>
                      <span class="nc-drop__main">Arraste o arquivo ou <b>clique para selecionar</b></span>
                      <span class="nc-drop__hint">PDF, JPG, PNG — até 10 MB</span>
                    }
                  </label>
                </div>
              }
            </div>

            <div class="nc-foot">
              <button class="nc-link" (click)="flow.set('manual')">Não tenho os documentos — preencher manualmente</button>
              <div class="nc-foot__actions">
                <button class="crm-btn-outline" (click)="closeForm()">Cancelar</button>
                <button class="crm-btn-primary" (click)="flow.set('manual')">
                  Continuar <span class="material-symbols-rounded">arrow_forward</span>
                </button>
              </div>
            </div>
          } @else {
            <!-- Cadastro manual -->
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="nc-form-grid">
                <div class="nc-field span-2"><label>Razão Social / Nome <span class="nc-req">*</span></label><input class="nc-input" formControlName="razaoSocial"></div>
                <div class="nc-field"><label>Nome Fantasia <span class="nc-req">*</span></label><input class="nc-input" formControlName="nomeFantasia"></div>
                <div class="nc-field"><label>Tipo</label><select class="nc-input" formControlName="tipo"><option value="PJ">Pessoa Jurídica</option><option value="PF">Pessoa Física</option></select></div>
                <div class="nc-field"><label>CNPJ / CPF <span class="nc-req">*</span></label><input class="nc-input" formControlName="cnpjCpf" maxlength="14"></div>
                <div class="nc-field"><label>Inscrição Estadual</label><input class="nc-input" formControlName="inscricaoEstadual"></div>
                <div class="nc-field"><label>Email <span class="nc-req">*</span></label><input class="nc-input" type="email" formControlName="email"></div>
                <div class="nc-field"><label>Telefone</label><input class="nc-input" formControlName="telefone"></div>
                <div class="nc-field span-2"><label>Endereço</label><input class="nc-input" formControlName="endereco"></div>
                <div class="nc-field"><label>Cidade</label><input class="nc-input" formControlName="cidade"></div>
                <div class="nc-field"><label>Estado</label><select class="nc-input" formControlName="estado"><option value="">—</option>@for(uf of ufs;track uf){<option [value]="uf">{{uf}}</option>}</select></div>
                <div class="nc-field"><label>CEP</label><input class="nc-input" formControlName="cep" maxlength="8"></div>
              </div>
              <div class="nc-foot">
                @if (!editingId()) {
                  <button type="button" class="nc-link" (click)="flow.set('docs')"><span class="material-symbols-rounded" style="font-size:1rem">arrow_back</span> Voltar para upload de documentos</button>
                } @else { <span></span> }
                <div class="nc-foot__actions">
                  <button type="button" class="crm-btn-outline" (click)="closeForm()">Cancelar</button>
                  <button type="submit" class="crm-btn-primary" [disabled]="form.invalid">
                    <span class="material-symbols-rounded">{{ editingId() ? 'save' : 'add' }}</span>{{ editingId() ? 'Salvar' : 'Criar' }}
                  </button>
                </div>
              </div>
            </form>
          }
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
      min-height:100%; width:100%; background:var(--bg); color:var(--txt); padding-bottom:3rem;
      font-family:inherit;
    }
    .material-symbols-rounded { font-variation-settings:'wght' 400; vertical-align:middle; }

    /* Topbar */
    .crm-topbar { display:flex; align-items:center; gap:1.5rem; padding:0 1.75rem; height:64px;
      background:rgba(10,17,23,.85); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:20; }
    .crm-brand { font-weight:800; font-size:1.25rem; letter-spacing:.22em; color:var(--accent);
      text-decoration:none; text-shadow:0 0 18px var(--accent-glow); white-space:nowrap; }
    .crm-topbar__search { position:relative; flex:1; max-width:420px; margin:0 auto; }
    .crm-topbar__search input { width:100%; height:40px; border-radius:12px; border:1px solid var(--line-strong);
      background:var(--panel); color:var(--txt); padding:0 2.5rem 0 1rem; font-size:.875rem; font-family:inherit; outline:none; }
    .crm-topbar__search input::placeholder { color:var(--txt-3); }
    .crm-topbar__search input:focus { border-color:var(--accent); }
    .crm-topbar__search > .material-symbols-rounded { position:absolute; right:.85rem; top:50%; transform:translateY(-50%); color:var(--txt-3); font-size:1.1rem; }
    .crm-topbar__right { display:flex; align-items:center; gap:1rem; }
    .crm-icon-btn { width:38px; height:38px; border-radius:50%; border:1px solid var(--line-strong); background:var(--panel);
      color:var(--txt-2); display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .crm-icon-btn:hover { color:var(--txt); border-color:var(--accent); }
    .crm-user { display:flex; align-items:center; gap:.6rem; }
    .crm-user__avatar { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,var(--accent),#0ea5b5);
      color:var(--on-accent); font-weight:700; font-size:.8rem; display:flex; align-items:center; justify-content:center; }
    .crm-user__info { display:flex; flex-direction:column; line-height:1.2; }
    .crm-user__name { font-size:.8rem; font-weight:700; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .crm-user__mail { font-size:.7rem; color:var(--txt-3); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    /* Page */
    .crm-page { padding:1.75rem; max-width:1180px; margin:0 auto; }
    .crm-eyebrow { display:inline-flex; align-items:center; gap:.4rem; font-size:.72rem; font-weight:600; letter-spacing:.04em;
      color:var(--accent); background:var(--accent-soft); border:1px solid var(--accent-softer);
      padding:.32rem .7rem; border-radius:999px; }
    .crm-eyebrow .material-symbols-rounded { font-size:.95rem; }
    .crm-page__head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin:.85rem 0 1.5rem; }
    .crm-page__title { font-size:2rem; font-weight:800; letter-spacing:-.02em; margin:0; }
    .crm-page__sub { color:var(--txt-2); font-size:.9rem; margin:.25rem 0 0; }
    .crm-btn-primary { display:inline-flex; align-items:center; gap:.45rem; height:42px; padding:0 1.25rem; border:none; cursor:pointer;
      border-radius:12px; font-weight:600; font-size:.875rem; color:var(--on-accent); font-family:inherit;
      background:linear-gradient(135deg,var(--accent),var(--accent-2)); box-shadow:0 6px 20px var(--accent-glow); }
    .crm-btn-primary:hover { filter:brightness(1.05); }
    .crm-btn-primary:disabled { opacity:.5; cursor:not-allowed; box-shadow:none; }
    .crm-btn-primary .material-symbols-rounded { font-size:1.2rem; }
    .crm-btn-outline { height:42px; padding:0 1.25rem; border-radius:12px; border:1px solid var(--line-strong);
      background:transparent; color:var(--txt-2); font-weight:600; font-size:.875rem; cursor:pointer; font-family:inherit; }
    .crm-btn-outline:hover { color:var(--txt); }

    /* Stats */
    .crm-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1rem; margin-bottom:1.5rem; }
    .crm-stat { display:flex; align-items:center; gap:.9rem; background:var(--panel); border:1px solid var(--line);
      border-radius:16px; padding:1rem 1.1rem; }
    .crm-stat__icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .crm-stat__icon .material-symbols-rounded { font-size:1.3rem; }
    .crm-stat__icon--blue { background:var(--color-info-light); color:var(--color-info); }
    .crm-stat__icon--amber { background:var(--color-warning-light); color:var(--color-warning); }
    .crm-stat__icon--violet { background:var(--brand-accent-light); color:var(--brand-accent); }
    .crm-stat__icon--teal { background:var(--accent-soft); color:var(--accent); }
    .crm-stat__icon--pink { background:var(--brand-accent-light); color:var(--brand-accent); }
    .crm-stat__label { font-size:.68rem; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--txt-3); margin:0; }
    .crm-stat__value { font-size:1.6rem; font-weight:800; margin:.1rem 0 0; line-height:1; }

    /* Toolbar */
    .crm-toolbar { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1rem; flex-wrap:wrap; }
    .crm-filters { display:flex; gap:.6rem; flex-wrap:wrap; }
    .crm-chip { display:inline-flex; align-items:center; gap:.4rem; height:36px; padding:0 .85rem; border-radius:10px;
      border:1px solid var(--line-strong); background:var(--panel); color:var(--txt-2); font-size:.82rem; font-weight:500; cursor:pointer; font-family:inherit; }
    .crm-chip:hover { color:var(--txt); border-color:var(--accent); }
    .crm-chip .material-symbols-rounded { font-size:1rem; }
    .crm-chip__caret { margin-left:.1rem; opacity:.6; }
    .crm-segmented { display:flex; background:var(--panel); border:1px solid var(--line-strong); border-radius:10px; padding:3px; }
    .crm-segmented button { display:inline-flex; align-items:center; gap:.35rem; height:30px; padding:0 .85rem; border:none;
      background:transparent; color:var(--txt-2); font-size:.82rem; font-weight:600; border-radius:7px; cursor:pointer; font-family:inherit; }
    .crm-segmented button .material-symbols-rounded { font-size:1rem; }
    .crm-segmented button.is-active { background:var(--accent-softer); color:var(--accent); }

    /* Table */
    .crm-table { background:var(--panel); border:1px solid var(--line); border-radius:16px; overflow:hidden; }
    .crm-table__head, .crm-row { display:grid; grid-template-columns:2.4fr 1.4fr 1.3fr 1.3fr .9fr; align-items:center; gap:1rem; padding:.85rem 1.25rem; }
    .crm-table__head { font-size:.68rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--txt-3); border-bottom:1px solid var(--line); }
    .crm-row { border-bottom:1px solid var(--line); }
    .crm-row:last-child { border-bottom:none; }
    .crm-row:hover { background:var(--surface-1); }
    .crm-col-actions { text-align:right; }
    .crm-cell-client { display:flex; align-items:center; gap:.75rem; }
    .crm-cell-client__text { display:flex; flex-direction:column; gap:.3rem; min-width:0; }
    .crm-cell-client__name { font-weight:600; font-size:.875rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .crm-cell-doc { font-size:.85rem; color:var(--txt-2); letter-spacing:.02em; }
    .crm-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-weight:700; font-size:.78rem; flex-shrink:0; }
    .crm-avatar--pf { background:var(--color-warning-light); color:var(--color-warning); border:1.5px solid var(--color-warning-muted); }
    .crm-avatar--pj { background:var(--accent-soft); color:var(--accent); border-radius:11px; }
    .crm-avatar--pj .material-symbols-rounded { font-size:1.2rem; }

    /* Badges & tags */
    .crm-badge { display:inline-flex; align-items:center; gap:.32rem; font-size:.74rem; font-weight:600; padding:.3rem .6rem; border-radius:999px; white-space:nowrap; }
    .crm-badge .material-symbols-rounded { font-size:.95rem; }
    .crm-badge--pj { background:var(--accent-soft); color:var(--accent); }
    .crm-badge--pf { background:var(--accent-soft); color:var(--accent); }
    .crm-badge--warn { background:var(--color-warning-light); color:var(--color-warning); }
    .crm-badge--ok { background:var(--color-success-light); color:var(--color-success); }
    .crm-tag { display:inline-flex; align-items:center; gap:.28rem; font-size:.68rem; font-weight:600; padding:.18rem .5rem; border-radius:999px; width:fit-content; }
    .crm-tag .material-symbols-rounded { font-size:.85rem; }
    .crm-tag--ia { background:var(--brand-accent-light); color:var(--brand-accent); }

    /* Actions */
    .crm-actions { display:flex; gap:.25rem; justify-content:flex-end; }
    .crm-actions button { width:32px; height:32px; border-radius:8px; border:none; background:transparent; color:var(--txt-3);
      display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .crm-actions button:hover { background:var(--surface-2); color:var(--accent); }
    .crm-actions button .material-symbols-rounded { font-size:1.1rem; }

    /* Cards view */
    .crm-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1rem; }
    .crm-card { background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:1.1rem; }
    .crm-card__top { display:flex; align-items:center; justify-content:space-between; margin-bottom:.85rem; }
    .crm-card__name { font-size:.95rem; font-weight:700; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .crm-card__doc { font-size:.82rem; color:var(--txt-2); margin:.25rem 0 .9rem; }
    .crm-card__foot { display:flex; align-items:center; justify-content:space-between; padding-top:.85rem; border-top:1px solid var(--line); }

    /* Skeleton / empty */
    .crm-skel { height:14px; border-radius:6px; background:linear-gradient(90deg,var(--surface-2),var(--surface-3),var(--surface-2)); }
    .crm-empty { grid-column:1/-1; text-align:center; padding:3.5rem 1rem; color:var(--txt-3); }
    .crm-empty .material-symbols-rounded { font-size:2.5rem; opacity:.5; }
    .crm-empty p { margin:.75rem 0 0; font-size:.9rem; }

    /* Modal */
    .crm-modal__backdrop { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(2px); z-index:40; }
    .crm-modal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:min(720px,92vw); max-height:90vh; overflow:auto;
      background:var(--panel-2); border:1px solid var(--line-strong); border-radius:18px; padding:1.5rem; z-index:41;
      box-shadow:0 24px 60px rgba(0,0,0,.5); }
    .crm-modal--wide { width:min(840px,94vw); }

    /* Novo cadastro */
    .nc-head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.25rem; }
    .nc-title { font-size:1.4rem; font-weight:800; color:var(--accent); margin:0; letter-spacing:-.01em; }
    .nc-sub { color:var(--txt-2); font-size:.85rem; margin:.25rem 0 0; }
    .nc-back { height:38px; display:inline-flex; align-items:center; gap:.4rem; }
    .nc-back .material-symbols-rounded { font-size:1.1rem; }

    .nc-tabs { display:grid; grid-template-columns:repeat(2,1fr); gap:.4rem; background:var(--panel); border:1px solid var(--line);
      border-radius:12px; padding:.35rem; margin-bottom:1.25rem; }
    .nc-tab { display:inline-flex; align-items:center; justify-content:center; gap:.4rem; height:40px; border:none; background:transparent;
      color:var(--txt-2); font-size:.8rem; font-weight:600; border-radius:9px; cursor:pointer; font-family:inherit; white-space:nowrap; }
    .nc-tab .material-symbols-rounded { font-size:1.05rem; }
    .nc-tab:hover { color:var(--txt); }
    .nc-tab.is-active { background:var(--accent-soft); color:var(--accent); }

    .nc-stepper { display:flex; align-items:center; background:var(--panel); border:1px solid var(--line); border-radius:12px;
      padding:.85rem 1rem; margin-bottom:1.5rem; }
    .nc-step { display:flex; align-items:center; gap:.55rem; }
    .nc-step__icon { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;
      border:1.5px solid var(--line-strong); color:var(--txt-3); }
    .nc-step__icon .material-symbols-rounded { font-size:1.05rem; }
    .nc-step.is-active .nc-step__icon { border-color:var(--accent); color:var(--accent); background:var(--accent-soft); }
    .nc-step.is-done .nc-step__icon { border-color:var(--accent); background:var(--accent); color:var(--on-accent); }
    .nc-step__text { display:flex; flex-direction:column; line-height:1.2; }
    .nc-step__n { font-size:.58rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--txt-3); }
    .nc-step__label { font-size:.78rem; font-weight:600; color:var(--txt-2); white-space:nowrap; }
    .nc-step.is-active .nc-step__label { color:var(--txt); }
    .nc-step__line { flex:1; height:1.5px; background:var(--line-strong); margin:0 .55rem; min-width:14px; }

    .nc-section { font-size:1.05rem; font-weight:700; color:var(--accent); margin:0 0 .2rem; }
    .nc-section-sub { color:var(--txt-2); font-size:.82rem; margin:0 0 1rem; }
    .nc-docs { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
    .nc-doc { border:1px solid var(--line); border-radius:14px; padding:1rem; background:var(--panel); }
    .nc-doc--req { border-color:var(--color-error-muted); }
    .nc-doc__head { display:flex; gap:.7rem; margin-bottom:.85rem; }
    .nc-doc__icon { width:38px; height:38px; border-radius:10px; background:var(--accent-soft); color:var(--accent);
      display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .nc-doc__title { font-size:.9rem; font-weight:700; display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
    .nc-doc__desc { font-size:.75rem; color:var(--txt-2); margin-top:.15rem; }
    .nc-pill { font-size:.56rem; font-weight:700; letter-spacing:.05em; padding:.16rem .42rem; border-radius:5px;
      background:var(--surface-2); color:var(--txt-2); }
    .nc-pill--req { background:var(--color-error-light); color:var(--color-error); }
    .nc-drop { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.3rem; text-align:center;
      border:1.5px dashed var(--line-strong); border-radius:12px; padding:1.4rem 1rem; cursor:pointer; transition:border-color .15s, background .15s; }
    .nc-drop:hover { border-color:var(--accent); background:var(--accent-soft); }
    .nc-drop.has-file { border-style:solid; border-color:var(--accent); background:var(--accent-soft); }
    .nc-drop__cloud, .nc-drop__ok { font-size:1.7rem; color:var(--accent); }
    .nc-drop__main { font-size:.82rem; color:var(--txt); }
    .nc-drop__main b { color:var(--accent); font-weight:600; }
    .nc-drop__name { font-size:.82rem; color:var(--txt); font-weight:600; word-break:break-all; }
    .nc-drop__hint { font-size:.68rem; color:var(--txt-3); }

    .nc-foot { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1.5rem; flex-wrap:wrap; }
    .nc-foot__actions { display:flex; gap:.75rem; }
    .nc-link { display:inline-flex; align-items:center; gap:.3rem; background:none; border:none; color:var(--accent); font-size:.82rem;
      font-weight:600; cursor:pointer; font-family:inherit; padding:0; }
    .nc-link:hover { text-decoration:underline; }

    /* Form manual (inputs nativos estilizados) */
    .nc-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .nc-field { display:flex; flex-direction:column; gap:.35rem; }
    .nc-field.span-2 { grid-column:1/-1; }
    .nc-field label { font-size:.72rem; font-weight:600; color:var(--txt-2); letter-spacing:.02em; }
    .nc-req { color:var(--color-error); }
    .nc-input { height:44px; width:100%; box-sizing:border-box; border-radius:10px; border:1px solid var(--line-strong);
      background:var(--bg); color:var(--txt); padding:0 .85rem; font-size:.875rem; font-family:inherit; outline:none;
      transition:border-color .15s, box-shadow .15s; }
    .nc-input::placeholder { color:var(--txt-3); }
    .nc-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-softer); }
    select.nc-input { appearance:none; -webkit-appearance:none; cursor:pointer; padding-right:2.2rem;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2393a4b1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat:no-repeat; background-position:right .8rem center; }
    select.nc-input option { background:var(--panel-2); color:var(--txt); }

    /* Tablet */
    @media (max-width:1024px) {
      .crm-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }

    /* Phone */
    @media (max-width:760px) {
      .crm-page { padding:1.1rem; }
      .crm-page__head { flex-direction:column; align-items:stretch; }
      .crm-page__title { font-size:1.6rem; }
      .crm-btn-primary { justify-content:center; width:100%; }
      .crm-stats { grid-template-columns:1fr; }

      /* Filters scroll horizontally, toggle drops below */
      .crm-toolbar { flex-direction:column; align-items:stretch; }
      .crm-filters { flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:.25rem; }
      .crm-chip { flex:0 0 auto; }
      .crm-segmented { align-self:flex-start; }

      /* Table → stacked cards */
      .crm-table { background:transparent; border:none; border-radius:0; overflow:visible; }
      .crm-table__head { display:none; }
      .crm-row { display:block; padding:1rem 1.1rem; margin-bottom:.75rem; border:1px solid var(--line);
        border-radius:14px; background:var(--panel); }
      .crm-row:last-child { margin-bottom:0; }
      .crm-cell-client { margin-bottom:.5rem; }
      .crm-row > span[data-label] { display:flex; align-items:center; justify-content:space-between; gap:1rem;
        padding:.55rem 0; border-top:1px solid var(--line); }
      .crm-row > span[data-label]::before { content:attr(data-label); font-size:.68rem; font-weight:600;
        letter-spacing:.05em; text-transform:uppercase; color:var(--txt-3); }
      .crm-actions { justify-content:flex-end; }
      .crm-empty { padding:2.5rem 1rem; }

      /* Cards single column */
      .crm-cards { grid-template-columns:1fr; }

      /* Novo cadastro responsivo */
      .nc-tabs { grid-template-columns:repeat(2,1fr); }
      .nc-stepper { overflow-x:auto; -webkit-overflow-scrolling:touch; }
      .nc-step__line { min-width:24px; }
      .nc-docs { grid-template-columns:1fr; }
      .nc-form-grid { grid-template-columns:1fr; }
      .nc-form-grid .span-2 { grid-column:1; }
      .nc-foot { flex-direction:column-reverse; align-items:stretch; }
      .nc-foot__actions { flex-direction:column; }
      .nc-foot__actions .crm-btn-primary, .nc-foot__actions .crm-btn-outline { width:100%; justify-content:center; }
    }
  `],
})
export class ClientesComponent implements OnInit {
  clientes = signal<Cliente[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  searchTerm = signal('');
  view = signal<'tabela' | 'cards'>('tabela');
  form: FormGroup;
  ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  // ── Fluxo "Novo cadastro" ──
  flow = signal<'docs' | 'manual'>('docs');
  tipoCadastro = signal<TipoCadastro>('PF');
  currentStep = signal(1);
  uploads = signal<Record<string, string>>({});

  tipos: { key: TipoCadastro; label: string; icon: string }[] = [
    { key: 'PF', label: 'Pessoa Física', icon: 'person' },
    { key: 'PJ', label: 'Pessoa Jurídica', icon: 'domain' },
  ];
  steps = [
    { n: 1, label: 'Documentos', icon: 'upload_file' },
    { n: 2, label: 'Dados encontrados', icon: 'auto_awesome' },
    { n: 3, label: 'Complemento', icon: 'edit_note' },
    { n: 4, label: 'Revisão final', icon: 'check_circle' },
  ];
  private docsConfig: Record<TipoCadastro, DocReq[]> = {
    PF: [
      { key: 'rg', title: 'RG ou CNH', desc: 'Documento de identificação com foto', icon: 'badge', required: true },
      { key: 'end', title: 'Comprovante de Endereço', desc: 'Conta de luz, água, telefone (últimos 90 dias)', icon: 'home', required: false },
    ],
    PJ: [
      { key: 'cnpj', title: 'Cartão CNPJ', desc: 'Comprovante de inscrição e situação cadastral', icon: 'badge', required: true },
      { key: 'contrato', title: 'Contrato Social', desc: 'Última alteração consolidada', icon: 'description', required: true },
      { key: 'end', title: 'Comprovante de Endereço', desc: 'Da sede (últimos 90 dias)', icon: 'home', required: false },
    ],
  };

  docsForTipo(): DocReq[] { return this.docsConfig[this.tipoCadastro()]; }

  setTipo(k: TipoCadastro) {
    this.tipoCadastro.set(k);
    this.uploads.set({});
    this.form.patchValue({ tipo: k === 'PJ' ? 'PJ' : 'PF' });
  }

  onFile(key: string, ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (file) this.uploads.update(u => ({ ...u, [key]: file.name }));
  }

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      razaoSocial: ['', Validators.required], nomeFantasia: ['', Validators.required],
      tipo: ['PJ'], cnpjCpf: ['', Validators.required], inscricaoEstadual: [''],
      email: ['', [Validators.required, Validators.email]], telefone: [''],
      endereco: [''], cidade: [''], estado: [''], cep: [''],
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.appwrite.listDocuments<Cliente>('clientes').subscribe({
      next: d => { this.clientes.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  filtered(): Cliente[] {
    const t = this.searchTerm().toLowerCase();
    if (!t) return this.clientes();
    return this.clientes().filter(c =>
      c.razaoSocial?.toLowerCase().includes(t) ||
      c.nomeFantasia?.toLowerCase().includes(t) ||
      c.cnpjCpf?.includes(t),
    );
  }

  isPJ(c: Cliente): boolean { return (c.tipo || 'PJ') === 'PJ'; }
  isCartorioIa(c: Cliente): boolean { return (c.origem || '').toLowerCase().includes('cart'); }
  pendencias(c: Cliente): number { return c.pendencias ?? (c.status && c.status !== 'COMPLETO' && c.status !== 'ATIVO' ? 1 : 0); }

  countByTipo(t: string): number { return this.clientes().filter(c => (c.tipo || 'PJ') === t).length; }
  pendentesCount = computed(() => this.clientes().filter(c => this.pendencias(c) > 0).length);
  cartorioIaCount = computed(() => this.clientes().filter(c => this.isCartorioIa(c)).length);

  initials(name?: string): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  formatDoc(doc: string): string {
    if (!doc) return '';
    if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return doc;
  }

  openForm(c?: Cliente) {
    this.currentStep.set(1);
    this.uploads.set({});
    if (c) {
      this.editingId.set(c.$id);
      this.form.patchValue(c);
      this.tipoCadastro.set(c.tipo === 'PF' ? 'PF' : 'PJ');
      this.flow.set('manual');
    } else {
      this.editingId.set(null);
      this.form.reset({ tipo: 'PF' });
      this.tipoCadastro.set('PF');
      this.flow.set('docs');
    }
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingId.set(null); }

  save() {
    if (this.form.invalid) return;
    const data = { ...this.form.value, status: 'ATIVO', tenantId: 'default' };
    const id = this.editingId();
    const obs = id ? this.appwrite.updateDocument('clientes', id, data) : this.appwrite.createDocument('clientes', data);
    obs.subscribe({
      next: () => { this.snackBar.open(id ? 'Atualizado!' : 'Criado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.closeForm(); this.load(); },
      error: e => this.snackBar.open(e.message || 'Erro', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] }),
    });
  }

  delete(c: Cliente) {
    if (!confirm(`Excluir "${c.razaoSocial}"?`)) return;
    this.appwrite.deleteDocument('clientes', c.$id).subscribe({
      next: () => { this.snackBar.open('Excluído', 'OK', { duration: 3000 }); this.load(); },
      error: () => this.snackBar.open('Erro ao excluir', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }
}
