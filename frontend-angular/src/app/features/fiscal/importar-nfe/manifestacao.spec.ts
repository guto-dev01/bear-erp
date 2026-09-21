import {
  EVENTOS_MANIFESTACAO, JUSTIFICATIVA_MAX, LOTE_MAX_CIENCIA,
  aplicarManifestacao, chaveValida, chavesParaCiencia, eventoPor, interpretarRetorno,
  pendentesDeCiencia, podeManifestar, resumoLote, statusPosManifestacao, validarJustificativa,
} from './manifestacao';
import { NotaView } from './importar-nfe.mapper';

const CHAVE = '35260112345678000199550010000001231000001234';
const OUTRA = '35260112345678000199550010000004561000004567';

/** Linha da tabela com defaults de resumo pendente. */
function linha(sobrescreve: Partial<NotaView> = {}): NotaView {
  return {
    chave: CHAVE,
    numero: '—',
    serie: '',
    emitente: 'Fornecedor Exemplo LTDA',
    cnpjEmitente: '12345678000199',
    emissao: '2026-09-15',
    valor: 1000,
    tipo: 'Resumo NF-e',
    tipoRaw: 'resNFe',
    status: 'Aguardando XML completo',
    situacao: '1',
    ...sobrescreve,
  };
}

describe('chaveValida', () => {
  it('aceita 44 dígitos e recusa o resto', () => {
    expect(chaveValida(CHAVE)).toBe(true);
    expect(chaveValida(CHAVE.slice(0, 43))).toBe(false);
    expect(chaveValida('')).toBe(false);
    expect(chaveValida(undefined)).toBe(false);
    expect(chaveValida(null)).toBe(false);
  });
});

describe('podeManifestar', () => {
  it('vale para resumo e NF-e completa com chave; evento e sem-chave ficam de fora', () => {
    expect(podeManifestar(linha())).toBe(true);
    expect(podeManifestar(linha({ tipoRaw: 'procNFe' }))).toBe(true);
    expect(podeManifestar(linha({ tipoRaw: 'resEvento' }))).toBe(false);
    expect(podeManifestar(linha({ chave: '' }))).toBe(false);
  });
});

describe('pendentesDeCiencia', () => {
  it('exclui cancelada, denegada, já manifestada e sem chave', () => {
    const linhas = [
      linha(),
      linha({ chave: OUTRA, situacao: '2' }),                    // cancelada
      linha({ chave: OUTRA, situacao: '3' }),                    // denegada
      linha({ chave: OUTRA, manifestada: true }),                // já feita
      linha({ chave: '' }),                                      // sem chave
      linha({ chave: OUTRA, tipoRaw: 'procNFe' }),               // já tem XML completo
    ];
    expect(pendentesDeCiencia(linhas).map(n => n.chave)).toEqual([CHAVE]);
  });

  it('deduplica a mesma chave repetida em dois lotes de NSU', () => {
    expect(pendentesDeCiencia([linha(), linha(), linha({ chave: OUTRA })]).length).toBe(2);
  });

  it('trata situação ausente como normal (resumo antigo sem cSitNFe)', () => {
    expect(pendentesDeCiencia([linha({ situacao: undefined })]).length).toBe(1);
  });
});

describe('chavesParaCiencia', () => {
  it('respeita o teto do lote', () => {
    const linhas = Array.from({ length: 25 }, (_, i) =>
      linha({ chave: String(i).padStart(44, '9') }));
    expect(chavesParaCiencia(linhas).length).toBe(LOTE_MAX_CIENCIA);
    expect(chavesParaCiencia(linhas, 5).length).toBe(5);
  });
});

describe('validarJustificativa', () => {
  it('só 210240 exige, com piso de 15 e teto de 255', () => {
    expect(validarJustificativa('210240', 'curta')).toContain('15');
    expect(validarJustificativa('210240', 'mercadoria devolvida na portaria')).toBe('');
    expect(validarJustificativa('210240', 'x'.repeat(JUSTIFICATIVA_MAX + 1))).toContain('255');
    expect(validarJustificativa('210210', '')).toBe('');
    expect(validarJustificativa('210220', '')).toBe('');
  });
});

