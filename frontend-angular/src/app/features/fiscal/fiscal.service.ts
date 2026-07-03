import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';
import { calcularDocumento, RegimeTributario, ResultadoItem, TotaisDocumento } from './engine/motor-tributario';
import { apurarPeriodo } from './engine/apuracao-fiscal';
import {
  AnexoSimples,
  ApuracaoContribuicao,
  AtividadePresumido,
  apurarIrpjCsllPresumido,
  apurarPisCofins,
  calcularDasSimples,
  ResultadoIrpjCsll,
  ResultadoSimples,
} from './engine/apuracao-federal';
import { ItemImportado, NotaImportada, parsearDocumento } from './engine/importador-xml-nfe';
import { EmitenteNFe, gerarXmlNFe, ItemNFe, NotaNFe } from './engine/nfe-xml';
import { montarGuia } from './engine/guias';
import { calendarioObrigacoes, descricaoObrigacao } from './engine/obrigacoes';
import {
  DadosSpedContribuicoes,
  DadosSpedFiscal,
  DocumentoItemSped,
  DocumentoSped,
  EmpresaSped,
  gerarSpedContribuicoes,
  gerarSpedFiscal,
  ItemSped,
  ParticipanteSped,
} from './engine/sped';
import {
  CabecalhoNota,
  ItemNotaFiscalDoc,
  LinhaEmissao,
  montarContexto,
  montarEmissaoNfe,
  montarItemFiscal,
  NfeFormValue,
  ProdutoDoc,
  RegraTributariaDoc,
} from './fiscal.types';

