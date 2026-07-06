import {
  dentroDoPeriodo, mapearDocumentoWorker, mapearNota, montarLinhas, resumoSync, resumoSyncWorker,
  DocumentoSefazView, RetornoDistribuicaoView,
} from './importar-nfe.mapper';
import { NotaImportada } from '../engine/importador-xml-nfe';

/** Fábrica de NotaImportada com defaults mínimos (campos não usados zerados). */
function nota(sobrescreve: Partial<NotaImportada> = {}): NotaImportada {
  return {
    chaveAcesso: '35260112345678000199550010000001231000001234',
    modelo: '55',
    numero: 123,
    serie: '1',
    dataEmissao: '2026-06-15T10:00:00-03:00',
    naturezaOperacao: 'Venda',
    tipoOperacaoDocumento: 'SAIDA',
    emitenteCnpj: '12345678000199',
    emitenteNome: 'Fornecedor Exemplo LTDA',
    ufEmitente: 'SP',
    destinatarioCpfCnpj: '98765432000188',
    destinatarioNome: 'Bear ERP',
    ufDestino: 'SP',
    contribuinteIcms: true,
    valorProdutos: 1000,
    valorTotal: 1180,
    valorICMS: 180,
    valorICMSST: 0,
    valorIPI: 0,
    valorPIS: 0,
    valorCOFINS: 0,
    valorFrete: 0,
    valorDesconto: 0,
    itens: [],
    detalhamento: 'completo',
    ...sobrescreve,
  } as NotaImportada;
}

describe('mapearNota', () => {
  it('NF-e completa → tipo procNFe, status de escrituração e campos do cabeçalho', () => {
    const v = mapearNota(nota());
    expect(v.tipoRaw).toBe('procNFe');
    expect(v.tipo).toBe('NF-e');
    expect(v.status).toBe('XML completo');
    expect(v.numero).toBe('123');
    expect(v.emitente).toBe('Fornecedor Exemplo LTDA');
    expect(v.cnpjEmitente).toBe('12345678000199');
    expect(v.valor).toBe(1180);
    expect(v.emissao).toBe('2026-06-15T10:00:00-03:00');
  });

  it('resumo (resNFe) autorizado → aguardando XML completo', () => {
    const v = mapearNota(nota({ detalhamento: 'resumo', situacao: '1' }));
    expect(v.tipoRaw).toBe('resNFe');
    expect(v.tipo).toBe('Resumo NF-e');
    expect(v.status).toBe('Aguardando XML completo');
  });

  it('resumo cancelado/denegado → status específico', () => {
    expect(mapearNota(nota({ detalhamento: 'resumo', situacao: '2' })).status).toBe('Cancelada no emitente');
    expect(mapearNota(nota({ detalhamento: 'resumo', situacao: '3' })).status).toBe('Denegada');
  });

  it('resumo sem situação informada → assume aguardando XML', () => {
    expect(mapearNota(nota({ detalhamento: 'resumo', situacao: undefined })).status).toBe('Aguardando XML completo');
  });

  it('campos ausentes não quebram: usa traço/nulos', () => {
    const v = mapearNota(nota({ numero: 0, emitenteNome: '', emitenteCnpj: '', dataEmissao: '' }));
    expect(v.numero).toBe('—');
    expect(v.emitente).toBe('—');
    expect(v.emissao).toBeNull();
  });
});

describe('montarLinhas', () => {
  it('retorno com erro → nenhuma linha', () => {
    expect(montarLinhas({ ok: false, erro: 'Falha' })).toEqual([]);
  });

  it('completas vêm antes dos resumos e ambas viram linhas', () => {
    const ret: RetornoDistribuicaoView = {
      ok: true,
      notas: [nota({ chaveAcesso: 'A'.repeat(44) })],
      resumos: [nota({ chaveAcesso: 'B'.repeat(44), detalhamento: 'resumo', situacao: '1' })],
    };
    const linhas = montarLinhas(ret);
    expect(linhas.length).toBe(2);
    expect(linhas[0].tipoRaw).toBe('procNFe');
    expect(linhas[1].tipoRaw).toBe('resNFe');
  });

  it('listas ausentes → lista vazia (não explode)', () => {
    expect(montarLinhas({ ok: true })).toEqual([]);
  });
});

describe('resumoSync', () => {
  it('erro → repassa a mensagem', () => {
    expect(resumoSync({ ok: false, erro: 'UF do emitente ausente no cadastro da empresa.' }))
      .toBe('UF do emitente ausente no cadastro da empresa.');
  });

  it('sucesso → conta documentos, escrituradas, duplicadas e resumos', () => {
    const msg = resumoSync({ ok: true, totalDocs: 5, escrituradas: 2, duplicadas: 1, resumos: [nota({ detalhamento: 'resumo' }), nota({ detalhamento: 'resumo' })] });
    expect(msg).toContain('5 documento(s)');
    expect(msg).toContain('2 escriturada(s)');
    expect(msg).toContain('1 já existente(s)');
    expect(msg).toContain('2 resumo(s) aguardando manifestação');
  });

  it('sucesso sem nada novo → só o essencial (sem partes zeradas opcionais)', () => {
    const msg = resumoSync({ ok: true, totalDocs: 0, escrituradas: 0, duplicadas: 0, resumos: [] });
    expect(msg).toBe('0 documento(s) · 0 escriturada(s)');
  });
});

