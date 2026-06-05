import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class FiscalService {
  private readonly apiUrl = `${environment.apiUrl}/fiscal`;

  constructor(private http: HttpClient) {}

  // NF-e
  listNfes(page = 0, size = 20): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'numero,desc');
    return this.http.get<any>(`${this.apiUrl}/nfe`, { params });
  }
  getNfe(id: string): Observable<any> { return this.http.get<any>(`${this.apiUrl}/nfe/${id}`); }
  createNfe(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/nfe`, data); }
  autorizarNfe(id: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/nfe/${id}/autorizar`, {}); }
  cancelarNfe(id: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/nfe/${id}/cancelar`, {}); }
  listNfesByTipo(tipo: string): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/nfe/tipo/${tipo}`); }

  // NFS-e
  listNfses(page = 0, size = 20): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'numero,desc');
    return this.http.get<any>(`${this.apiUrl}/nfse`, { params });
  }
  getNfse(id: string): Observable<any> { return this.http.get<any>(`${this.apiUrl}/nfse/${id}`); }
  createNfse(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/nfse`, data); }
  autorizarNfse(id: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/nfse/${id}/autorizar`, {}); }
  cancelarNfse(id: string, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/nfse/${id}/cancelar`, null, { params: { motivo } });
  }

  // Apuração ICMS
  calcularApuracaoIcms(ano: number, mes: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/apuracao-icms/calcular`, null, { params: { ano, mes } });
  }
  getApuracaoIcms(ano: number, mes: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/apuracao-icms`, { params: { ano, mes } });
  }
  listarApuracoesIcms(ano: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/apuracao-icms/ano/${ano}`);
  }
  fecharApuracaoIcms(ano: number, mes: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/apuracao-icms/fechar`, null, { params: { ano, mes } });
  }

  // Apuração PIS/COFINS
  calcularApuracaoPisCofins(ano: number, mes: number, regime = 'NAO_CUMULATIVO'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/apuracao-pis-cofins/calcular`, null, { params: { ano, mes, regime } });
  }
  getApuracaoPisCofins(ano: number, mes: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/apuracao-pis-cofins`, { params: { ano, mes } });
  }
  listarApuracoesPisCofins(ano: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/apuracao-pis-cofins/ano/${ano}`);
  }

  // Escrituração Fiscal
  criarEscrituracao(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/escrituracao`, data); }
  listarEscrituracoes(ano: number, mes: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/escrituracao`, { params: { ano, mes } });
  }
  listarEscrituracoesPorTipo(tipo: string, ano: number, mes: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/escrituracao/tipo/${tipo}`, { params: { ano, mes } });
  }

  // CIAP
  listarCiap(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/ciap`); }
  criarCiap(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/ciap`, data); }
  apropriarParcelaCiap(id: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/ciap/${id}/apropriar`, {}); }

  // Guias Fiscais
  criarGuia(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/guias`, data); }
  pagarGuia(id: string, data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/guias/${id}/pagar`, data); }
  cancelarGuia(id: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/guias/${id}/cancelar`, {}); }
  listarGuiasPorCompetencia(competencia: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/guias/competencia/${competencia}`);
  }
  listarGuiasVencidas(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/guias/vencidas`); }
  listarGuiasPorTipo(tipo: string): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/guias/tipo/${tipo}`); }

  // CT-e
  listCtes(page = 0, size = 20): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<any>(`${this.apiUrl}/cte`, { params });
  }
  createCte(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/cte`, data); }
  autorizarCte(id: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/cte/${id}/autorizar`, {}); }
  cancelarCte(id: string, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cte/${id}/cancelar`, null, { params: { motivo } });
  }
}