// ────────────────────────────────────────────────────────────
// Documentos Appwrite (apenas os campos definidos em scripts/appwrite-setup.js)
// ────────────────────────────────────────────────────────────
interface NotaFiscalDoc {
  $id: string;
  $createdAt: string;
  tipo: string;            // 'NFE' | 'NFSE'
  numero?: number;
  serie?: string;
  chaveAcesso?: string;
  dataEmissao: string;
  modelo?: string;
  // Cabeçalho de operação (alimenta a apuração/SPED).
  tipoOperacao?: string;   // 'ENTRADA' | 'SAIDA'
  regime?: string;         // 'SIMPLES' | 'PRESUMIDO' | 'REAL'
  ufEmitente?: string;
  ufDestino?: string;
  emitenteCnpj?: string;
  emitenteNome?: string;
  contribuinteIcms?: boolean;
  destinatarioNome?: string;
  destinatarioCpfCnpj?: string;
  valorTotal: number;
  valorProdutos?: number;
  valorICMS?: number;
  valorICMSST?: number;
  valorFCP?: number;
  valorDifal?: number;
  valorIPI?: number;
  valorPIS?: number;
  valorCOFINS?: number;
  valorISS?: number;
  valorFrete?: number;
  valorDesconto?: number;
  naturezaOperacao?: string;
  cfop?: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

/** Subset da collection `empresas` usado no cabeçalho do SPED e da NF-e. */
interface EmpresaDoc {
  $id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  codigoMunicipio?: string;
  regimeTributario?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  uf?: string;
}

interface CteDoc {
  $id: string;
  $createdAt: string;
  numero?: number;
  serie?: number;
  chave?: string;
  tipoCte: string;
  modal: string;
  naturezaOperacao?: string;
  remetenteNome?: string;
  remetenteCnpjCpf?: string;
  destinatarioNome?: string;
  destinatarioCnpjCpf?: string;
  valorTotalServico?: number;
  valorCarga?: number;
  produtoPredominante?: string;
  icmsBase?: number;
  icmsAliquota?: number;
  icmsValor?: number;
  dataEmissao?: string;
  status: string;
  protocolo?: string;
  empresaId: string;
  tenantId: string;
}

interface ApuracaoDoc {
  $id: string;
  $createdAt: string;
  tipo: string;            // 'ICMS' | 'PIS_COFINS'
  competencia: string;
  baseCalculo?: number;
  debitos?: number;
  creditos?: number;
  valorApurado?: number;
  valorRecolher?: number;
  saldoCredor?: number;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface EscrituracaoDoc {
  $id: string;
  $createdAt: string;
  tipo: string;
  competencia: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface CiapDoc {
  $id: string;
  $createdAt: string;
  descricao: string;
  valor: number;
  parcelas: number;
  parcelaAtual: number;
  competencia: string;
  empresaId: string;
  tenantId: string;
}

interface GuiaDoc {
  $id: string;
  $createdAt: string;
  tipo: string;
  competencia: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface ObrigacaoDoc {
  $id: string;
  $createdAt: string;
  tipo: string;
  competencia: string;
  dataVencimento: string;
  dataEntrega?: string;
  protocolo?: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

/** Página no formato que os componentes esperam (compatível com Spring Page). */
interface Page<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}

const NOTAS = 'notas_fiscais';
const ITENS = 'itens_nota_fiscal';
const CTE = 'cte';
const APURACOES = 'apuracoes_fiscais';
const ESCRITURACOES = 'escrituracoes_fiscais';
const CIAP = 'ciap';
const GUIAS = 'guias_fiscais';
const OBRIGACOES = 'obrigacoes';

/** Detalhamento de uma apuração por confronto (ICMS/IPI), calculado em memória. */
interface DetalheApuracao {
  debitos: number;
  creditos: number;
  recolher: number;
  saldoCredorTransportar: number;
  saldoCredorAnterior: number;
}

/** Detalhe específico de ICMS — soma ST e DIFAL recolhidos à parte. */
interface DetalheApuracaoIcms extends DetalheApuracao {
  icmsStRecolher: number;
  difalRecolher: number;
}

/**
 * Retorno da Appwrite Function `nfe-transmissao` (assina A1 do cofre + mTLS).
 * `operacao: 'autorizar'` devolve situacao/cStat/protocolo; `'status'` o ping.
 */
export interface RetornoSefaz {
  ok: boolean;
  erro?: string;
  /** classificação de negócio do cStat (autorizar). */
  situacao?: 'AUTORIZADA' | 'DENEGADA' | 'PROCESSANDO' | 'REJEITADA' | 'ERRO';
  cStat?: number;
  xMotivo?: string;
  nProt?: string;
  chNFe?: string;
  dhRecbto?: string;
  url?: string;
  /** status do serviço (operacao: 'status'). */
  online?: boolean;
}

/** Documento cru devolvido pela Distribuição DF-e (Function, operacao 'distribuir'). */
export interface DocDistribuicao {
  nsu: string;
  schema: string;
  tipo: string;
  xml: string;
}

/** Resultado da captura por Distribuição DF-e já processado no front. */
export interface RetornoDistribuicao {
  ok: boolean;
  erro?: string;
  /** NF-e completas escrituradas em notas_fiscais (entrada). */
  escrituradas?: number;
  /** NF-e completas ignoradas por já existirem (dedup por chaveAcesso). */
  duplicadas?: number;
  /** NF-e completas do lote (novas e já existentes), para exibição na tela. */
  notas?: NotaImportada[];
  /** Resumos (resNFe) pendentes de manifestação para liberar o XML completo. */
  resumos?: NotaImportada[];
  totalDocs?: number;
  ultNSU?: string;
  maxNSU?: string;
}

@Injectable({ providedIn: 'root' })
export class FiscalService {
  constructor(private appwrite: AppwriteService, private auth: AuthService) {}

  // ── Contexto de tenant/empresa ─────────────────────────────
  private get tenantId(): string { return this.auth.tenantId() || 'default'; }
  private get empresaId(): string { return this.auth.empresaId() || ''; }

  private get Q() { return this.appwrite.query; }

  private baseQueries(extra: string[] = []): string[] {
    return [this.Q.limit(100), this.Q.orderDesc('$createdAt'), this.Q.equal('tenantId', this.tenantId), ...extra];
  }

  private paginate<T>(items: T[], page: number, size: number): Page<T> {
    const start = page * size;
    return {
      content: items.slice(start, start + size),
      totalElements: items.length,
      number: page,
      size,
    };
  }

  private toNumber(value: unknown): number {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
    return isNaN(n) ? 0 : n;
  }

  private round2(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  // ============================================================
  // NF-e  (notas_fiscais, tipo = 'NFE')
  // ============================================================
  /** Normaliza um doc Appwrite para os campos usados no template da NF-e. */
  private mapNfe(doc: NotaFiscalDoc): Record<string, unknown> {
    return {
      ...doc,
      id: doc.$id,
      destinatarioRazaoSocial: doc.destinatarioNome,
      destinatarioCnpjCpf: doc.destinatarioCpfCnpj,
      totalNfe: doc.valorTotal,
    };
  }

  /** Converte o formulário (com destinatário aninhado + itens) para o schema Appwrite. */
  private buildNfePayload(form: Record<string, unknown>): Record<string, unknown> {
    const dest = (form['destinatario'] as Record<string, unknown>) ?? {};
    const itens = (form['itens'] as Array<Record<string, unknown>>) ?? [];
    let valorTotal = 0;
    let valorICMS = 0;
    for (const item of itens) {
      const qtd = this.toNumber(item['quantidade']);
      const vUnit = this.toNumber(item['valorUnitario']);
      const aliq = this.toNumber(item['aliquotaIcms']);
      const subtotal = qtd * vUnit;
      valorTotal += subtotal;
      valorICMS += subtotal * (aliq / 100);
    }
    return {
      tipo: 'NFE',
      dataEmissao: new Date().toISOString().split('T')[0],
      destinatarioNome: (dest['razaoSocial'] as string) ?? '',
      destinatarioCpfCnpj: (dest['cnpjCpf'] as string) ?? '',
      valorTotal,
      valorICMS,
      naturezaOperacao: (form['naturezaOperacao'] as string) ?? '',
      status: 'RASCUNHO',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  listNfes(page = 0, size = 20): Observable<Page<Record<string, unknown>>> {
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, this.baseQueries([this.Q.equal('tipo', 'NFE')])).pipe(
      map(docs => this.paginate(docs.map(d => this.mapNfe(d)), page, size)),
    );
  }

  getNfe(id: string): Observable<Record<string, unknown>> {
    return this.appwrite.getDocument<NotaFiscalDoc>(NOTAS, id).pipe(map(d => this.mapNfe(d)));
  }

  /**
   * @deprecated Persistia o ICMS por heurística (`subtotal×aliq/100`) e ignorava
   * IBS/CBS/PIS/COFINS/IPI. A tela usa `emitirNfeDoForm` (motor real). Mantido só por
   * compatibilidade até a remoção do `buildNfePayload`.
   */
  createNfe(data: Record<string, unknown>): Observable<NotaFiscalDoc> {
    return this.appwrite.createDocument<NotaFiscalDoc>(NOTAS, this.buildNfePayload(data));
  }

  /**
   * Emite a NF-e a partir do formulário da tela: resolve o cabeçalho (regime + UF do
   * emitente vêm da empresa; UF/contribuinte do destinatário), roda o motor tributário
   * (ICMS/ST/IPI/PIS/COFINS + IBS/CBS) e persiste cabeçalho + itens com os valores
   * calculados. Substitui `createNfe` no caminho da tela (P0.2).
   */
  emitirNfeDoForm(form: Record<string, unknown>): Observable<{ nota: NotaFiscalDoc; itens: ItemNotaFiscalDoc[] }> {
    return forkJoin({ empresa: this.empresaDoc(), regras: this.listRegrasVigentes() }).pipe(
      switchMap(({ empresa, regras }) => {
        const { cab, linhas, extras } = montarEmissaoNfe(
          form as NfeFormValue,
          { uf: empresa?.uf, regimeTributario: empresa?.regimeTributario },
          regras,
        );
        return this.emitirNotaComItens(cab, linhas, 'NFE', extras);
      }),
    );
  }

  /**
   * Regras tributárias ATIVAS e VIGENTES hoje (parametrização por NCM/CFOP/UF/vigência — P1.5).
   * Antes código morto: agora alimenta `montarEmissaoNfe` (a regra sobrepõe o CST/alíquota digitados).
   */
  private listRegrasVigentes(): Observable<RegraTributariaDoc[]> {
    const hoje = new Date().toISOString().slice(0, 10);
    return this.appwrite.listDocuments<RegraTributariaDoc>(
      'regras_tributarias',
      this.baseQueries([this.Q.equal('ativo', true), this.Q.limit(500)]),
    ).pipe(
      map(regras => regras.filter(r =>
        (!r.vigenciaInicio || hoje >= r.vigenciaInicio) && (!r.vigenciaFim || hoje <= r.vigenciaFim))),
      catchError(() => of([] as RegraTributariaDoc[])),
    );
  }

  /**
   * Transmite a NF-e à SEFAZ via Appwrite Function `nfe-transmissao`.
   *
   * O front gera o XML **não assinado** (`gerarXmlNotaFiscal`) e resolve a UF do
   * emitente; a Function lê o A1 do cofre (Storage), assina (XML-DSig) e envia por
   * mTLS ao webservice da UF. Em caso de autorização (cStat 100), persiste
   * status/protocolo/chave/dataAutorizacao na nota.
   *
   * Nunca lança: erros (rede/SEFAZ/cofre) voltam como `{ ok: false, erro }` para
   * a UI exibir — a SEFAZ é integração externa e pode estar indisponível.
   */
  transmitirNfe(notaId: string, ambiente: 'homologacao' | 'producao' = 'homologacao'): Observable<RetornoSefaz> {
    return forkJoin({
      gerado: this.gerarXmlNotaFiscal(notaId),
      empresa: this.empresaDoc(),
    }).pipe(
      switchMap(({ gerado, empresa }) => {
        const uf = String(empresa?.uf ?? '').toUpperCase();
        if (!uf) {
          return of<RetornoSefaz>({ ok: false, erro: 'UF do emitente ausente no cadastro da empresa.' });
        }
        return this.appwrite.executeFunction<RetornoSefaz>(
          environment.appwrite.functions.nfeTransmissao,
          { empresaId: this.empresaId, uf, ambiente, operacao: 'autorizar', xmlNFe: gerado.xml },
        ).pipe(
          switchMap(ret => {
            if (ret?.ok && ret.situacao === 'AUTORIZADA') {
              return this.appwrite.updateDocument<NotaFiscalDoc>(NOTAS, notaId, {
                status: 'AUTORIZADA',
                protocolo: ret.nProt ?? '',
                chaveAcesso: ret.chNFe ?? gerado.chave,
                dataAutorizacao: ret.dhRecbto ?? new Date().toISOString(),
              }).pipe(map(() => ret));
            }
            return of(ret ?? { ok: false, erro: 'Resposta vazia da Function de transmissão.' });
          }),
          catchError(err => of<RetornoSefaz>({ ok: false, erro: this.erroFunction(err) })),
        );
      }),
    );
  }

  /**
   * "Ping" do serviço da SEFAZ (NFeStatusServico4) via a mesma Function: valida
   * o A1 + mTLS sem emitir nota. É o primeiro teste seguro de uma emissão real.
   */
  consultarStatusSefaz(ambiente: 'homologacao' | 'producao' = 'homologacao'): Observable<RetornoSefaz> {
    return this.empresaDoc().pipe(
      switchMap(empresa => {
        const uf = String(empresa?.uf ?? '').toUpperCase();
        if (!uf) {
          return of<RetornoSefaz>({ ok: false, erro: 'UF do emitente ausente no cadastro da empresa.' });
        }
        return this.appwrite.executeFunction<RetornoSefaz>(
          environment.appwrite.functions.nfeTransmissao,
          { empresaId: this.empresaId, uf, ambiente, operacao: 'status' },
        ).pipe(catchError(err => of<RetornoSefaz>({ ok: false, erro: this.erroFunction(err) })));
      }),
    );
  }

  /** Chave do localStorage que guarda o último NSU processado por empresa. */
  private chaveUltNSU(): string { return `nfe_ultnsu_${this.empresaId}`; }

  /** Lê o último NSU processado (0 se nunca buscou ou sem localStorage). */
  private lerUltNSU(): string {
    try { return localStorage.getItem(this.chaveUltNSU()) || '0'; } catch { return '0'; }
  }

  private salvarUltNSU(nsu?: string): void {
    if (!nsu) return;
    try { localStorage.setItem(this.chaveUltNSU(), nsu); } catch { /* sem storage */ }
  }

  /**
   * Conjunto das `chaveAcesso` que JÁ existem em `notas_fiscais` (para dedup).
   * Consulta em lotes de 100 (limite do operador IN do Appwrite).
   */
  private chavesJaEscrituradas(chaves: string[]): Observable<Set<string>> {
    const unicas = [...new Set(chaves.filter(Boolean))];
    if (!unicas.length) return of(new Set<string>());
    const lotes: string[][] = [];
    for (let i = 0; i < unicas.length; i += 100) lotes.push(unicas.slice(i, i + 100));
    return forkJoin(lotes.map(lote =>
      this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, [
        this.Q.equal('chaveAcesso', lote),
        this.Q.equal('tenantId', this.tenantId),
        this.Q.limit(lote.length),
      ]),
    )).pipe(map(res => new Set(res.flat().map(d => d.chaveAcesso).filter(Boolean) as string[])));
  }

  /**
   * Captura NF-e de ENTRADA na SEFAZ via Distribuição DF-e (Function, operação
   * 'distribuir'). O loop de NSU roda no servidor; aqui:
   *  - continua do último NSU salvo (localStorage por empresa) e persiste o novo;
   *  - escritura as NF-e completas em `notas_fiscais` (entrada), **deduplicando
   *    por `chaveAcesso`** para não duplicar em execuções repetidas;
   *  - devolve os resumos (`resNFe`) como pendências de manifestação.
   *
   * Nunca lança: erros voltam como `{ ok:false, erro }` para a UI.
   */
  baixarNotasDistribuicao(
    ambiente: 'homologacao' | 'producao' = 'homologacao',
  ): Observable<RetornoDistribuicao> {
    const ultNSU = this.lerUltNSU();
    return this.empresaDoc().pipe(
      switchMap(empresa => {
        const uf = String(empresa?.uf ?? '').toUpperCase();
        if (!uf) return of<RetornoDistribuicao>({ ok: false, erro: 'UF do emitente ausente no cadastro da empresa.' });
        return this.appwrite.executeFunction<{ ok: boolean; erro?: string; documentos?: DocDistribuicao[]; ultNSU?: string; maxNSU?: string }>(
          environment.appwrite.functions.nfeDistribuicao,
          { empresaId: this.empresaId, uf, ambiente, operacao: 'distribuir', ultNSU },
        ).pipe(
          switchMap(ret => {
            if (!ret?.ok) return of<RetornoDistribuicao>({ ok: false, erro: ret?.erro || 'Falha na Distribuição DF-e.' });
            this.salvarUltNSU(ret.ultNSU); // avança o cursor mesmo se nada novo (evita cStat 656)
            const docs = ret.documentos ?? [];
            const notas = docs
              .map(d => parsearDocumento(d.xml, d.nsu))
              .filter((x): x is NotaImportada => !!x);
            const completas = notas.filter(x => x.detalhamento === 'completo');
            const resumos = notas.filter(x => x.detalhamento === 'resumo');
            return this.chavesJaEscrituradas(completas.map(c => c.chaveAcesso)).pipe(
              switchMap(existentes => {
                const novas = completas.filter(c => !c.chaveAcesso || !existentes.has(c.chaveAcesso));
                const escrituras = novas.map(x => this.escriturarNotaImportada(x, 'ENTRADA'));
                const escrito$ = escrituras.length ? forkJoin(escrituras) : of([]);
                return escrito$.pipe(map(() => ({
                  ok: true,
                  escrituradas: novas.length,
                  duplicadas: completas.length - novas.length,
                  notas: completas,
                  resumos,
                  totalDocs: docs.length,
                  ultNSU: ret.ultNSU,
                  maxNSU: ret.maxNSU,
                } as RetornoDistribuicao)));
              }),
            );
          }),
          catchError(err => of<RetornoDistribuicao>({ ok: false, erro: this.erroFunction(err) })),
        );
      }),
    );
  }

  /**
   * Manifestação do Destinatário (Function, operação 'manifestar'):
   * 210210 Ciência · 210200 Confirmação · 210220 Desconhecimento ·
   * 210240 Operação não Realizada (exige `xJust`). A Ciência libera o download
   * do XML completo pela próxima distribuição.
   */
  manifestarNota(
    chave: string,
    tpEvento: '210200' | '210210' | '210220' | '210240',
    xJust = '',
    ambiente: 'homologacao' | 'producao' = 'homologacao',
  ): Observable<RetornoSefaz> {
    return this.empresaDoc().pipe(
      switchMap(empresa => {
        const uf = String(empresa?.uf ?? '').toUpperCase();
        if (!uf) return of<RetornoSefaz>({ ok: false, erro: 'UF do emitente ausente no cadastro da empresa.' });
        return this.appwrite.executeFunction<RetornoSefaz>(
          environment.appwrite.functions.nfeDistribuicao,
          { empresaId: this.empresaId, uf, ambiente, operacao: 'manifestar', chave, tpEvento, xJust },
        ).pipe(catchError(err => of<RetornoSefaz>({ ok: false, erro: this.erroFunction(err) })));
      }),
    );
  }

  /** Mensagem amigável de uma falha ao chamar a Appwrite Function. */
  private erroFunction(err: unknown): string {
    const e = err as { message?: string; error?: { message?: string } };
    return e?.error?.message || e?.message || 'Falha ao chamar a Function de transmissão.';
  }

  /**
   * Fallback offline: marca a nota como autorizada SEM transmitir (usado quando
   * não há integração SEFAZ). Para emissão real, use `transmitirNfe`.
   */
  autorizarNfe(id: string): Observable<NotaFiscalDoc> {
    return this.appwrite.updateDocument<NotaFiscalDoc>(NOTAS, id, { status: 'AUTORIZADA' });
  }

  cancelarNfe(id: string): Observable<NotaFiscalDoc> {
    // TODO(appwrite): evento de cancelamento (NFeRecepcaoEvento4) ainda não implementado na Function.
    return this.appwrite.updateDocument<NotaFiscalDoc>(NOTAS, id, { status: 'CANCELADA' });
  }

  listNfesByTipo(tipo: string): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, this.baseQueries([this.Q.equal('tipo', tipo)])).pipe(
      map(docs => docs.map(d => this.mapNfe(d))),
    );
  }

  // ============================================================
  // Nota com itens — cálculo via motor tributário + persistência
  // (base real para apuração ICMS/IPI e SPED; substitui a heurística
  //  subtotal*aliq usada em buildNfePayload).
  // ============================================================

  /** Calcula totais e itens de uma nota, sem persistir. */
  calcularNota(cab: CabecalhoNota, linhas: LinhaEmissao[]): { itens: ResultadoItem[]; totais: TotaisDocumento } {
    const ctx = montarContexto(cab);
    return calcularDocumento(ctx, linhas.map(montarItemFiscal));
  }

  /** Monta o payload do documento `notas_fiscais` a partir do cabeçalho e dos totais. */
  private buildNotaComItensPayload(
    cab: CabecalhoNota,
    totais: TotaisDocumento,
    tipo: string,
  ): Record<string, unknown> {
    const modelo = tipo === 'NFE' ? '55' : tipo === 'NFCE' ? '65' : tipo === 'NFSE' ? '' : '';
    return {
      tipo,
      modelo,
      dataEmissao: new Date().toISOString().split('T')[0],
      tipoOperacao: cab.tipoOperacao,
      regime: cab.regime,
      ufEmitente: cab.ufEmitente,
      ufDestino: cab.ufDestino,
      consumidorFinal: cab.consumidorFinal,
      contribuinteIcms: cab.contribuinteIcms,
      valorTotal: totais.valorTotalNota,
      valorProdutos: totais.valorProdutos,
      valorICMS: totais.valorIcms,
      valorICMSST: totais.valorIcmsSt,
      valorFCP: totais.valorFcp + totais.valorFcpSt,
      valorDifal: totais.valorDifalDestino,
      valorIPI: totais.valorIpi,
      valorPIS: totais.valorPis,
      valorCOFINS: totais.valorCofins,
      valorISS: totais.valorIss,
      valorICMSDesonerado: totais.valorIcmsDesonerado,
      valorFrete: totais.valorFrete,
      valorSeguro: totais.valorSeguro,
      valorDesconto: totais.valorDesconto,
      valorOutras: totais.valorOutras,
      status: 'RASCUNHO',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  /** Monta o payload de um item (`itens_nota_fiscal`) a partir da linha e do resultado calculado. */
  private buildItemPayload(notaId: string, linha: LinhaEmissao, r: ResultadoItem, numeroItem: number): ItemNotaFiscalDoc {
    return {
      notaId,
      numeroItem,
      produtoId: linha.produtoId,
      codigo: linha.codigo,
      descricao: linha.descricao,
      ncm: linha.ncm,
      cest: linha.cest,
      cfop: linha.cfop,
      unidade: linha.unidade,
      quantidade: linha.quantidade,
      valorUnitario: linha.valorUnitario,
      valorProdutos: r.valorProdutos,
      desconto: linha.desconto,
      frete: linha.frete,
      seguro: linha.seguro,
      outras: linha.outras,
      origem: linha.config.origem,
      cstIcms: linha.config.cstIcms,
      csosn: linha.config.csosn,
      baseIcms: r.baseIcms,
      aliqIcms: r.aliqIcms,
      valorIcms: r.valorIcms,
      valorIcmsDesonerado: r.valorIcmsDesonerado,
      baseIcmsSt: r.baseIcmsSt,
      valorIcmsSt: r.valorIcmsSt,
      valorFcp: r.valorFcp,
      valorFcpSt: r.valorFcpSt,
      valorDifal: r.valorDifalDestino,
      cstIpi: linha.config.cstIpi,
      baseIpi: r.baseIpi,
      aliqIpi: r.aliqIpi,
      valorIpi: r.valorIpi,
      cstPis: linha.config.cstPis,
      aliqPis: linha.config.aliqPis,
      valorPis: r.valorPis,
      cstCofins: linha.config.cstCofins,
      aliqCofins: linha.config.aliqCofins,
      valorCofins: r.valorCofins,
      aliqIss: linha.config.aliqIss,
      valorIss: r.valorIss,
      valorTotalItem: r.valorTotalItem,
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  /**
   * Emite (em rascunho) uma nota com itens: calcula os tributos no motor,
   * cria o cabeçalho em `notas_fiscais` e persiste cada item em `itens_nota_fiscal`.
   */
  emitirNotaComItens(
    cab: CabecalhoNota,
    linhas: LinhaEmissao[],
    tipo = 'NFE',
    extras: Record<string, unknown> = {},
  ): Observable<{ nota: NotaFiscalDoc; itens: ItemNotaFiscalDoc[] }> {
    const { itens, totais } = this.calcularNota(cab, linhas);
    const payload = { ...this.buildNotaComItensPayload(cab, totais, tipo), ...extras };
    return this.appwrite.createDocument<NotaFiscalDoc>(NOTAS, payload).pipe(
      switchMap(nota => {
        const itemDocs = linhas.map((l, i) => this.buildItemPayload(nota.$id, l, itens[i], i + 1));
        if (!itemDocs.length) return of({ nota, itens: [] as ItemNotaFiscalDoc[] });
        return forkJoin(itemDocs.map(p => this.appwrite.createDocument<ItemNotaFiscalDoc>(ITENS, p as unknown as Record<string, unknown>)))
          .pipe(map(saved => ({ nota, itens: saved })));
      }),
    );
  }

  /** Lê os itens de uma nota. */
  listarItens(notaId: string): Observable<ItemNotaFiscalDoc[]> {
    return this.appwrite.listDocuments<ItemNotaFiscalDoc>(ITENS, [this.Q.equal('notaId', notaId), this.Q.limit(500)]);
  }

  // ============================================================
  // Escrituração de notas importadas (XML de NF-e → entradas/saídas)
  // Persiste a nota importada e seus itens; com tipoOperacao definido,
  // a apuração passa a enxergar créditos (entradas) e débitos (saídas).
  // ============================================================

  /** Monta o cabeçalho `notas_fiscais` a partir de uma {@link NotaImportada}. */
  private buildNotaImportadaPayload(nota: NotaImportada, tipoOperacao: 'ENTRADA' | 'SAIDA'): Record<string, unknown> {
    return {
      tipo: 'NFE',
      modelo: nota.modelo || '55',
      numero: nota.numero || undefined,
      serie: nota.serie,
      chaveAcesso: nota.chaveAcesso,
      dataEmissao: nota.dataEmissao,
      tipoOperacao,
      ufEmitente: nota.ufEmitente,
      ufDestino: nota.ufDestino,
      contribuinteIcms: nota.contribuinteIcms,
      emitenteCnpj: nota.emitenteCnpj,
      emitenteNome: nota.emitenteNome,
      destinatarioNome: nota.destinatarioNome,
      destinatarioCpfCnpj: nota.destinatarioCpfCnpj,
      valorTotal: nota.valorTotal,
      valorProdutos: nota.valorProdutos,
      valorICMS: nota.valorICMS,
      valorICMSST: nota.valorICMSST,
      valorIPI: nota.valorIPI,
      valorPIS: nota.valorPIS,
      valorCOFINS: nota.valorCOFINS,
      valorFrete: nota.valorFrete,
      valorDesconto: nota.valorDesconto,
      naturezaOperacao: nota.naturezaOperacao,
      status: 'AUTORIZADA', // XML importado já é documento autorizado → entra na apuração
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  /** Monta um item (`itens_nota_fiscal`) a partir de um {@link ItemImportado}. */
  private buildItemImportadoPayload(notaId: string, it: ItemImportado, numeroItem: number): ItemNotaFiscalDoc {
    return {
      notaId,
      numeroItem: it.numeroItem || numeroItem,
      codigo: it.codigo,
      descricao: it.descricao,
      ncm: it.ncm,
      cest: it.cest,
      cfop: it.cfop,
      unidade: it.unidade,
      quantidade: it.quantidade,
      valorUnitario: it.valorUnitario,
      valorProdutos: it.valorProdutos,
      desconto: it.desconto,
      frete: it.frete,
      seguro: it.seguro,
      outras: it.outras,
      origem: it.origem,
      cstIcms: it.cstIcms,
      csosn: it.csosn,
      baseIcms: it.baseIcms,
      aliqIcms: it.aliqIcms,
      valorIcms: it.valorIcms,
      baseIcmsSt: it.baseIcmsSt,
      valorIcmsSt: it.valorIcmsSt,
      aliqIpi: it.aliqIpi,
      valorIpi: it.valorIpi,
      valorPis: it.valorPis,
      valorCofins: it.valorCofins,
      valorTotalItem: it.valorProdutos,
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  /**
   * Escritura uma nota importada de XML: cria o cabeçalho em `notas_fiscais`
   * (status AUTORIZADA) e cada item em `itens_nota_fiscal`. Por padrão registra
   * como ENTRADA (compra) — caso de uso típico do XML de terceiro.
   */
  escriturarNotaImportada(
    nota: NotaImportada,
    tipoOperacao: 'ENTRADA' | 'SAIDA' = 'ENTRADA',
  ): Observable<{ nota: NotaFiscalDoc; itens: ItemNotaFiscalDoc[] }> {
    const payload = this.buildNotaImportadaPayload(nota, tipoOperacao);
    return this.appwrite.createDocument<NotaFiscalDoc>(NOTAS, payload).pipe(
      switchMap(criada => {
        const itemDocs = nota.itens.map((it, i) => this.buildItemImportadoPayload(criada.$id, it, i + 1));
        if (!itemDocs.length) return of({ nota: criada, itens: [] as ItemNotaFiscalDoc[] });
        return forkJoin(itemDocs.map(p => this.appwrite.createDocument<ItemNotaFiscalDoc>(ITENS, p as unknown as Record<string, unknown>)))
          .pipe(map(saved => ({ nota: criada, itens: saved })));
      }),
    );
  }

  // ============================================================
  // NFS-e  (notas_fiscais, tipo = 'NFSE')
  // ============================================================
  private mapNfse(doc: NotaFiscalDoc): Record<string, unknown> {
    return {
      ...doc,
      id: doc.$id,
      tomadorRazaoSocial: doc.destinatarioNome,
      tomadorCpfCnpj: doc.destinatarioCpfCnpj,
      valorServico: doc.valorTotal,
      descricaoServico: doc.naturezaOperacao,
    };
  }

  private buildNfsePayload(form: Record<string, unknown>): Record<string, unknown> {
    const tomador = (form['tomador'] as Record<string, unknown>) ?? {};
    const valorServico = this.toNumber(form['valorServico']);
    const aliquotaIss = this.toNumber(form['aliquotaIss']);
    const valorISS = valorServico * (aliquotaIss / 100);
    return {
      tipo: 'NFSE',
      dataEmissao: new Date().toISOString().split('T')[0],
      destinatarioNome: (tomador['razaoSocial'] as string) ?? '',
      destinatarioCpfCnpj: (tomador['cpfCnpj'] as string) ?? '',
      valorTotal: valorServico,
      valorISS,
      valorPIS: this.toNumber(form['valorPis']),
      valorCOFINS: this.toNumber(form['valorCofins']),
      naturezaOperacao: (form['descricaoServico'] as string) ?? '',
      status: 'RASCUNHO',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  listNfses(page = 0, size = 20): Observable<Page<Record<string, unknown>>> {
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, this.baseQueries([this.Q.equal('tipo', 'NFSE')])).pipe(
      map(docs => this.paginate(docs.map(d => this.mapNfse(d)), page, size)),
    );
  }

  getNfse(id: string): Observable<Record<string, unknown>> {
    return this.appwrite.getDocument<NotaFiscalDoc>(NOTAS, id).pipe(map(d => this.mapNfse(d)));
  }

  createNfse(data: Record<string, unknown>): Observable<NotaFiscalDoc> {
    return this.appwrite.createDocument<NotaFiscalDoc>(NOTAS, this.buildNfsePayload(data));
  }

  autorizarNfse(id: string): Observable<NotaFiscalDoc> {
    // TODO(appwrite): integração externa — transmissão à prefeitura não disponível.
    return this.appwrite.updateDocument<NotaFiscalDoc>(NOTAS, id, { status: 'AUTORIZADA' });
  }

  cancelarNfse(id: string, _motivo: string): Observable<NotaFiscalDoc> {
    // TODO(appwrite): integração externa — cancelamento na prefeitura não disponível.
    return this.appwrite.updateDocument<NotaFiscalDoc>(NOTAS, id, { status: 'CANCELADA' });
  }

  // ============================================================
  // Apuração ICMS  (apuracoes_fiscais, tipo = 'ICMS')
  // Cálculo reimplementado no cliente a partir de notas_fiscais.
  // ============================================================
  private competencia(ano: number, mes: number): string {
    return `${ano}-${String(mes).padStart(2, '0')}`;
  }

  /** Competência imediatamente anterior (de onde vem o saldo credor transportado). */
  private prevCompetencia(ano: number, mes: number): string {
    return mes > 1 ? this.competencia(ano, mes - 1) : this.competencia(ano - 1, 12);
  }

  /** Regime tributário da empresa, inferido das notas do período (default REAL). */
  private regimeDe(notas: NotaFiscalDoc[]): RegimeTributario {
    const r = notas.find(n => !!n.regime)?.regime;
    return r === 'SIMPLES' || r === 'PRESUMIDO' || r === 'REAL' ? r : 'REAL';
  }

  /** Saldo credor (ICMS/IPI) transportado da apuração da competência anterior. */
  private saldoCredorAnterior(tipo: 'ICMS' | 'IPI', ano: number, mes: number): Observable<number> {
    return this.findApuracao(tipo, this.prevCompetencia(ano, mes)).pipe(map(a => this.toNumber(a?.saldoCredor)));
  }

  /** Enriquece o doc persistido com o detalhamento exibido no template. */
  private mapApuracaoIcms(doc: ApuracaoDoc | null, detalhe?: DetalheApuracaoIcms): Record<string, unknown> | null {
    if (!doc && !detalhe) return null;
    const debitos = detalhe ? detalhe.debitos : this.toNumber(doc?.debitos);
    const creditos = detalhe ? detalhe.creditos : this.toNumber(doc?.creditos);
    const recolher = detalhe ? detalhe.recolher : this.toNumber(doc?.valorRecolher);
    const saldoCredor = detalhe ? detalhe.saldoCredorTransportar : this.toNumber(doc?.saldoCredor);
    return {
      ...(doc ?? {}),
      id: doc?.$id,
      totalDebitos: debitos,
      totalCreditos: creditos,
      icmsRecolher: recolher,
      saldoCredorTransportar: saldoCredor,
      totalDebitosSaidas: debitos,
      totalCreditosEntradas: creditos,
      outrosDebitos: 0,
      outrosCreditos: 0,
      estornoCreditos: 0,
      estornoDebitos: 0,
      saldoCredorAnterior: detalhe?.saldoCredorAnterior ?? 0,
      icmsStRecolher: detalhe?.icmsStRecolher ?? 0,
      difalRecolher: detalhe?.difalRecolher ?? 0,
      status: doc?.status ?? 'ABERTA',
    };
  }

  /** Notas autorizadas da competência (empresa/tenant), base de toda apuração. */
  private notasDaCompetencia(ano: number, mes: number): Observable<NotaFiscalDoc[]> {
    const comp = this.competencia(ano, mes);
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, this.baseQueries([this.Q.equal('empresaId', this.empresaId)])).pipe(
      map(notas => notas.filter(n => (n.dataEmissao ?? '').startsWith(comp) && n.status === 'AUTORIZADA')),
    );
  }

  calcularApuracaoIcms(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    const comp = this.competencia(ano, mes);
    // Separa débitos (saídas) de créditos (entradas) e transporta o saldo credor anterior.
    return forkJoin({
      doMes: this.notasDaCompetencia(ano, mes),
      saldoAnterior: this.saldoCredorAnterior('ICMS', ano, mes),
    }).pipe(
      switchMap(({ doMes, saldoAnterior }) => {
        const res = apurarPeriodo(doMes, { icms: saldoAnterior }, { regime: this.regimeDe(doMes) });
        const payload: Record<string, unknown> = {
          tipo: 'ICMS', competencia: comp,
          baseCalculo: res.baseCalculoSaidas,
          debitos: res.icms.debitos, creditos: res.icms.creditos,
          valorApurado: res.icms.saldoApurado, valorRecolher: res.icms.valorRecolher,
          saldoCredor: res.icms.saldoCredorTransportar,
          status: 'ABERTA', empresaId: this.empresaId, tenantId: this.tenantId,
        };
        const detalhe: DetalheApuracaoIcms = {
          debitos: res.icms.debitos, creditos: res.icms.creditos,
          recolher: res.icms.valorRecolher,
          saldoCredorTransportar: res.icms.saldoCredorTransportar,
          saldoCredorAnterior: res.icms.saldoCredorAnterior,
          icmsStRecolher: res.icmsStRecolher, difalRecolher: res.difalRecolher,
        };
        return this.findApuracao('ICMS', comp).pipe(
          switchMap(existing => existing
            ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, payload)
            : this.appwrite.createDocument<ApuracaoDoc>(APURACOES, payload),
          ),
          map(doc => this.mapApuracaoIcms(doc, detalhe)),
        );
      }),
    );
  }

  getApuracaoIcms(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('ICMS', this.competencia(ano, mes)).pipe(map(doc => this.mapApuracaoIcms(doc)));
  }

  listarApuracoesIcms(ano: number): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<ApuracaoDoc>(APURACOES, this.baseQueries([this.Q.equal('tipo', 'ICMS')])).pipe(
      map(docs => docs.filter(d => d.competencia.startsWith(String(ano)))
        .map(d => this.mapApuracaoIcms(d)!)),
    );
  }

  fecharApuracaoIcms(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('ICMS', this.competencia(ano, mes)).pipe(
      switchMap(existing => existing
        ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, { status: 'FECHADA' })
        : of(null)),
      map(doc => this.mapApuracaoIcms(doc)),
    );
  }

  // ============================================================
  // Apuração IPI  (apuracoes_fiscais, tipo = 'IPI')
  // Confronto débito (saídas) × crédito (entradas) — indústria/equiparado.
  // ============================================================
  private mapApuracaoIpi(doc: ApuracaoDoc | null, detalhe?: DetalheApuracao): Record<string, unknown> | null {
    if (!doc && !detalhe) return null;
    const debitos = detalhe ? detalhe.debitos : this.toNumber(doc?.debitos);
    const creditos = detalhe ? detalhe.creditos : this.toNumber(doc?.creditos);
    const recolher = detalhe ? detalhe.recolher : this.toNumber(doc?.valorRecolher);
    const saldoCredor = detalhe ? detalhe.saldoCredorTransportar : this.toNumber(doc?.saldoCredor);
    return {
      ...(doc ?? {}),
      id: doc?.$id,
      totalDebitos: debitos,
      totalCreditos: creditos,
      ipiRecolher: recolher,
      saldoCredorTransportar: saldoCredor,
      totalDebitosSaidas: debitos,
      totalCreditosEntradas: creditos,
      saldoCredorAnterior: detalhe?.saldoCredorAnterior ?? 0,
      status: doc?.status ?? 'ABERTA',
    };
  }

  calcularApuracaoIpi(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    const comp = this.competencia(ano, mes);
    return forkJoin({
      doMes: this.notasDaCompetencia(ano, mes),
      saldoAnterior: this.saldoCredorAnterior('IPI', ano, mes),
    }).pipe(
      switchMap(({ doMes, saldoAnterior }) => {
        const res = apurarPeriodo(doMes, { ipi: saldoAnterior }, { regime: this.regimeDe(doMes) });
        const payload: Record<string, unknown> = {
          tipo: 'IPI', competencia: comp,
          baseCalculo: res.baseCalculoSaidas,
          debitos: res.ipi.debitos, creditos: res.ipi.creditos,
          valorApurado: res.ipi.saldoApurado, valorRecolher: res.ipi.valorRecolher,
          saldoCredor: res.ipi.saldoCredorTransportar,
          status: 'ABERTA', empresaId: this.empresaId, tenantId: this.tenantId,
        };
        const detalhe: DetalheApuracao = {
          debitos: res.ipi.debitos, creditos: res.ipi.creditos,
          recolher: res.ipi.valorRecolher,
          saldoCredorTransportar: res.ipi.saldoCredorTransportar,
          saldoCredorAnterior: res.ipi.saldoCredorAnterior,
        };
        return this.findApuracao('IPI', comp).pipe(
          switchMap(existing => existing
            ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, payload)
            : this.appwrite.createDocument<ApuracaoDoc>(APURACOES, payload),
          ),
          map(doc => this.mapApuracaoIpi(doc, detalhe)),
        );
      }),
    );
  }

  getApuracaoIpi(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('IPI', this.competencia(ano, mes)).pipe(map(doc => this.mapApuracaoIpi(doc)));
  }

  fecharApuracaoIpi(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('IPI', this.competencia(ano, mes)).pipe(
      switchMap(existing => existing
        ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, { status: 'FECHADA' })
        : of(null)),
      map(doc => this.mapApuracaoIpi(doc)),
    );
  }

  // ============================================================
  // Apuração PIS/COFINS  (apuracoes_fiscais, tipo = 'PIS_COFINS')
  // ============================================================
  private mapApuracaoPisCofins(
    doc: ApuracaoDoc | null,
    detalhe?: { pis: ApuracaoContribuicao; cofins: ApuracaoContribuicao },
  ): Record<string, unknown> | null {
    if (!doc && !detalhe) return null;
    const pis = detalhe?.pis;
    const cofins = detalhe?.cofins;
    // Na leitura simples (sem detalhe), o doc guarda os totais combinados pis+cofins.
    return {
      ...(doc ?? {}),
      id: doc?.$id,
      pisDebitoSaidas: pis?.debitos ?? this.toNumber(doc?.debitos) / 2,
      pisCreditoEntradas: pis?.creditos ?? this.toNumber(doc?.creditos) / 2,
      pisRetidoFonte: pis?.retido ?? 0,
      pisSaldoCredorAnterior: pis?.saldoCredorAnterior ?? 0,
      pisRecolher: pis?.valorRecolher ?? this.toNumber(doc?.valorRecolher) / 2,
      cofinsDebitoSaidas: cofins?.debitos ?? this.toNumber(doc?.debitos) / 2,
      cofinsCreditoEntradas: cofins?.creditos ?? this.toNumber(doc?.creditos) / 2,
      cofinsRetidoFonte: cofins?.retido ?? 0,
      cofinsSaldoCredorAnterior: cofins?.saldoCredorAnterior ?? 0,
      cofinsRecolher: cofins?.valorRecolher ?? this.toNumber(doc?.valorRecolher) / 2,
      status: doc?.status ?? 'ABERTA',
    };
  }

  /**
   * Apura PIS/COFINS da competência via motor federal: débito (saídas) × crédito
   * (entradas, só no não-cumulativo/Real), com estimativa por alíquota quando não
   * há valor destacado. O regime é inferido das notas. Substitui o `creditos = 0`.
   * Obs.: o transporte de saldo credor entre competências (PIS e COFINS separados)
   * depende de colunas próprias no schema e fica para evolução futura.
   */
  calcularApuracaoPisCofins(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    const comp = this.competencia(ano, mes);
    return this.notasDaCompetencia(ano, mes).pipe(
      switchMap(doMes => {
        const res = apurarPisCofins(doMes, {}, { regime: this.regimeDe(doMes) });
        const debitos = this.round2(res.pis.debitos + res.cofins.debitos);
        const creditos = this.round2(res.pis.creditos + res.cofins.creditos);
        const recolher = this.round2(res.pis.valorRecolher + res.cofins.valorRecolher);
        const payload: Record<string, unknown> = {
          tipo: 'PIS_COFINS', competencia: comp, baseCalculo: res.baseSaidas,
          debitos, creditos, valorApurado: this.round2(debitos - creditos), valorRecolher: recolher,
          saldoCredor: this.round2(res.pis.saldoCredorTransportar + res.cofins.saldoCredorTransportar),
          status: 'ABERTA', empresaId: this.empresaId, tenantId: this.tenantId,
        };
        const detalhe = { pis: res.pis, cofins: res.cofins };
        return this.findApuracao('PIS_COFINS', comp).pipe(
          switchMap(existing => existing
            ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, payload)
            : this.appwrite.createDocument<ApuracaoDoc>(APURACOES, payload),
          ),
          map(doc => this.mapApuracaoPisCofins(doc, detalhe)),
        );
      }),
    );
  }

  getApuracaoPisCofins(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('PIS_COFINS', this.competencia(ano, mes)).pipe(map(doc => this.mapApuracaoPisCofins(doc)));
  }

  listarApuracoesPisCofins(ano: number): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<ApuracaoDoc>(APURACOES, this.baseQueries([this.Q.equal('tipo', 'PIS_COFINS')])).pipe(
      map(docs => docs.filter(d => d.competencia.startsWith(String(ano)))
        .map(d => this.mapApuracaoPisCofins(d)!)),
    );
  }

  private findApuracao(tipo: string, competencia: string): Observable<ApuracaoDoc | null> {
    return this.appwrite.listDocuments<ApuracaoDoc>(APURACOES, [
      this.Q.equal('tenantId', this.tenantId),
      this.Q.equal('tipo', tipo),
      this.Q.equal('competencia', competencia),
      this.Q.limit(1),
    ]).pipe(map(docs => docs[0] ?? null));
  }

  // ============================================================
  // Apuração federal sobre receita — IRPJ/CSLL (Presumido) e Simples (DAS)
  // ============================================================

  /** Lê as notas da empresa (limite ampliado para cobrir a janela de 12 meses). */
  private notasEmpresa(): Observable<NotaFiscalDoc[]> {
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, [
      this.Q.equal('tenantId', this.tenantId),
      this.Q.equal('empresaId', this.empresaId),
      this.Q.orderDesc('$createdAt'),
      this.Q.limit(500),
    ]);
  }

  /** Receita bruta (saídas autorizadas) nas competências informadas. */
  private receitaSaidas(notas: NotaFiscalDoc[], comps: Set<string>): number {
    return this.round2(notas
      .filter(n => n.status === 'AUTORIZADA'
        && comps.has((n.dataEmissao ?? '').slice(0, 7))
        && String(n.tipoOperacao ?? '').toUpperCase() !== 'ENTRADA')
      .reduce((s, n) => s + this.toNumber(n.valorTotal), 0));
  }

  /** As três competências do trimestre que contém o mês informado. */
  private competenciasTrimestre(ano: number, mes: number): string[] {
    const inicio = (Math.ceil(mes / 3) - 1) * 3 + 1;
    return [0, 1, 2].map(i => this.competencia(ano, inicio + i));
  }

  /** As 12 competências anteriores à do mês informado (base do RBT12). */
  private competenciasRbt12(ano: number, mes: number): string[] {
    const comps: string[] = [];
    let a = ano;
    let m = mes;
    for (let i = 0; i < 12; i++) {
      m--;
      if (m < 1) { m = 12; a--; }
      comps.push(this.competencia(a, m));
    }
    return comps;
  }

  // ── IRPJ/CSLL — Lucro Presumido (trimestral) ────────────────
  private mapIrpjCsll(doc: ApuracaoDoc | null, res?: ResultadoIrpjCsll): Record<string, unknown> | null {
    if (!doc && !res) return null;
    return {
      ...(doc ?? {}),
      id: doc?.$id,
      receitaBruta: res?.receitaBruta ?? this.toNumber(doc?.baseCalculo),
      atividade: res?.atividade ?? '-',
      baseIrpj: res?.baseIrpj ?? 0,
      irpj: res?.irpj ?? 0,
      adicionalIrpj: res?.adicionalIrpj ?? 0,
      irpjTotal: res?.irpjTotal ?? 0,
      baseCsll: res?.baseCsll ?? 0,
      csll: res?.csll ?? 0,
      totalRecolher: res?.totalRecolher ?? this.toNumber(doc?.valorRecolher),
      status: doc?.status ?? 'ABERTA',
    };
  }

  calcularIrpjCsll(ano: number, mes: number, atividade: AtividadePresumido = 'COMERCIO'): Observable<Record<string, unknown> | null> {
    const compTrim = this.competencia(ano, Math.ceil(mes / 3) * 3); // competência = mês de fechamento do trimestre
    const comps = new Set(this.competenciasTrimestre(ano, mes));
    return this.notasEmpresa().pipe(
      switchMap(notas => {
        const receita = this.receitaSaidas(notas, comps);
        const res = apurarIrpjCsllPresumido(receita, { atividade, mesesNoPeriodo: 3 });
        const payload: Record<string, unknown> = {
          tipo: 'IRPJ_CSLL', competencia: compTrim, baseCalculo: receita,
          debitos: res.totalRecolher, creditos: 0, valorApurado: res.totalRecolher,
          valorRecolher: res.totalRecolher, saldoCredor: 0,
          status: 'ABERTA', empresaId: this.empresaId, tenantId: this.tenantId,
        };
        return this.findApuracao('IRPJ_CSLL', compTrim).pipe(
          switchMap(existing => existing
            ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, payload)
            : this.appwrite.createDocument<ApuracaoDoc>(APURACOES, payload),
          ),
          map(doc => this.mapIrpjCsll(doc, res)),
        );
      }),
    );
  }

  getIrpjCsll(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('IRPJ_CSLL', this.competencia(ano, Math.ceil(mes / 3) * 3)).pipe(map(doc => this.mapIrpjCsll(doc)));
  }

  // ── Simples Nacional — DAS (mensal) ─────────────────────────
  private mapSimples(doc: ApuracaoDoc | null, res?: ResultadoSimples): Record<string, unknown> | null {
    if (!doc && !res) return null;
    return {
      ...(doc ?? {}),
      id: doc?.$id,
      rbt12: res?.rbt12 ?? 0,
      receitaMes: res?.receitaMes ?? this.toNumber(doc?.baseCalculo),
      anexo: res?.anexo ?? '-',
      faixa: res?.faixa ?? 0,
      aliquotaNominal: res?.aliquotaNominal ?? 0,
      aliquotaEfetiva: res?.aliquotaEfetiva ?? 0,
      valorDas: res?.valorDas ?? this.toNumber(doc?.valorRecolher),
      foraDoSimples: res?.foraDoSimples ?? false,
      status: doc?.status ?? 'ABERTA',
    };
  }

  calcularSimples(ano: number, mes: number, anexo: AnexoSimples = 'I'): Observable<Record<string, unknown> | null> {
    const comp = this.competencia(ano, mes);
    const compsMes = new Set([comp]);
    const compsRbt = new Set(this.competenciasRbt12(ano, mes));
    return this.notasEmpresa().pipe(
      switchMap(notas => {
        const receitaMes = this.receitaSaidas(notas, compsMes);
        const rbt12 = this.receitaSaidas(notas, compsRbt);
        const res = calcularDasSimples(rbt12, receitaMes, { anexo });
        const payload: Record<string, unknown> = {
          tipo: 'SIMPLES', competencia: comp, baseCalculo: receitaMes,
          debitos: res.valorDas, creditos: 0, valorApurado: res.valorDas,
          valorRecolher: res.valorDas, saldoCredor: 0,
          status: 'ABERTA', empresaId: this.empresaId, tenantId: this.tenantId,
        };
        return this.findApuracao('SIMPLES', comp).pipe(
          switchMap(existing => existing
            ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, payload)
            : this.appwrite.createDocument<ApuracaoDoc>(APURACOES, payload),
          ),
          map(doc => this.mapSimples(doc, res)),
        );
      }),
    );
  }

