import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OcrClienteService, type OcrResultado } from '@core/ocr/ocr-cliente.service';
import type { TipoPessoa, TipoDocumento } from '@core/ocr/parse-cadastro';

interface DocHistorico {
  id: number;
  nomeArquivo: string;
  documento: string;     // rótulo do tipo de documento (CNH, RG, CNPJ…)
  identificador: string; // CPF ou CNPJ extraído
  nome: string;          // nome completo / razão social
  confianca: number;
  manual: boolean;
}

@Component({
  selector: 'bear-ocr',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatTooltipModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">OCR de Documentos</h1>
          <p class="page-header__subtitle">Extração de dados de documentos de cadastro (CNH, RG, CNPJ…) — 100% no navegador</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">document_scanner</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Documentos Processados</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ historico().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">verified</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Confiança Média</p><p class="text-2xl font-bold" style="color:#34C759">{{ taxaAcerto() }}%</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFF4E5"><span class="material-symbols-rounded" style="color:#FF9500">timer</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Tempo Médio</p><p class="text-2xl font-bold" style="color:#FF9500">{{ tempoMedio() }}</p></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Upload Area -->
        <div class="bear-card p-6 animate-fade-in-up">
          <h3 class="text-heading text-base mb-4">Upload de Documento</h3>

          @if (!processing() && !resultado()) {
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label class="text-xs font-medium block mb-1" style="color:var(--text-secondary)">Tipo de pessoa</label>
                <select class="bear-input w-full" [(ngModel)]="tipoPessoa" (ngModelChange)="onTipoPessoa()">
                  <option value="PF">Pessoa Física</option>
                  <option value="PJ">Pessoa Jurídica</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium block mb-1" style="color:var(--text-secondary)">Tipo de documento</label>
                <select class="bear-input w-full" [(ngModel)]="tipoDocumento">
                  @for (d of docsDisponiveis(); track d.value) {
                    <option [value]="d.value">{{ d.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="flex flex-col items-center justify-center p-8 rounded-xl"
                 style="border:2px dashed var(--border-subtle);background:var(--surface-1);cursor:pointer;transition:all 0.2s;"
                 (click)="fileInput.click()"
                 (dragover)="$event.preventDefault()"
                 (drop)="onDrop($event)">
              <span class="material-symbols-rounded text-4xl mb-3" style="color:var(--text-tertiary)">cloud_upload</span>
              <p class="text-sm font-medium mb-1" style="color:var(--text-primary)">Arraste um documento ou clique para selecionar</p>
              <p class="text-xs" style="color:var(--text-tertiary)">PDF, JPG ou PNG — até 10MB</p>
            </div>
            <input #fileInput type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" (change)="onFileSelect($event)">
          }

          @if (processing()) {
            <div class="flex flex-col items-center justify-center py-12">
              <div class="login__spinner" style="width:48px;height:48px;border:4px solid var(--surface-3);border-top-color:var(--brand-primary);margin-bottom:1rem;"></div>
              <p class="text-sm font-medium" style="color:var(--text-primary)">{{ status() || 'Processando documento…' }}</p>
              <p class="text-xs" style="color:var(--text-tertiary)">Lendo no navegador — sem enviar a nenhum servidor</p>
            </div>
          }

          @if (resultado(); as r) {
            <div class="animate-fade-in-up">
              @if (r.preenchimentoManual) {
                <div class="flex items-center gap-2 mb-4">
                  <span class="material-symbols-rounded" style="color:#FF9500">error</span>
                  <span class="text-sm font-semibold" style="color:#FF9500">Não foi possível extrair automaticamente</span>
                </div>
                <p class="text-sm mb-4" style="color:var(--text-secondary)">{{ r.mensagem }}</p>
              } @else {
                <div class="flex items-center gap-2 mb-4">
                  <span class="material-symbols-rounded" style="color:#34C759">check_circle</span>
                  <span class="text-sm font-semibold" style="color:#34C759">Documento processado com sucesso</span>
                </div>
                <div class="flex flex-col gap-3 mb-4">
                  @for (c of campos(); track c.label) {
                    <div class="flex justify-between py-2 gap-4" style="border-bottom:1px solid var(--border-subtle)">
                      <span class="text-xs font-medium" style="color:var(--text-tertiary)">{{ c.label }}</span>
                      <span class="text-sm font-medium text-right" [style.color]="c.baixa ? '#FF9500' : 'var(--text-primary)'">{{ c.value }}</span>
                    </div>
                  } @empty {
                    <p class="text-sm" style="color:var(--text-tertiary)">Nenhum campo reconhecido.</p>
                  }
                  <div class="flex justify-between py-2">
                    <span class="text-xs font-medium" style="color:var(--text-tertiary)">Confiança</span>
                    <span class="text-sm font-semibold" [style.color]="r.confidence > 90 ? '#34C759' : '#FF9500'">{{ r.confidence }}%</span>
                  </div>
                </div>
                @if (r.avisos.length) {
                  <div class="p-3 rounded-lg mb-4 text-xs" style="background:var(--surface-1);color:var(--text-secondary)">
                    @for (a of r.avisos; track a) { <p>• {{ a }}</p> }
                  </div>
                }
              }
              <div class="flex gap-3">
                <button class="bear-btn bear-btn--outline flex-1" style="padding:0.5rem 1rem;font-size:0.8125rem;" (click)="reset()">
                  <span class="material-symbols-rounded text-base mr-1">upload</span> Novo documento
                </button>
              </div>
            </div>
          }
        </div>

        <!-- History -->
        <div class="bear-card p-6 animate-fade-in-up" style="animation-delay:100ms">
          <h3 class="text-heading text-base mb-4">Histórico de Processamento</h3>
          @if (historico().length === 0) {
            <div class="flex flex-col items-center py-8">
              <span class="material-symbols-rounded text-3xl mb-2" style="color:var(--text-tertiary)">history</span>
              <p class="text-sm" style="color:var(--text-tertiary)">Nenhum documento processado ainda</p>
            </div>
          } @else {
            <div class="flex flex-col gap-3">
              @for (doc of historico(); track doc.id) {
                <div class="flex items-center gap-3 p-3 rounded-lg" style="background:var(--surface-1);">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background:var(--surface-2)">
                    <span class="material-symbols-rounded text-sm" style="color:var(--text-secondary)">description</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate" style="color:var(--text-primary)">{{ doc.nome || doc.nomeArquivo }}</p>
                    <p class="text-xs truncate" style="color:var(--text-tertiary)">{{ doc.documento }}{{ doc.identificador ? ' — ' + doc.identificador : '' }}</p>
                  </div>
                  @if (doc.manual) {
                    <span class="badge badge--warning text-xs">manual</span>
                  } @else {
                    <span class="badge badge--success text-xs">{{ doc.confianca }}%</span>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class OcrComponent {
  processing = signal(false);
  status = signal('');
  resultado = signal<OcrResultado | null>(null);
  historico = signal<DocHistorico[]>([]);
  tipoPessoa: TipoPessoa = 'PF';
  tipoDocumento: TipoDocumento = 'CNH';

  private nextId = 1;
  private tempos: number[] = [];

  private readonly docsPF = [
    { value: 'CNH' as const, label: 'CNH' },
    { value: 'RG' as const, label: 'RG' },
    { value: 'COMPROVANTE_ENDERECO' as const, label: 'Comprovante de endereço' },
  ];
  private readonly docsPJ = [
    { value: 'CNPJ' as const, label: 'Cartão CNPJ' },
    { value: 'CONTRATO_SOCIAL' as const, label: 'Contrato social' },
  ];

  constructor(private ocr: OcrClienteService, private snackBar: MatSnackBar) {}

  docsDisponiveis() {
    return this.tipoPessoa === 'PJ' ? this.docsPJ : this.docsPF;
  }

  onTipoPessoa() {
    const docs = this.tipoPessoa === 'PJ' ? this.docsPJ : this.docsPF;
    this.tipoDocumento = docs[0].value;
  }

  taxaAcerto(): number {
    const h = this.historico().filter(d => !d.manual);
    return h.length > 0 ? Math.round(h.reduce((s, d) => s + d.confianca, 0) / h.length) : 0;
  }

  tempoMedio(): string {
    if (!this.tempos.length) return '—';
    const avg = this.tempos.reduce((s, t) => s + t, 0) / this.tempos.length;
    return `${(avg / 1000).toFixed(1)}s`;
  }

  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  reset() {
    this.resultado.set(null);
    this.status.set('');
  }

  private async processFile(file: File) {
    this.processing.set(true);
    this.resultado.set(null);
    this.status.set('Lendo documento…');
    const inicio = performance.now();
    try {
      const r = await this.ocr.extrair(file, this.tipoPessoa, this.tipoDocumento, s => this.status.set(s));
      const elapsed = performance.now() - inicio;
      this.tempos.push(elapsed);
      this.resultado.set(r);
      this.historico.update(h => [this.toHistorico(file, r), ...h]);
      this.snackBar.open(
        r.preenchimentoManual ? 'Não foi possível extrair automaticamente.' : 'Documento processado!',
        'OK', { duration: 3000, panelClass: [r.preenchimentoManual ? 'warning-snackbar' : 'success-snackbar'] });
    } catch {
      this.snackBar.open('Falha ao processar o documento.', 'Fechar', { duration: 4000 });
    } finally {
      this.processing.set(false);
    }
  }

  private toHistorico(file: File, r: OcrResultado): DocHistorico {
    const docs = this.tipoPessoa === 'PJ' ? this.docsPJ : this.docsPF;
    const label = docs.find(d => d.value === this.tipoDocumento)?.label || this.tipoDocumento;
    return {
      id: this.nextId++,
      nomeArquivo: file.name,
      documento: label,
      identificador: r.cnpj || r.cpf || '',
      nome: r.razaoSocial || r.nomeCompleto || '',
      confianca: r.confidence,
      manual: r.preenchimentoManual,
    };
  }

  // Campos extraídos não nulos, ordenados conforme o tipo de pessoa.
  campos = computed<{ label: string; value: string; baixa: boolean }[]>(() => {
    const r = this.resultado();
    if (!r || r.preenchimentoManual) return [];
    const baixa = r.camposComBaixaConfianca || [];
    const out: { label: string; value: string; baixa: boolean }[] = [];
    const add = (label: string, value: string | null, key?: string) => {
      if (value) out.push({ label, value, baixa: !!key && baixa.includes(key) });
    };
    if (this.tipoPessoa === 'PJ') {
      add('CNPJ', r.cnpj, 'cnpj');
      add('Razão Social', r.razaoSocial, 'razaoSocial');
      add('Nome Fantasia', r.nomeFantasia, 'nomeFantasia');
      add('Abertura', r.dataAbertura, 'dataAbertura');
      add('Natureza Jurídica', r.naturezaJuridica);
      add('CNAE Principal', r.cnaePrincipal);
      add('Capital Social', r.capitalSocial);
    } else {
      add('Nome', r.nomeCompleto, 'nomeCompleto');
      add('CPF', r.cpf, 'cpf');
      add('RG', r.rg, 'rg');
      add('Nascimento', r.dataNascimento, 'dataNascimento');
      add('Nome da Mãe', r.nomeMae);
      add('Nome do Pai', r.nomePai);
    }
    add('CEP', r.cep, 'cep');
    add('Logradouro', [r.logradouro, r.numero].filter(Boolean).join(', ') || null);
    add('Bairro', r.bairro);
    add('Cidade/UF', [r.cidade, r.estado].filter(Boolean).join(' / ') || null);
    return out;
  });
}