// ── Fluxo do worker fiscal_sefaz (A1 avulso — local ou Render) ───────────────

/** Fábrica de documento do worker com defaults mínimos. */
function docWorker(sobrescreve: Partial<DocumentoSefazView> = {}): DocumentoSefazView {
  return {
    nsu: '000000000000015',
    document_type: 'procNFe',
    access_key: '35260112345678000199550010000001231000001234',
    cnpj_emitente: '12345678000199',
    dados: { nNF: '123', serie: '1', xNome: 'Fornecedor Exemplo LTDA', dhEmi: '2026-06-15T10:00:00-03:00', vNF: '1180.00' },
    ...sobrescreve,
  };
}

describe('mapearDocumentoWorker', () => {
  it('procNFe → NF-e com cabeçalho completo e status de XML completo', () => {
    const v = mapearDocumentoWorker(docWorker());
    expect(v.tipoRaw).toBe('procNFe');
    expect(v.tipo).toBe('NF-e');
    expect(v.status).toBe('XML completo');
    expect(v.numero).toBe('123');
    expect(v.emitente).toBe('Fornecedor Exemplo LTDA');
    expect(v.valor).toBe(1180);
    expect(v.emissao).toBe('2026-06-15T10:00:00-03:00');
  });

  it('resNFe → resumo aguardando XML completo', () => {
    const v = mapearDocumentoWorker(docWorker({ document_type: 'resNFe' }));
    expect(v.tipo).toBe('Resumo NF-e');
    expect(v.status).toBe('Aguardando XML completo');
  });

  it('eventos (procEventoNFe/resEvento) também viram linhas', () => {
    expect(mapearDocumentoWorker(docWorker({ document_type: 'procEventoNFe' })).tipo).toBe('Evento');
    expect(mapearDocumentoWorker(docWorker({ document_type: 'resEvento' })).status).toBe('Resumo encontrado');
  });

  it('dados ausentes não quebram: traço/nulos e emitente cai para o CNPJ', () => {
    const v = mapearDocumentoWorker(docWorker({ dados: undefined, access_key: undefined }));
    expect(v.chave).toBe('');
    expect(v.numero).toBe('—');
    expect(v.emitente).toBe('12345678000199');
    expect(v.emissao).toBeNull();
    expect(v.valor).toBeNull();
  });
});

describe('resumoSyncWorker', () => {
  it('erro → repassa a mensagem', () => {
    expect(resumoSyncWorker({ ok: false, erro: 'Senha do certificado incorreta.' }))
      .toBe('Senha do certificado incorreta.');
  });

  it('sucesso → cStat, motivo e contagem de documentos', () => {
    const msg = resumoSyncWorker({ ok: true, cstat: 138, motivo: 'Documento(s) localizado(s)', documentos: [docWorker(), docWorker()] });
    expect(msg).toBe('cStat 138 · Documento(s) localizado(s) · 2 documento(s)');
  });

  it('sucesso sem cStat/motivo → só a contagem (sem separadores órfãos)', () => {
    expect(resumoSyncWorker({ ok: true })).toBe('0 documento(s)');
  });
});

describe('dentroDoPeriodo (filtro 1/2/3 meses da tela)', () => {
  const AGORA = new Date('2026-07-06T12:00:00-03:00');

  it('sem filtro (0 meses) aceita tudo, inclusive nota sem data', () => {
    expect(dentroDoPeriodo('2020-01-01T00:00:00-03:00', 0, AGORA)).toBe(true);
    expect(dentroDoPeriodo(null, 0, AGORA)).toBe(true);
  });

  it('último mês: 10 dias atrás entra; 45 dias atrás sai', () => {
    expect(dentroDoPeriodo('2026-06-26T10:00:00-03:00', 1, AGORA)).toBe(true);
    expect(dentroDoPeriodo('2026-05-22T10:00:00-03:00', 1, AGORA)).toBe(false);
  });

  it('2 meses: 45 dias atrás entra; 75 dias atrás sai', () => {
    expect(dentroDoPeriodo('2026-05-22T10:00:00-03:00', 2, AGORA)).toBe(true);
    expect(dentroDoPeriodo('2026-04-22T10:00:00-03:00', 2, AGORA)).toBe(false);
  });

  it('3 meses: 75 dias atrás entra; 100 dias atrás sai', () => {
    expect(dentroDoPeriodo('2026-04-22T10:00:00-03:00', 3, AGORA)).toBe(true);
    expect(dentroDoPeriodo('2026-03-28T10:00:00-03:00', 3, AGORA)).toBe(false);
  });

  it('exatamente no limite do período entra (>= limite)', () => {
    expect(dentroDoPeriodo('2026-06-06T12:00:00-03:00', 1, AGORA)).toBe(true);
  });

  it('com filtro ativo, nota sem data ou com data inválida sai', () => {
    expect(dentroDoPeriodo(null, 1, AGORA)).toBe(false);
    expect(dentroDoPeriodo('não-é-data', 1, AGORA)).toBe(false);
  });
});