  getSimples(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('SIMPLES', this.competencia(ano, mes)).pipe(map(doc => this.mapSimples(doc)));
  }

  // ============================================================
  // SPED — geração dos arquivos (EFD ICMS/IPI e EFD-Contribuições)
  // Monta os dados a partir do Appwrite (empresa, notas+itens, produtos,
  // participantes, apurações) e delega a montagem do layout ao motor `sped`.
  // ============================================================

  /** Lê o cadastro da empresa; em falha, segue com placeholders (não derruba o SPED). */
  private empresaDoc(): Observable<EmpresaDoc | null> {
    if (!this.empresaId) return of(null);
    return this.appwrite.getDocument<EmpresaDoc>('empresas', this.empresaId).pipe(catchError(() => of(null)));
  }

  private mapEmpresaSped(doc: EmpresaDoc | null): EmpresaSped {
    return {
      cnpj: (doc?.cnpj ?? '').replace(/\D/g, ''),
      nome: doc?.razaoSocial ?? 'EMPRESA',
      ie: doc?.inscricaoEstadual,
      uf: doc?.uf ?? '',
      codMunicipio: doc?.codigoMunicipio,
      im: doc?.inscricaoMunicipal,
      fantasia: doc?.nomeFantasia,
      indAtividade: '1',
    };
  }

