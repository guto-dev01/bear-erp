import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'bear-esocial',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, MatSnackBarModule, MatTabsModule],
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
              <ng-container matColumnDef="funcionario"><th mat-header-cell *matHeaderCellDef class="text-label">Funcionário</th><td mat-cell *matCellDef="let e">{{ e.funcionarioNome || '-' }}</td></ng-container>
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
                        <span class="material-symbols-rounded text-base" style="color: #059669;">send</span>
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
            <mat-form-field appearance="outline"><mat-label>Funcionário ID</mat-label><input matInput formControlName="funcionarioId"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>CPF Funcionário</mat-label><input matInput formControlName="funcionarioCpf"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Nome Funcionário</mat-label><input matInput formControlName="funcionarioNome"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Competência (YYYY-MM)</mat-label><input matInput formControlName="competencia"></mat-form-field>
            <mat-form-field appearance="outline" class="col-span-2"><mat-label>Observação</mat-label><input matInput formControlName="observacao"></mat-form-field>
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
  eventos = signal<any[]>([]); loading = signal(false); showForm = signal(false); totalElements = signal(0);
  displayedColumns = ['tipo', 'grupo', 'funcionario', 'competencia', 'status', 'protocolo', 'acoes'];
  form!: FormGroup;
  private apiUrl = `${environment.apiUrl}/esocial`;

  gruposEventos = [
    { grupo: 'Tabelas', tipos: ['S1000', 'S1005', 'S1010', 'S1020', 'S1030', 'S1035', 'S1040', 'S1050', 'S1060', 'S1070', 'S1080'] },
    { grupo: 'Não Periódicos', tipos: ['S2190', 'S2200', 'S2205', 'S2206', 'S2210', 'S2220', 'S2230', 'S2240', 'S2298', 'S2299', 'S2300', 'S2306', 'S2399', 'S2400'] },
    { grupo: 'Periódicos', tipos: ['S1200', 'S1202', 'S1207', 'S1210', 'S1260', 'S1270', 'S1280', 'S1298', 'S1299'] },
  ];

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      tipoEvento: ['', Validators.required], funcionarioId: [''], funcionarioCpf: [''],
      funcionarioNome: [''], competencia: [''], observacao: [''],
    });
    this.carregar();
  }

  carregar(page = 0) {
    this.loading.set(true);
    const params = new HttpParams().set('page', page).set('size', 20);
    this.http.get<any>(this.apiUrl, { params }).subscribe({
      next: (res) => { this.eventos.set(res.content || []); this.totalElements.set(res.totalElements || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent) { this.carregar(event.pageIndex); }
  resetForm() { this.form.reset(); }

  filtrarPorTipo(tipo: string) {
    if (!tipo) { this.carregar(); return; }
    this.loading.set(true);
    const params = new HttpParams().set('tipo', tipo).set('page', 0).set('size', 20);
    this.http.get<any>(this.apiUrl, { params }).subscribe({
      next: (res) => { this.eventos.set(res.content || []); this.totalElements.set(res.totalElements || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  filtrarPorCompetencia(event: Event) {
    const comp = (event.target as HTMLInputElement).value;
    if (!comp) { this.carregar(); return; }
    this.loading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/competencia/${comp}`).subscribe({
      next: (res) => { this.eventos.set(res || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  carregarPendentes() {
    this.loading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/pendentes`).subscribe({
      next: (res) => { this.eventos.set(res || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  salvar() {
    if (this.form.valid) {
      this.http.post<any>(this.apiUrl, this.form.value).subscribe({
        next: () => { this.snackBar.open('Evento criado!', 'OK', { duration: 3000 }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao criar evento', 'OK', { duration: 3000 }),
      });
    }
  }

  validar(id: string) {
    this.http.post<any>(`${this.apiUrl}/${id}/validar`, {}).subscribe({
      next: () => { this.snackBar.open('Evento validado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao validar', 'OK', { duration: 3000 }),
    });
  }

  enviar(id: string) {
    this.http.post<any>(`${this.apiUrl}/${id}/enviar`, {}).subscribe({
      next: () => { this.snackBar.open('Evento enviado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao enviar', 'OK', { duration: 3000 }),
    });
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'RASCUNHO': 'badge--neutral',
      'VALIDADO': 'badge--info',
      'ENVIADO': 'badge--warning',
      'PROCESSADO': 'badge--info',
      'ACEITO': 'badge--success',
      'REJEITADO': 'badge--error',
    };
    return map[s] || 'badge--neutral';
  }
}
