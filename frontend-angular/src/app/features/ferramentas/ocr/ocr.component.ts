import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface DocProcessado {
  id: number;
  nomeArquivo: string;
  tipoDocumento: string;
  cnpjCpf: string;
  valor: number;
  data: string;
  numero: string;
  processadoEm: Date;
  confianca: number;
}

@Component({
  selector: 'bear-ocr',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTooltipModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">OCR de Documentos</h1>
          <p class="page-header__subtitle">Digitalização e extração automática de dados fiscais</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#eef2ff"><span class="material-symbols-rounded" style="color:#4f46e5">document_scanner</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Documentos Processados</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ historico().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ecfdf5"><span class="material-symbols-rounded" style="color:#059669">verified</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Taxa de Acerto</p><p class="text-2xl font-bold" style="color:#059669">{{ taxaAcerto() }}%</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#fffbeb"><span class="material-symbols-rounded" style="color:#d97706">timer</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Tempo Médio</p><p class="text-2xl font-bold" style="color:#d97706">2.3s</p></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Upload Area -->
        <div class="bear-card p-6 animate-fade-in-up">
          <h3 class="text-heading text-base mb-4">Upload de Documento</h3>

          @if (!processing() && !resultado()) {
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
              <p class="text-sm font-medium" style="color:var(--text-primary)">Processando documento...</p>
              <p class="text-xs" style="color:var(--text-tertiary)">Extraindo dados com IA</p>
            </div>
          }

          @if (resultado()) {
            <div class="animate-fade-in-up">
              <div class="flex items-center gap-2 mb-4">
                <span class="material-symbols-rounded" style="color:#059669">check_circle</span>
                <span class="text-sm font-semibold" style="color:#059669">Documento processado com sucesso</span>
              </div>
              <div class="flex flex-col gap-3 mb-4">
                <div class="flex justify-between py-2" style="border-bottom:1px solid var(--border-subtle)">
                  <span class="text-xs font-medium" style="color:var(--text-tertiary)">Tipo Documento</span>
                  <span class="badge badge--info">{{ resultado()!.tipoDocumento }}</span>
                </div>
                <div class="flex justify-between py-2" style="border-bottom:1px solid var(--border-subtle)">
                  <span class="text-xs font-medium" style="color:var(--text-tertiary)">CNPJ/CPF</span>
                  <span class="text-sm font-mono font-medium" style="color:var(--text-primary)">{{ resultado()!.cnpjCpf }}</span>
                </div>
                <div class="flex justify-between py-2" style="border-bottom:1px solid var(--border-subtle)">
                  <span class="text-xs font-medium" style="color:var(--text-tertiary)">Valor</span>
                  <span class="text-sm font-semibold" style="color:#059669">{{ resultado()!.valor | currency:'BRL' }}</span>
                </div>
                <div class="flex justify-between py-2" style="border-bottom:1px solid var(--border-subtle)">
                  <span class="text-xs font-medium" style="color:var(--text-tertiary)">Data</span>
                  <span class="text-sm" style="color:var(--text-primary)">{{ resultado()!.data }}</span>
                </div>
                <div class="flex justify-between py-2" style="border-bottom:1px solid var(--border-subtle)">
                  <span class="text-xs font-medium" style="color:var(--text-tertiary)">Nº Documento</span>
                  <span class="text-sm font-mono" style="color:var(--text-primary)">{{ resultado()!.numero }}</span>
                </div>
                <div class="flex justify-between py-2">
                  <span class="text-xs font-medium" style="color:var(--text-tertiary)">Confiança</span>
                  <span class="text-sm font-semibold" [style.color]="resultado()!.confianca > 90 ? '#059669' : '#d97706'">{{ resultado()!.confianca }}%</span>
                </div>
              </div>
              <div class="flex gap-3">
                <button class="bear-btn bear-btn--primary flex-1" style="padding:0.5rem 1rem;font-size:0.8125rem;" matTooltip="Criar lançamento contábil a partir deste documento">
                  <span class="material-symbols-rounded text-base mr-1">add_circle</span> Criar Lançamento
                </button>
                <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem;font-size:0.8125rem;" (click)="resultado.set(null)">
                  <span class="material-symbols-rounded text-base mr-1">upload</span> Novo
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
                    <p class="text-sm font-medium truncate" style="color:var(--text-primary)">{{ doc.nomeArquivo }}</p>
                    <p class="text-xs" style="color:var(--text-tertiary)">{{ doc.tipoDocumento }} — {{ doc.valor | currency:'BRL' }}</p>
                  </div>
                  <span class="badge badge--success text-xs">{{ doc.confianca }}%</span>
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
  resultado = signal<DocProcessado | null>(null);
  historico = signal<DocProcessado[]>([]);
  private nextId = 1;

  constructor(private snackBar: MatSnackBar) {}

  taxaAcerto(): number {
    const h = this.historico();
    return h.length > 0 ? Math.round(h.reduce((s, d) => s + d.confianca, 0) / h.length) : 0;
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

  private processFile(file: File) {
    this.processing.set(true);
    this.resultado.set(null);

    setTimeout(() => {
      const tipos = ['NF-e', 'NFS-e', 'Boleto', 'Recibo', 'Contrato'];
      const tipo = tipos[Math.floor(Math.random() * tipos.length)];
      const doc: DocProcessado = {
        id: this.nextId++,
        nomeArquivo: file.name,
        tipoDocumento: tipo,
        cnpjCpf: this.randomCnpj(),
        valor: Math.round(Math.random() * 50000 * 100) / 100,
        data: this.randomDate(),
        numero: String(Math.floor(Math.random() * 999999)).padStart(6, '0'),
        processadoEm: new Date(),
        confianca: Math.floor(Math.random() * 15) + 85,
      };
      this.resultado.set(doc);
      this.historico.update(h => [doc, ...h]);
      this.processing.set(false);
      this.snackBar.open('Documento processado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
    }, 2000);
  }

  private randomCnpj(): string {
    const n = () => Math.floor(Math.random() * 10);
    return `${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}/0001-${n()}${n()}`;
  }

  private randomDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 60));
    return d.toLocaleDateString('pt-BR');
  }
}