  /** Último dia do mês como data ISO YYYY-MM-DD (fechamento do período). */
  private periodoFinal(ano: number, mes: number): string {
    const dia = new Date(ano, mes, 0).getDate();
    return `${this.competencia(ano, mes)}-${String(dia).padStart(2, '0')}`;
  }

  private montarItemSped(it: ItemNotaFiscalDoc): DocumentoItemSped {
    return {
      numeroItem: it.numeroItem ?? 1,
      codItem: it.codigo ?? '',
      descricao: it.descricao,
      cfop: it.cfop ?? '',
      cstIcms: `${it.origem ?? '0'}${it.cstIcms ?? it.csosn ?? ''}`,
      quantidade: this.toNumber(it.quantidade),
      unidade: it.unidade,
      valorItem: this.toNumber(it.valorProdutos),
      valorDesconto: this.toNumber(it.desconto),
      baseIcms: this.toNumber(it.baseIcms),
      aliqIcms: this.toNumber(it.aliqIcms),
      valorIcms: this.toNumber(it.valorIcms),
      baseIcmsSt: this.toNumber(it.baseIcmsSt),
      valorIcmsSt: this.toNumber(it.valorIcmsSt),
      cstIpi: it.cstIpi,
      baseIpi: this.toNumber(it.baseIpi),
      aliqIpi: this.toNumber(it.aliqIpi),
      valorIpi: this.toNumber(it.valorIpi),
    };
  }

