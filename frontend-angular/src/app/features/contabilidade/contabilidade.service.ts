import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ContabilidadeService {
  private readonly apiUrl = `${environment.apiUrl}/contabilidade`;

  constructor(private http: HttpClient) {}

  // Plano de Contas
  listContas(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/plano-contas`); }
  getContaById(id: string): Observable<any> { return this.http.get<any>(`${this.apiUrl}/plano-contas/${id}`); }
  createConta(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/plano-contas`, data); }
  updateConta(id: string, data: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/plano-contas/${id}`, data); }
  deleteConta(id: string): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/plano-contas/${id}`); }
  getArvoreContas(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/plano-contas/arvore`); }
  listContasAnaliticas(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/plano-contas/analiticas`); }
  importPlanoReferencial(): Observable<any[]> { return this.http.post<any[]>(`${this.apiUrl}/plano-contas/importar-referencial`, {}); }

  // Lançamentos
  listLancamentos(page = 0, size = 20): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'numero,desc');
    return this.http.get<any>(`${this.apiUrl}/lancamentos`, { params });
  }
  getLancamento(id: string): Observable<any> { return this.http.get<any>(`${this.apiUrl}/lancamentos/${id}`); }
  createLancamento(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/lancamentos`, data); }
  estornarLancamento(id: string, data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/lancamentos/${id}/estornar`, data); }
  listByCompetencia(ano: number, mes: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lancamentos/competencia`, { params: { ano, mes } });
  }

  // Balancete
  gerarBalancete(ano: number, mes: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/balancete`, { params: { ano, mes } });
  }

  // DRE
  gerarDre(ano: number, mes: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dre`, { params: { ano, mes } });
  }

  // Balanço
  gerarBalanco(dataBase: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/balanco`, { params: { dataBase } });
  }

  // Períodos
  listarPeriodos(ano: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/periodos/${ano}`); }
  fecharPeriodo(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/periodos/fechar`, data); }
  reabrirPeriodo(ano: number, mes: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/periodos/${ano}/${mes}/reabrir`, {}); }

  // Exercícios
  criarExercicio(ano: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/exercicios/${ano}`, {}); }
  encerrarExercicio(ano: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/exercicios/${ano}/encerrar`, {}); }

  // Históricos Padrão
  listHistoricos(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/historicos-padrao`); }
}
