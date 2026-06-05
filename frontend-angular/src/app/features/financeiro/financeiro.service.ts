import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  private readonly apiUrl = `${environment.apiUrl}/financeiro`;

  constructor(private http: HttpClient) {}

  // Contas a Pagar
  listContasPagar(page = 0, size = 20, status?: string): Observable<any> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'dataVencimento,asc');
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${this.apiUrl}/contas-pagar`, { params });
  }
  getContaPagar(id: string): Observable<any> { return this.http.get<any>(`${this.apiUrl}/contas-pagar/${id}`); }
  createContaPagar(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/contas-pagar`, data); }
  baixarContaPagar(id: string, data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/contas-pagar/${id}/baixar`, data); }
  cancelarContaPagar(id: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/contas-pagar/${id}/cancelar`, {}); }
  listContasPagarVencidas(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/contas-pagar/vencidas`); }

  // Contas a Receber
  listContasReceber(page = 0, size = 20, status?: string): Observable<any> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'dataVencimento,asc');
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${this.apiUrl}/contas-receber`, { params });
  }
  getContaReceber(id: string): Observable<any> { return this.http.get<any>(`${this.apiUrl}/contas-receber/${id}`); }
  createContaReceber(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/contas-receber`, data); }
  baixarContaReceber(id: string, data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/contas-receber/${id}/baixar`, data); }
  cancelarContaReceber(id: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/contas-receber/${id}/cancelar`, {}); }
  listContasReceberVencidas(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/contas-receber/vencidas`); }

  // Contas Bancárias
  listContasBancarias(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/contas-bancarias`); }
  listTodasContasBancarias(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/contas-bancarias/todas`); }
  createContaBancaria(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/contas-bancarias`, data); }
  updateContaBancaria(id: string, data: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/contas-bancarias/${id}`, data); }
  listMovimentos(contaId: string, page = 0, size = 50): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'data,desc');
    return this.http.get<any>(`${this.apiUrl}/contas-bancarias/${contaId}/movimentos`, { params });
  }

  // Fluxo de Caixa
  getFluxoCaixa(dataInicio: string, dataFim: string): Observable<any> {
    const params = new HttpParams().set('dataInicio', dataInicio).set('dataFim', dataFim);
    return this.http.get<any>(`${this.apiUrl}/fluxo-caixa`, { params });
  }

  // Conciliação
  listNaoConciliados(contaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conciliacao/nao-conciliados/${contaId}`);
  }
  listMovimentosPeriodo(contaId: string, inicio: string, fim: string): Observable<any[]> {
    const params = new HttpParams().set('inicio', inicio).set('fim', fim);
    return this.http.get<any[]>(`${this.apiUrl}/conciliacao/movimentos/${contaId}`, { params });
  }
  conciliar(movimentoIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/conciliacao/conciliar`, movimentoIds);
  }
  desconciliar(movimentoId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/conciliacao/desconciliar/${movimentoId}`, {});
  }
}