  private montarDocumentosSped(notas: NotaFiscalDoc[], itensPorNota: ItemNotaFiscalDoc[][]): DocumentoSped[] {
    return notas.map((n, i) => {
      const saida = String(n.tipoOperacao ?? 'SAIDA').toUpperCase() !== 'ENTRADA';
      const cnpjPart = ((saida ? n.destinatarioCpfCnpj : n.emitenteCnpj) ?? '').replace(/\D/g, '');
      return {
        tipoOperacao: saida ? 'SAIDA' : 'ENTRADA',
        indEmitente: saida ? '0' : '1',
        codParticipante: cnpjPart || undefined,
        modelo: n.modelo || '55',
        serie: n.serie,
        numero: n.numero,
        chave: n.chaveAcesso,
        dataEmissao: n.dataEmissao,
        valorTotal: this.toNumber(n.valorTotal),
        valorProdutos: this.toNumber(n.valorProdutos) || this.toNumber(n.valorTotal),
        valorDesconto: this.toNumber(n.valorDesconto),
        valorFrete: this.toNumber(n.valorFrete),
        valorIcms: this.toNumber(n.valorICMS),
        valorIcmsSt: this.toNumber(n.valorICMSST),
        valorIpi: this.toNumber(n.valorIPI),
        valorPis: this.toNumber(n.valorPIS),
        valorCofins: this.toNumber(n.valorCOFINS),
        itens: (itensPorNota[i] ?? []).map(it => this.montarItemSped(it)),
      } as DocumentoSped;
    });
  }

