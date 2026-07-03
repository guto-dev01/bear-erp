import { mapearNota, montarLinhas, resumoSync, RetornoDistribuicaoView } from './importar-nfe.mapper';
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