describe('interpretarRetorno', () => {
  it('135/136 registrados e 573 (duplicidade) contam como sucesso', () => {
    expect(interpretarRetorno(CHAVE, { ok: true, cStat: 135, xMotivo: 'Evento registrado' }).ok).toBe(true);
    expect(interpretarRetorno(CHAVE, { ok: true, cStat: 136 }).ok).toBe(true);
    expect(interpretarRetorno(CHAVE, { ok: true, cStat: 573, xMotivo: 'Duplicidade de evento' }).ok).toBe(true);
  });

  it('cStat de rejeição e falha da Function não são sucesso', () => {
    expect(interpretarRetorno(CHAVE, { ok: true, cStat: 594, xMotivo: 'Rejeição' }).ok).toBe(false);
    expect(interpretarRetorno(CHAVE, { ok: false, erro: 'Certificado vencido' }))
      .toEqual({ chave: CHAVE, ok: false, mensagem: 'Certificado vencido' });
    expect(interpretarRetorno(CHAVE, null).ok).toBe(false);
  });

  it('confia no `registrado` do backend mesmo com cStat fora da lista', () => {
    expect(interpretarRetorno(CHAVE, { ok: true, cStat: 999, registrado: true }).ok).toBe(true);
    expect(interpretarRetorno(CHAVE, { ok: true, cStat: 135, registrado: false }).ok).toBe(false);
  });

  it('a mensagem junta cStat e xMotivo', () => {
    expect(interpretarRetorno(CHAVE, { ok: true, cStat: 135, xMotivo: 'Evento registrado' }).mensagem)
      .toBe('135 Evento registrado');
  });
});

describe('aplicarManifestacao', () => {
  it('marca só a chave certa e troca o status, sem mutar o array original', () => {
    const linhas = [linha(), linha({ chave: OUTRA })];
    const saida = aplicarManifestacao(linhas, { chave: CHAVE, ok: true, mensagem: '' }, '210210');
    expect(saida[0].manifestada).toBe(true);
    expect(saida[0].status).toBe('Ciência registrada — puxe as notas de novo');
    expect(saida[1].manifestada).toBeUndefined();
    expect(linhas[0].manifestada).toBeUndefined();  // original intacto
    expect(linhas[0].status).toBe('Aguardando XML completo');
  });

  it('resultado com falha não altera nada', () => {
    const linhas = [linha()];
    const saida = aplicarManifestacao(linhas, { chave: CHAVE, ok: false, mensagem: 'erro' }, '210210');
    expect(saida[0].manifestada).toBeUndefined();
    expect(saida[0].status).toBe('Aguardando XML completo');
  });
});

describe('statusPosManifestacao', () => {
  it('distingue a Ciência dos demais eventos', () => {
    expect(statusPosManifestacao('210210')).toBe('Ciência registrada — puxe as notas de novo');
    expect(statusPosManifestacao('210220')).toBe('Desconhecimento da operação registrada');
  });
});

describe('resumoLote', () => {
  it('conta sucessos, falhas e avisa para puxar de novo na Ciência', () => {
    const res = [
      { chave: CHAVE, ok: true, mensagem: '135' },
      { chave: OUTRA, ok: true, mensagem: '573' },
      { chave: OUTRA, ok: false, mensagem: 'erro' },
    ];
    const msg = resumoLote(res, '210210');
    expect(msg).toContain('2 de 3 manifestada(s)');
    expect(msg).toContain('1 falhou/falharam');
    expect(msg).toContain('puxe as notas de novo');
  });

  it('não pede nova consulta quando o evento não libera XML', () => {
    expect(resumoLote([{ chave: CHAVE, ok: true, mensagem: '135' }], '210220'))
      .toBe('1 de 1 manifestada(s)');
  });
});

describe('catálogo de eventos', () => {
  it('abre na Ciência e só 210240 exige justificativa', () => {
    expect(EVENTOS_MANIFESTACAO[0].tpEvento).toBe('210210');
    expect(EVENTOS_MANIFESTACAO.filter(e => e.exigeJustificativa).map(e => e.tpEvento)).toEqual(['210240']);
    expect(eventoPor('210200').rotulo).toBe('Confirmação da operação');
  });
});