  private montarParticipantesSped(notas: NotaFiscalDoc[]): ParticipanteSped[] {
    const mapa = new Map<string, ParticipanteSped>();
    for (const n of notas) {
      const saida = String(n.tipoOperacao ?? 'SAIDA').toUpperCase() !== 'ENTRADA';
      const cnpj = ((saida ? n.destinatarioCpfCnpj : n.emitenteCnpj) ?? '').replace(/\D/g, '');
      if (!cnpj || mapa.has(cnpj)) continue;
      mapa.set(cnpj, {
        codigo: cnpj,
        nome: (saida ? n.destinatarioNome : n.emitenteNome) ?? cnpj,
        cnpjCpf: cnpj,
        uf: saida ? n.ufDestino : n.ufEmitente,
      });
    }
    return [...mapa.values()];
  }

  private montarItensSped(documentos: DocumentoSped[], produtos: ProdutoDoc[]): ItemSped[] {
    const porCodigo = new Map(produtos.map(p => [p.codigo, p]));
    const usados = new Map<string, ItemSped>();
    for (const doc of documentos) {
      for (const it of doc.itens) {
        if (!it.codItem || usados.has(it.codItem)) continue;
        const p = porCodigo.get(it.codItem);
        usados.set(it.codItem, {
          codigo: it.codItem,
          descricao: p?.descricao ?? it.descricao ?? it.codItem,
          unidade: p?.unidade ?? it.unidade,
          tipoItem: '00',
          ncm: p?.ncm,
        });
      }
    }
    return [...usados.values()];
  }

