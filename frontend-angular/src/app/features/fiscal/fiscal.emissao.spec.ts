import { montarEmissaoNfe, normalizarRegime, montarContexto, montarItemFiscal, NfeFormValue } from './fiscal.types';
import { calcularDocumento } from './engine/motor-tributario';

const formBase: NfeFormValue = {
  tipo: 'SAIDA',
  naturezaOperacao: 'Venda de Mercadorias',
  destinatario: { cnpjCpf: '12345678000199', razaoSocial: 'Cliente X', inscricaoEstadual: '111', uf: 'rj' },
  itens: [{ descricao: 'Produto', ncm: '12345678', cfop: '5102', quantidade: 10, valorUnitario: 100, cstIcms: '00', aliquotaIcms: 18 }],
};

describe('normalizarRegime', () => {
  it('mapeia texto livre da empresa para o enum do motor', () => {
    expect(normalizarRegime('Simples Nacional')).toBe('SIMPLES');
    expect(normalizarRegime('Lucro Real')).toBe('REAL');
    expect(normalizarRegime('Lucro Presumido')).toBe('PRESUMIDO');
    expect(normalizarRegime(undefined)).toBe('PRESUMIDO');
  });
});

describe('montarEmissaoNfe', () => {
  it('cabeçalho: regime e UF do emitente vêm da empresa; UF destino e contribuinte do destinatário', () => {
    const { cab } = montarEmissaoNfe(formBase, { uf: 'sp', regimeTributario: 'Lucro Presumido' });
    expect(cab.regime).toBe('PRESUMIDO');
    expect(cab.ufEmitente).toBe('SP');
    expect(cab.ufDestino).toBe('RJ');          // normalizado p/ maiúsculas
    expect(cab.tipoOperacao).toBe('SAIDA');
    expect(cab.contribuinteIcms).toBe(true);   // IE preenchida
  });

  it('sem inscrição estadual → não contribuinte', () => {
    const f = { ...formBase, destinatario: { ...formBase.destinatario, inscricaoEstadual: '' } };
    expect(montarEmissaoNfe(f, { uf: 'SP' }).cab.contribuinteIcms).toBe(false);
  });

  it('regime normal → config por CST (sem CSOSN)', () => {
    const { linhas } = montarEmissaoNfe(formBase, { uf: 'SP', regimeTributario: 'Presumido' });
    expect(linhas[0].config.cstIcms).toBe('00');
    expect(linhas[0].config.csosn).toBeUndefined();
    expect(linhas[0].config.aliqIcms).toBe(18);
  });

  it('Simples → config por CSOSN (sem CST)', () => {
    const { linhas } = montarEmissaoNfe(formBase, { uf: 'SP', regimeTributario: 'Simples Nacional' });
    expect(linhas[0].config.csosn).toBe('00');   // herda o código digitado
    expect(linhas[0].config.cstIcms).toBeUndefined();
  });

  it('extras persistem apenas colunas existentes do destinatário/natureza', () => {
    const { extras } = montarEmissaoNfe(formBase, { uf: 'SP' });
    expect(extras['destinatarioNome']).toBe('Cliente X');
    expect(extras['destinatarioCpfCnpj']).toBe('12345678000199');
    expect(extras['naturezaOperacao']).toBe('Venda de Mercadorias');
  });

  it('end-to-end: a tela usa o MOTOR — ICMS interestadual real (12%, não a heurística de 18%) + IBS/CBS', () => {
    // SP→RJ é interestadual: o motor destaca ICMS a 12% (Sul/Sudeste→Sudeste) = R$120.
    // A heurística antiga (buildNfePayload) usava a alíquota da linha (18%) → R$180.
    // Provar 120 garante que a tela NÃO usa mais a heurística.
    const { cab, linhas } = montarEmissaoNfe(formBase, { uf: 'SP', regimeTributario: 'Presumido' });
    const { totais } = calcularDocumento(montarContexto(cab), linhas.map(montarItemFiscal));
    expect(totais.valorIcms).toBe(120);                  // motor interestadual, NÃO 180
    expect(totais.valorIbs + totais.valorCbs).toBe(10);  // reforma 2026 (1%)
    expect(totais.valorTotalNota).toBe(1000);            // híbrido: sem IBS/CBS no total
  });

  it('P1.8: consumidorFinal dispara o DIFAL (interestadual, não-contribuinte)', () => {
    const f: NfeFormValue = {
      tipo: 'SAIDA', consumidorFinal: true,
      destinatario: { cnpjCpf: '52998224725', razaoSocial: 'PF', inscricaoEstadual: '', uf: 'RJ' }, // sem IE → não contribuinte
      itens: [{ descricao: 'P', quantidade: 10, valorUnitario: 100, cstIcms: '00', aliquotaIcms: 18, aliqInternaDestino: 20 }],
    };
    const { cab, linhas } = montarEmissaoNfe(f, { uf: 'SP', regimeTributario: 'Presumido' });
    expect(cab.consumidorFinal).toBe(true);
    const { totais } = calcularDocumento(montarContexto(cab), linhas.map(montarItemFiscal));
    expect(totais.valorDifalDestino).toBe(80);           // 1000 × (20% interna − 12% interestadual)
  });

  it('sem consumidorFinal → DIFAL zero (prova que o gatilho é a tela, não o motor)', () => {
    const f: NfeFormValue = {
      tipo: 'SAIDA', consumidorFinal: false,
      destinatario: { inscricaoEstadual: '', uf: 'RJ' },
      itens: [{ quantidade: 10, valorUnitario: 100, cstIcms: '00', aliquotaIcms: 18, aliqInternaDestino: 20 }],
    };
    const { cab, linhas } = montarEmissaoNfe(f, { uf: 'SP', regimeTributario: 'Presumido' });
    const { totais } = calcularDocumento(montarContexto(cab), linhas.map(montarItemFiscal));
    expect(totais.valorDifalDestino).toBe(0);
  });
});
