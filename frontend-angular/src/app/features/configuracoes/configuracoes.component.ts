import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ThemeService } from '@core/services/theme.service';

interface ConfigSection {
  title: string; icon: string; description: string; color: string; bgColor: string; key: string;
}

@Component({
  selector: 'bear-configuracoes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSlideToggleModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Configurações</h1>
          <p class="page-header__subtitle">Personalize o sistema de acordo com as necessidades</p>
        </div>
      </div>

      @if (!activeSection()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in-up">
          @for (item of configItems; track item.key; let i = $index) {
            <div class="bear-card bear-card--interactive p-6 flex flex-col gap-4" [style.animation-delay]="(i*60)+'ms'"
                 (click)="activeSection.set(item.key)">
              <div class="flex items-start justify-between">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center" [style.background]="item.bgColor">
                  <span class="material-symbols-rounded text-2xl" [style.color]="item.color">{{ item.icon }}</span>
                </div>
                <span class="material-symbols-rounded text-lg" style="color:var(--brand-primary);opacity:0.4;transition:opacity 0.2s;">arrow_forward</span>
              </div>
              <div>
                <h3 class="text-heading text-base mb-1">{{ item.title }}</h3>
                <p class="text-sm" style="color:var(--text-secondary);">{{ item.description }}</p>
              </div>
            </div>
          }
        </div>
      }

      <!-- Dados da Empresa -->
      @if (activeSection() === 'empresa') {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center gap-3 mb-6">
            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem" (click)="activeSection.set(null)">
              <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2 class="text-heading text-lg">Dados da Empresa</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Razão Social</mat-label><input matInput [(ngModel)]="empresa.razaoSocial"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Nome Fantasia</mat-label><input matInput [(ngModel)]="empresa.nomeFantasia"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>CNPJ</mat-label><input matInput [(ngModel)]="empresa.cnpj" maxlength="14"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Inscrição Estadual</mat-label><input matInput [(ngModel)]="empresa.ie"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Inscrição Municipal</mat-label><input matInput [(ngModel)]="empresa.im"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Regime Tributário</mat-label>
              <mat-select [(ngModel)]="empresa.regime">
                <mat-option value="SIMPLES">Simples Nacional</mat-option>
                <mat-option value="PRESUMIDO">Lucro Presumido</mat-option>
                <mat-option value="REAL">Lucro Real</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>CNAE Principal</mat-label><input matInput [(ngModel)]="empresa.cnae"></mat-form-field>
            <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Endereço</mat-label><input matInput [(ngModel)]="empresa.endereco"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Cidade</mat-label><input matInput [(ngModel)]="empresa.cidade"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>UF</mat-label><input matInput [(ngModel)]="empresa.uf" maxlength="2"></mat-form-field>
          </div>
          <div class="flex justify-end mt-6">
            <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" (click)="salvar('Dados da empresa')">
              <span class="material-symbols-rounded text-lg mr-1">save</span> Salvar
            </button>
          </div>
        </div>
      }

      <!-- Aparência -->
      @if (activeSection() === 'aparencia') {
        <div class="bear-card p-6 max-w-2xl animate-fade-in-up">
          <div class="flex items-center gap-3 mb-6">
            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem" (click)="activeSection.set(null)">
              <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2 class="text-heading text-lg">Aparência</h2>
          </div>
          <div class="flex flex-col gap-5">
            <div class="flex items-center justify-between p-4 rounded-xl" style="background:var(--surface-1)">
              <div>
                <p class="text-sm font-semibold" style="color:var(--text-primary)">Tema Escuro</p>
                <p class="text-xs" style="color:var(--text-secondary)">Reduz o brilho da tela em ambientes escuros</p>
              </div>
              <mat-slide-toggle [checked]="theme.isDark()" (change)="theme.toggle()"></mat-slide-toggle>
            </div>
            <div class="flex items-center justify-between p-4 rounded-xl" style="background:var(--surface-1)">
              <div>
                <p class="text-sm font-semibold" style="color:var(--text-primary)">Animações</p>
                <p class="text-xs" style="color:var(--text-secondary)">Desative para melhorar a performance</p>
              </div>
              <mat-slide-toggle [checked]="animacoes" (change)="animacoes = !animacoes"></mat-slide-toggle>
            </div>
            <div class="flex items-center justify-between p-4 rounded-xl" style="background:var(--surface-1)">
              <div>
                <p class="text-sm font-semibold" style="color:var(--text-primary)">Sidebar compacta</p>
                <p class="text-xs" style="color:var(--text-secondary)">Mostra apenas ícones na barra lateral</p>
              </div>
              <mat-slide-toggle [checked]="sidebarCompacta" (change)="sidebarCompacta = !sidebarCompacta"></mat-slide-toggle>
            </div>
          </div>
        </div>
      }

      <!-- Fiscal -->
      @if (activeSection() === 'fiscal') {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center gap-3 mb-6">
            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem" (click)="activeSection.set(null)">
              <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2 class="text-heading text-lg">Configurações Fiscais</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field appearance="outline"><mat-label>Ambiente NF-e</mat-label>
              <mat-select [(ngModel)]="fiscal.ambiente">
                <mat-option value="HOMOLOGACAO">Homologação</mat-option>
                <mat-option value="PRODUCAO">Produção</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Série NF-e</mat-label><input matInput [(ngModel)]="fiscal.serieNfe"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Próximo Nº NF-e</mat-label><input matInput type="number" [(ngModel)]="fiscal.proximoNfe"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Série NFS-e</mat-label><input matInput [(ngModel)]="fiscal.serieNfse"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>CST Padrão</mat-label><input matInput [(ngModel)]="fiscal.cstPadrao"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>CFOP Padrão</mat-label><input matInput [(ngModel)]="fiscal.cfopPadrao"></mat-form-field>
          </div>
          <div class="flex justify-end mt-6">
            <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" (click)="salvar('Configurações fiscais')">
              <span class="material-symbols-rounded text-lg mr-1">save</span> Salvar
            </button>
          </div>
        </div>
      }

      <!-- Usuários -->
      @if (activeSection() === 'usuarios') {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center gap-3 mb-6">
            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem" (click)="activeSection.set(null)">
              <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2 class="text-heading text-lg">Usuários e Permissões</h2>
          </div>
          <div class="flex flex-col gap-3">
            @for (u of usuarios; track u.email) {
              <div class="flex items-center justify-between p-4 rounded-xl" style="background:var(--surface-1)">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style="background:linear-gradient(135deg,#007AFF,#5856D6)">{{ u.nome.charAt(0) }}</div>
                  <div>
                    <p class="text-sm font-semibold" style="color:var(--text-primary)">{{ u.nome }}</p>
                    <p class="text-xs" style="color:var(--text-tertiary)">{{ u.email }}</p>
                  </div>
                </div>
                <span class="badge" [ngClass]="u.role === 'ADMIN' ? 'badge--info' : 'badge--neutral'">{{ u.role }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Certificado -->
      @if (activeSection() === 'certificado') {
        <div class="bear-card p-6 max-w-2xl animate-fade-in-up">
          <div class="flex items-center gap-3 mb-6">
            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem" (click)="activeSection.set(null)">
              <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2 class="text-heading text-lg">Certificado Digital</h2>
          </div>
          <div class="p-4 rounded-xl mb-4" style="background:var(--surface-1)">
            <div class="flex items-center gap-3 mb-2">
              <span class="material-symbols-rounded" style="color:#34C759">verified</span>
              <span class="text-sm font-semibold" style="color:var(--text-primary)">Certificado A1 Instalado</span>
            </div>
            <p class="text-xs" style="color:var(--text-secondary)">Válido até: 15/08/2026 | Emissor: AC VALID</p>
          </div>
          <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1.25rem;">
            <span class="material-symbols-rounded text-lg mr-1">upload_file</span> Importar Novo Certificado
          </button>
        </div>
      }

      <!-- Contábil -->
      @if (activeSection() === 'contabil') {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center gap-3 mb-6">
            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem" (click)="activeSection.set(null)">
              <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2 class="text-heading text-lg">Configurações Contábeis</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field appearance="outline"><mat-label>Exercício Atual</mat-label><input matInput type="number" [(ngModel)]="contabil.exercicio"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Início do Exercício</mat-label><input matInput type="date" [(ngModel)]="contabil.inicio"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Plano de Contas</mat-label>
              <mat-select [(ngModel)]="contabil.plano">
                <mat-option value="CFC">CFC/CPC</mat-option>
                <mat-option value="PERSONALIZADO">Personalizado</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Lançamento Automático</mat-label>
              <mat-select [(ngModel)]="contabil.lancamentoAuto">
                <mat-option value="SIM">Sim</mat-option>
                <mat-option value="NAO">Não</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="flex justify-end mt-6">
            <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" (click)="salvar('Configurações contábeis')">
              <span class="material-symbols-rounded text-lg mr-1">save</span> Salvar
            </button>
          </div>
        </div>
      }

      <!-- Integrações -->
      @if (activeSection() === 'integracoes') {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center gap-3 mb-6">
            <button class="bear-btn bear-btn--ghost" style="padding:0.25rem" (click)="activeSection.set(null)">
              <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2 class="text-heading text-lg">Integrações</h2>
          </div>
          <div class="flex flex-col gap-3">
            @for (api of apis; track api.nome) {
              <div class="flex items-center justify-between p-4 rounded-xl" style="background:var(--surface-1)">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" [style.background]="api.bgColor">
                    <span class="material-symbols-rounded" [style.color]="api.color">{{ api.icon }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-semibold" style="color:var(--text-primary)">{{ api.nome }}</p>
                    <p class="text-xs" style="color:var(--text-tertiary)">{{ api.descricao }}</p>
                  </div>
                </div>
                <mat-slide-toggle [checked]="api.ativo" (change)="api.ativo = !api.ativo"></mat-slide-toggle>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ConfiguracoesComponent {
  activeSection = signal<string | null>(null);
  animacoes = true;
  sidebarCompacta = false;

  configItems: ConfigSection[] = [
    { title: 'Dados da Empresa', icon: 'business', description: 'Razão social, CNPJ, endereço e regime tributário', color: '#007AFF', bgColor: '#ECEBFB', key: 'empresa' },
    { title: 'Aparência', icon: 'palette', description: 'Tema, animações e personalização visual', color: '#5856D6', bgColor: '#F2EBFB', key: 'aparencia' },
    { title: 'Usuários', icon: 'people', description: 'Gerenciar usuários e permissões de acesso', color: '#34C759', bgColor: '#E9FAEF', key: 'usuarios' },
    { title: 'Certificado Digital', icon: 'verified_user', description: 'Certificado A1/A3 para emissão de NF-e', color: '#30B0C7', bgColor: '#E6F8FB', key: 'certificado' },
    { title: 'Fiscal', icon: 'receipt_long', description: 'Séries, numeração, ambiente e parâmetros fiscais', color: '#FF9500', bgColor: '#FFF4E5', key: 'fiscal' },
    { title: 'Contábil', icon: 'account_balance', description: 'Exercício, plano de contas e períodos contábeis', color: '#30B0C7', bgColor: '#E6F8FB', key: 'contabil' },
    { title: 'Integrações', icon: 'sync', description: 'APIs, bancos, webhooks e serviços conectados', color: '#FF3B30', bgColor: '#FFECEB', key: 'integracoes' },
  ];

  empresa = { razaoSocial: '', nomeFantasia: '', cnpj: '', ie: '', im: '', regime: 'SIMPLES', cnae: '', endereco: '', cidade: '', uf: '' };
  fiscal = { ambiente: 'HOMOLOGACAO', serieNfe: '1', proximoNfe: 1, serieNfse: '1', cstPadrao: '00', cfopPadrao: '5102' };
  contabil = { exercicio: 2026, inicio: '2026-01-01', plano: 'CFC', lancamentoAuto: 'SIM' };
  usuarios = [
    { nome: 'Administrador', email: 'admin@bearerp.com.br', role: 'ADMIN' },
    { nome: 'Contador', email: 'contador@bearerp.com.br', role: 'CONTADOR' },
  ];
  apis = [
    { nome: 'Banco do Brasil', icon: 'account_balance', descricao: 'Conciliação e pagamentos', color: '#FF9500', bgColor: '#FFF4E5', ativo: false },
    { nome: 'Receita Federal', icon: 'policy', descricao: 'Consultas CNPJ e NFe', color: '#34C759', bgColor: '#E9FAEF', ativo: true },
    { nome: 'eSocial', icon: 'badge', descricao: 'Envio de eventos trabalhistas', color: '#007AFF', bgColor: '#ECEBFB', ativo: true },
    { nome: 'SPED', icon: 'description', descricao: 'Transmissão de escriturações', color: '#30B0C7', bgColor: '#E6F8FB', ativo: true },
  ];

  constructor(public theme: ThemeService, private snackBar: MatSnackBar) {}

  salvar(section: string) {
    this.snackBar.open(`${section} salvas com sucesso!`, 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
  }
}