  /** Gera o arquivo EFD ICMS/IPI (SPED Fiscal) da competência como texto. */
  gerarArquivoSpedFiscal(ano: number, mes: number): Observable<string> {
    return forkJoin({
      empresa: this.empresaDoc(),
      doMes: this.notasDaCompetencia(ano, mes),
      produtos: this.appwrite.listDocuments<ProdutoDoc>('produtos', this.baseQueries([this.Q.equal('empresaId', this.empresaId)])),
    }).pipe(
      switchMap(({ empresa, doMes, produtos }) => {
        const itens$ = doMes.length ? forkJoin(doMes.map(n => this.listarItens(n.$id))) : of([] as ItemNotaFiscalDoc[][]);
        return itens$.pipe(map(itensPorNota => {
          const documentos = this.montarDocumentosSped(doMes, itensPorNota);
          const res = apurarPeriodo(doMes, {}, { regime: this.regimeDe(doMes) });
          const dados: DadosSpedFiscal = {
            empresa: this.mapEmpresaSped(empresa),
            periodoInicial: `${this.competencia(ano, mes)}-01`,
            periodoFinal: this.periodoFinal(ano, mes),
            participantes: this.montarParticipantesSped(doMes),
            itens: this.montarItensSped(documentos, produtos),
            documentos,
            apuracaoIcms: {
              debitos: res.icms.debitos, creditos: res.icms.creditos,
              saldoCredorAnterior: res.icms.saldoCredorAnterior,
              valorRecolher: res.icms.valorRecolher, saldoCredorTransportar: res.icms.saldoCredorTransportar,
            },
            apuracaoIpi: {
              debitos: res.ipi.debitos, creditos: res.ipi.creditos,
              saldoCredorAnterior: res.ipi.saldoCredorAnterior,
              valorRecolher: res.ipi.valorRecolher, saldoCredorTransportar: res.ipi.saldoCredorTransportar,
            },
          };
          return gerarSpedFiscal(dados);
        }));
      }),
    );
  }

  /** Gera o arquivo EFD-Contribuições (PIS/COFINS) da competência como texto. */
  gerarArquivoSpedContribuicoes(ano: number, mes: number): Observable<string> {
    return forkJoin({
      empresa: this.empresaDoc(),
      doMes: this.notasDaCompetencia(ano, mes),
    }).pipe(
      map(({ empresa, doMes }) => {
        const res = apurarPisCofins(doMes, {}, { regime: this.regimeDe(doMes) });
        const dados: DadosSpedContribuicoes = {
          empresa: this.mapEmpresaSped(empresa),
          periodoInicial: `${this.competencia(ano, mes)}-01`,
          periodoFinal: this.periodoFinal(ano, mes),
          regime: res.regime,
          pis: { debitos: res.pis.debitos, creditos: res.pis.creditos, valorRecolher: res.pis.valorRecolher },
          cofins: { debitos: res.cofins.debitos, creditos: res.cofins.creditos, valorRecolher: res.cofins.valorRecolher },
        };
        return gerarSpedContribuicoes(dados);
      }),
    );
  }

  // ============================================================
  // Emissão — geração do XML da NF-e (modelo 55, layout 4.00)
  // Gera o XML NÃO assinado. A assinatura A1 + transmissão à SEFAZ rodam numa
  // Appwrite Function (A1 do cofre no Storage) — ver autorizarNfe (TODO).
  // ============================================================

  private mapEmitenteNFe(empresa: EmpresaDoc | null): EmitenteNFe {
    const simples = (empresa?.regimeTributario ?? '').toUpperCase().includes('SIMPLES');
    return {
      cnpj: (empresa?.cnpj ?? '').replace(/\D/g, ''),
      nome: empresa?.razaoSocial ?? 'EMPRESA',
      fantasia: empresa?.nomeFantasia,
      ie: empresa?.inscricaoEstadual,
      crt: simples ? '1' : '3',
      endereco: {
        logradouro: empresa?.endereco,
        numero: empresa?.numero,
        bairro: empresa?.bairro,
        codMunicipio: empresa?.codigoMunicipio,
        municipio: empresa?.cidade,
        uf: empresa?.uf ?? '',
        cep: empresa?.cep,
      },
    };
  }

  private mapItemNFe(it: ItemNotaFiscalDoc, ordem: number): ItemNFe {
    return {
      numeroItem: it.numeroItem ?? ordem,
      codigo: it.codigo ?? '',
      descricao: it.descricao ?? '',
      ncm: it.ncm ?? '',
      cest: it.cest,
      cfop: it.cfop ?? '',
      unidade: it.unidade ?? 'UN',
      quantidade: this.toNumber(it.quantidade),
      valorUnitario: this.toNumber(it.valorUnitario),
      valorProdutos: this.toNumber(it.valorProdutos),
      desconto: this.toNumber(it.desconto) || undefined,
      frete: this.toNumber(it.frete) || undefined,
      seguro: this.toNumber(it.seguro) || undefined,
      outras: this.toNumber(it.outras) || undefined,
      origem: it.origem ?? '0',
      cstIcms: it.cstIcms,
      csosn: it.csosn,
      baseIcms: this.toNumber(it.baseIcms),
      aliqIcms: this.toNumber(it.aliqIcms),
      valorIcms: this.toNumber(it.valorIcms),
      baseIcmsSt: this.toNumber(it.baseIcmsSt),
      valorIcmsSt: this.toNumber(it.valorIcmsSt),
      cstIpi: it.cstIpi,
      baseIpi: this.toNumber(it.baseIpi),
      aliqIpi: this.toNumber(it.aliqIpi),
      valorIpi: this.toNumber(it.valorIpi),
      cstPis: it.cstPis,
      aliqPis: this.toNumber(it.aliqPis),
      valorPis: this.toNumber(it.valorPis),
      cstCofins: it.cstCofins,
      aliqCofins: this.toNumber(it.aliqCofins),
      valorCofins: this.toNumber(it.valorCofins),
    };
  }

  /** Gera o XML (não assinado) de uma NF-e persistida e devolve a chave + XML. */
  gerarXmlNotaFiscal(notaId: string): Observable<{ chave: string; xml: string }> {
    return forkJoin({
      nota: this.appwrite.getDocument<NotaFiscalDoc>(NOTAS, notaId),
      itens: this.listarItens(notaId),
      empresa: this.empresaDoc(),
    }).pipe(
      map(({ nota, itens, empresa }) => {
        const notaNFe: NotaNFe = {
          ide: {
            natOp: nota.naturezaOperacao ?? 'Venda',
            serie: this.toNumber(nota.serie) || 1,
            numero: this.toNumber(nota.numero) || 1,
            dataEmissao: nota.dataEmissao,
            tipoOperacao: String(nota.tipoOperacao ?? 'SAIDA').toUpperCase() === 'ENTRADA' ? '0' : '1',
            tpAmb: '2', // homologação por padrão; produção exige A1 + transmissão
          },
          emit: this.mapEmitenteNFe(empresa),
          dest: {
            cnpjCpf: (nota.destinatarioCpfCnpj ?? '').replace(/\D/g, ''),
            nome: nota.destinatarioNome ?? '',
            indIEDest: nota.contribuinteIcms ? '1' : '9',
          },
          itens: itens.map((it, i) => this.mapItemNFe(it, i + 1)),
        };
        return gerarXmlNFe(notaNFe);
      }),
    );
  }

  // ============================================================
  // Escrituração Fiscal  (escrituracoes_fiscais)
  // ============================================================
  criarEscrituracao(data: Record<string, unknown>): Observable<EscrituracaoDoc> {
    const payload: Record<string, unknown> = {
      tipo: (data['tipo'] as string) ?? '',
      competencia: (data['competencia'] as string) ?? '',
      status: (data['status'] as string) ?? 'ABERTA',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
    return this.appwrite.createDocument<EscrituracaoDoc>(ESCRITURACOES, payload);
  }

  listarEscrituracoes(ano: number, mes: number): Observable<EscrituracaoDoc[]> {
    const comp = this.competencia(ano, mes);
    return this.appwrite.listDocuments<EscrituracaoDoc>(ESCRITURACOES, this.baseQueries([this.Q.equal('competencia', comp)]));
  }

  listarEscrituracoesPorTipo(tipo: string, ano: number, mes: number): Observable<EscrituracaoDoc[]> {
    const comp = this.competencia(ano, mes);
    return this.appwrite.listDocuments<EscrituracaoDoc>(ESCRITURACOES,
      this.baseQueries([this.Q.equal('tipo', tipo), this.Q.equal('competencia', comp)]));
  }

  // ============================================================
  // CIAP  (ciap)
  // ============================================================
  private mapCiap(doc: CiapDoc): Record<string, unknown> {
    return { ...doc, id: doc.$id };
  }

  listarCiap(): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<CiapDoc>(CIAP, this.baseQueries()).pipe(map(docs => docs.map(d => this.mapCiap(d))));
  }

