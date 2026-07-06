import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

/**
 * Cliente do worker SEFAZ (FastAPI / módulo Python fiscal_sefaz).
 * O navegador não faz SOAP — chama este serviço, que executa a consulta real
 * com um certificado A1 avulso (.pfx/.p12) enviado na própria requisição.
 *
 * Base URL: `environment.sefazWorkerUrl` — localhost:8770 em dev, Render em
 * produção (serviço `bear-fiscal-sefaz` do render.yaml na raiz do repo).
 *
 * É o caminho alternativo ao cofre: quando o A1 já está no cofre do Appwrite,
 * a tela usa a Function `nfe-transmissao` (FiscalService) e este worker não
 * é chamado.
 */
export interface CertInfo {
  ok: boolean;
  certificate_cnpj?: string;
  subject_name?: string;
  issuer?: string;
  valid_from?: string;
  valid_until?: string;
  status?: string;
  dias_restantes?: number;
  last_validation_at?: string;
  erro?: string;
  detalhe?: string;
}

export interface DocumentoSefaz {
  nsu: string;
  schema_name: string;
  document_type: string;
  access_key?: string;
  cnpj_emitente?: string;
  xml_hash?: string;
  xml_size?: number;
  dados?: Record<string, any>;
}

export interface ResultadoSync {
  ok: boolean;
  cstat?: number;
  motivo?: string;
  ult_nsu?: string;
  max_nsu?: string;
  fim_do_lote?: boolean;
  consumo_indevido?: boolean;
  documentos?: DocumentoSefaz[];
  erro?: string;
  detalhe?: string;
}

@Injectable({ providedIn: 'root' })
export class SefazImportService {
  private http = inject(HttpClient);
  /** Base do worker Python (FastAPI), sem barra final. */
  readonly base = environment.sefazWorkerUrl.replace(/\/+$/, '');

  health(): Observable<{ ok: boolean }> {
    return this.http.get<{ ok: boolean }>(`${this.base}/health`);
  }

  testarCertificado(pfx: File, senha: string, cnpjEmpresa?: string): Observable<CertInfo> {
    const fd = new FormData();
    fd.append('pfx', pfx);
    fd.append('senha', senha);
    if (cnpjEmpresa) fd.append('cnpj_empresa', cnpjEmpresa);
    return this.http.post<CertInfo>(`${this.base}/sefaz/testar-certificado`, fd);
  }

  sincronizar(p: {
    pfx: File; senha: string; cnpj: string; uf: string; ambiente: string; ultNsu: string; cnpjEmpresa?: string;
  }): Observable<ResultadoSync> {
    const fd = new FormData();
    fd.append('pfx', p.pfx);
    fd.append('senha', p.senha);
    fd.append('cnpj', p.cnpj);
    fd.append('uf', p.uf);
    fd.append('ambiente', p.ambiente);
    fd.append('ult_nsu', p.ultNsu);
    if (p.cnpjEmpresa) fd.append('cnpj_empresa', p.cnpjEmpresa);
    return this.http.post<ResultadoSync>(`${this.base}/sefaz/sincronizar`, fd);
  }
}