  criarCiap(data: Record<string, unknown>): Observable<CiapDoc> {
    const payload: Record<string, unknown> = {
      descricao: (data['descricao'] as string) ?? '',
      valor: this.toNumber(data['valor']),
      parcelas: this.toNumber(data['parcelas']) || 48,
      parcelaAtual: this.toNumber(data['parcelaAtual']) || 0,
      competencia: (data['competencia'] as string) ?? '',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
    return this.appwrite.createDocument<CiapDoc>(CIAP, payload);
  }

  apropriarParcelaCiap(id: string): Observable<CiapDoc> {
    // Apropria a próxima parcela do CIAP (cálculo local, sem integração externa).
    return this.appwrite.getDocument<CiapDoc>(CIAP, id).pipe(
      switchMap(doc => {
        const proxima = Math.min(this.toNumber(doc.parcelaAtual) + 1, this.toNumber(doc.parcelas));
        return this.appwrite.updateDocument<CiapDoc>(CIAP, id, { parcelaAtual: proxima });
      }),
    );
  }

  // ============================================================
  // Guias Fiscais  (guias_fiscais)
  // ============================================================
  private mapGuia(doc: GuiaDoc): Record<string, unknown> {
    return {
      ...doc,
      id: doc.$id,
      tipoGuia: doc.tipo,
      valorTotal: doc.valor,
    };
  }

  private buildGuiaPayload(form: Record<string, unknown>): Record<string, unknown> {
    return {
      tipo: (form['tipoGuia'] as string) ?? (form['tipo'] as string) ?? 'DARF',
      competencia: (form['competencia'] as string) ?? '',
      valor: this.toNumber(form['valorPrincipal'] ?? form['valor']),
      dataVencimento: (form['dataVencimento'] as string) ?? '',
      status: 'GERADA',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  criarGuia(data: Record<string, unknown>): Observable<GuiaDoc> {
    return this.appwrite.createDocument<GuiaDoc>(GUIAS, this.buildGuiaPayload(data));
  }

  pagarGuia(id: string, data: Record<string, unknown>): Observable<GuiaDoc> {
    const dataPagamento = (data['dataPagamento'] as string) ?? new Date().toISOString().split('T')[0];
    return this.appwrite.updateDocument<GuiaDoc>(GUIAS, id, { status: 'PAGA', dataPagamento });
  }

  cancelarGuia(id: string): Observable<GuiaDoc> {
    return this.appwrite.updateDocument<GuiaDoc>(GUIAS, id, { status: 'CANCELADA' });
  }

  listarGuiasPorCompetencia(competencia: string): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<GuiaDoc>(GUIAS, this.baseQueries([this.Q.equal('competencia', competencia)])).pipe(
      map(docs => docs.map(d => this.mapGuia(d))),
    );
  }

  listarGuiasVencidas(): Observable<Record<string, unknown>[]> {
    const hoje = new Date().toISOString().split('T')[0];
    return this.appwrite.listDocuments<GuiaDoc>(GUIAS, this.baseQueries()).pipe(
      map(docs => docs
        .filter(d => d.status !== 'PAGA' && d.status !== 'CANCELADA' && (d.dataVencimento ?? '') < hoje)
        .map(d => ({ ...this.mapGuia(d), status: 'VENCIDA' }))),
    );
  }

  listarGuiasPorTipo(tipo: string): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<GuiaDoc>(GUIAS, this.baseQueries([this.Q.equal('tipo', tipo)])).pipe(
      map(docs => docs.map(d => this.mapGuia(d))),
    );
  }

  /**
   * Detalha uma guia: acréscimos por atraso (multa/juros) e código de barras +
   * linha digitável (cálculo local via motor `guias`). Quando `dataPagamento` é
   * informada, usa-a; senão usa a registrada na guia.
   */
  detalharGuia(id: string, dataPagamento?: string): Observable<Record<string, unknown>> {
    return this.appwrite.getDocument<GuiaDoc>(GUIAS, id).pipe(
      map(g => {
        const calc = montarGuia({
          tipo: g.tipo,
          competencia: g.competencia,
          valorPrincipal: this.toNumber(g.valor),
          vencimento: g.dataVencimento,
          pagamento: dataPagamento ?? g.dataPagamento,
        });
        return { ...this.mapGuia(g), ...calc };
      }),
    );
  }

  // ============================================================
  // Obrigações acessórias  (obrigacoes)
  // Calendário por competência/regime (motor `obrigacoes`), persistido.
  // ============================================================
  private regimeEmpresa(empresa: EmpresaDoc | null): RegimeTributario {
    const r = (empresa?.regimeTributario ?? '').toUpperCase();
    if (r.includes('SIMPLES')) return 'SIMPLES';
    if (r.includes('PRESUMIDO')) return 'PRESUMIDO';
    return 'REAL';
  }

  private mapObrigacao(doc: ObrigacaoDoc): Record<string, unknown> {
    return { ...doc, id: doc.$id, descricao: descricaoObrigacao(doc.tipo) };
  }

  private obrigacoesDocs(competencia: string): Observable<ObrigacaoDoc[]> {
    return this.appwrite.listDocuments<ObrigacaoDoc>(OBRIGACOES, this.baseQueries([this.Q.equal('competencia', competencia)]));
  }

  /** Gera (idempotente) as obrigações da competência conforme o regime da empresa. */
  gerarObrigacoes(ano: number, mes: number): Observable<Record<string, unknown>[]> {
    const comp = this.competencia(ano, mes);
    return forkJoin({ empresa: this.empresaDoc(), existentes: this.obrigacoesDocs(comp) }).pipe(
      switchMap(({ empresa, existentes }) => {
        const cal = calendarioObrigacoes(ano, mes, { regime: this.regimeEmpresa(empresa) });
        const jaExiste = new Set(existentes.map(o => o.tipo));
        const novas = cal.filter(o => !jaExiste.has(o.tipo));
        if (!novas.length) return of(existentes);
        return forkJoin(novas.map(o => this.appwrite.createDocument<ObrigacaoDoc>(OBRIGACOES, {
          tipo: o.tipo, competencia: comp, dataVencimento: o.dataVencimento,
          status: 'PENDENTE', empresaId: this.empresaId, tenantId: this.tenantId,
        }))).pipe(map(criadas => [...existentes, ...criadas]));
      }),
      map(docs => docs.map(d => this.mapObrigacao(d)).sort((a, b) =>
        String(a['dataVencimento']).localeCompare(String(b['dataVencimento'])))),
    );
  }

  listarObrigacoes(ano: number, mes: number): Observable<Record<string, unknown>[]> {
    return this.obrigacoesDocs(this.competencia(ano, mes)).pipe(
      map(docs => docs.map(d => this.mapObrigacao(d)).sort((a, b) =>
        String(a['dataVencimento']).localeCompare(String(b['dataVencimento'])))),
    );
  }

  entregarObrigacao(id: string, protocolo?: string): Observable<ObrigacaoDoc> {
    return this.appwrite.updateDocument<ObrigacaoDoc>(OBRIGACOES, id, {
      status: 'ENTREGUE',
      dataEntrega: new Date().toISOString().split('T')[0],
      protocolo: protocolo ?? '',
    });
  }

  // ============================================================
  // CT-e  (cte)
  // ============================================================
  private mapCte(doc: CteDoc): Record<string, unknown> {
    return {
      ...doc,
      id: doc.$id,
      serie: doc.serie,
      valorFrete: doc.valorTotalServico,
    };
  }

  private buildCtePayload(form: Record<string, unknown>): Record<string, unknown> {
    return {
      serie: this.toNumber(form['serie']) || 1,
      tipoCte: (form['tipoServico'] as string) ?? 'NORMAL',
      modal: (form['modal'] as string) ?? 'RODOVIARIO',
      naturezaOperacao: (form['naturezaOperacao'] as string) ?? '',
      remetenteNome: (form['remetenteNome'] as string) ?? '',
      remetenteCnpjCpf: (form['remetenteCnpjCpf'] as string) ?? '',
      destinatarioNome: (form['destinatarioNome'] as string) ?? '',
      destinatarioCnpjCpf: (form['destinatarioCnpjCpf'] as string) ?? '',
      valorTotalServico: this.toNumber(form['valorFrete']),
      valorCarga: this.toNumber(form['valorCarga']),
      icmsBase: this.toNumber(form['baseIcms']),
      icmsAliquota: this.toNumber(form['aliqIcms']),
      icmsValor: this.toNumber(form['baseIcms']) * (this.toNumber(form['aliqIcms']) / 100),
      dataEmissao: new Date().toISOString().split('T')[0],
      status: 'DIGITACAO',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  listCtes(page = 0, size = 20): Observable<Page<Record<string, unknown>>> {
    return this.appwrite.listDocuments<CteDoc>(CTE, this.baseQueries()).pipe(
      map(docs => this.paginate(docs.map(d => this.mapCte(d)), page, size)),
    );
  }

  createCte(data: Record<string, unknown>): Observable<CteDoc> {
    return this.appwrite.createDocument<CteDoc>(CTE, this.buildCtePayload(data));
  }

  autorizarCte(id: string): Observable<CteDoc> {
    // TODO(appwrite): integração externa — transmissão do CT-e à SEFAZ não disponível.
    return this.appwrite.updateDocument<CteDoc>(CTE, id, { status: 'AUTORIZADO' });
  }

  cancelarCte(id: string, _motivo: string): Observable<CteDoc> {
    // TODO(appwrite): integração externa — evento de cancelamento do CT-e não disponível.
    return this.appwrite.updateDocument<CteDoc>(CTE, id, { status: 'CANCELADO' });
  }
}
