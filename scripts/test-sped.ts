/**
 * Teste da geração de SPED (Fase 5) — roda SEM Appwrite e SEM navegador.
 * Gera EFD ICMS/IPI e EFD-Contribuições e valida estrutura, layout e — o ponto
 * crítico — a consistência dos contadores do Bloco 9 (9900/9990/9999).
 *
 *   node scripts/test-sped.ts
 */
import {
  gerarSpedFiscal,
  gerarSpedContribuicoes,
} from '../frontend-angular/src/app/features/fiscal/engine/sped.ts';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  cond ? pass++ : fail++;
};
const eq = (a: unknown, b: unknown, msg: string) => ok(a === b, `${msg} (esperado ${b}, obtido ${a})`);

/** Quebra o arquivo em registros: [{reg, campos}], validando o cercamento por "|". */
function parse(arquivo: string) {
  const linhas = arquivo.split('\r\n').filter(l => l.length > 0);
  return linhas.map(l => {
    const cercado = l.startsWith('|') && l.endsWith('|');
    const partes = l.slice(1, -1).split('|');
    return { linha: l, cercado, reg: partes[0], campos: partes.slice(1) };
  });
}

function validarArquivo(arquivo: string, rotulo: string) {
  const regs = parse(arquivo);

  ok(regs.every(r => r.cercado), `${rotulo}: toda linha começa e termina com "|"`);
  eq(regs[0].reg, '0000', `${rotulo}: primeiro registro é 0000`);
  eq(regs[regs.length - 1].reg, '9999', `${rotulo}: último registro é 9999`);

  // Contagem real por registro
  const contagem = new Map<string, number>();
  for (const r of regs) contagem.set(r.reg, (contagem.get(r.reg) ?? 0) + 1);

  // 9900: cada linha deve refletir a contagem real do registro citado
  const linhas9900 = regs.filter(r => r.reg === '9900');
  let ok9900 = true;
  for (const r of linhas9900) {
    const alvo = r.campos[0];
    const declarado = Number(r.campos[1]);
    const real = contagem.get(alvo) ?? 0;
    if (declarado !== real) { ok9900 = false; console.log(`   ↳ 9900 ${alvo}: declarado ${declarado} ≠ real ${real}`); }
  }
  ok(ok9900, `${rotulo}: todos os 9900 batem com a contagem real`);
  eq(contagem.get('9900'), linhas9900.length, `${rotulo}: nº de linhas 9900 = contagem de 9900`);

  // 9990 = total de linhas do Bloco 9 (registros iniciados por "9")
  const bloco9 = regs.filter(r => r.reg.startsWith('9')).length;
  const reg9990 = regs.find(r => r.reg === '9990')!;
  eq(Number(reg9990.campos[0]), bloco9, `${rotulo}: 9990 = nº de linhas do Bloco 9`);

  // 9999 = total de linhas do arquivo
  const reg9999 = regs.find(r => r.reg === '9999')!;
  eq(Number(reg9999.campos[0]), regs.length, `${rotulo}: 9999 = total de linhas do arquivo`);

  // Totalizadores de bloco X990 = nº de linhas do bloco X
  for (const [bloco, reg990] of [['0', '0990'], ['C', 'C990'], ['E', 'E990'], ['1', '1990']] as const) {
    const linhasBloco = regs.filter(r => r.reg.startsWith(bloco)).length;
    const r990 = regs.find(r => r.reg === reg990);
    if (r990) eq(Number(r990.campos[0]), linhasBloco, `${rotulo}: ${reg990} = nº de linhas do Bloco ${bloco}`);
  }

  return regs;
}

// ════════ EFD ICMS/IPI ════════
const dadosFiscal = {
  empresa: { cnpj: '12345678000199', nome: 'BEAR FINANCE LTDA', ie: '123456789', uf: 'SP', codMunicipio: '3550308', indAtividade: '0' },
  periodoInicial: '2026-05-01',
  periodoFinal: '2026-05-31',
  participantes: [
    { codigo: 'P1', nome: 'Cliente Alpha', cnpjCpf: '11222333000181', uf: 'SP', codMunicipio: '3550308' },
    { codigo: 'P2', nome: 'Fornecedor Beta', cnpjCpf: '99888777000166', uf: 'MG', codMunicipio: '3106200' },
  ],
  itens: [
    { codigo: 'PRD1', descricao: 'Produto Um', unidade: 'UN', tipoItem: '00', ncm: '85044010' },
    { codigo: 'PRD2', descricao: 'Produto Dois', unidade: 'CX', tipoItem: '00', ncm: '39269090' },
  ],
  documentos: [
    {
      tipoOperacao: 'SAIDA' as const, indEmitente: '0' as const, codParticipante: 'P1', modelo: '55', serie: '1', numero: 1001,
      chave: '35260512345678000199550010000010011000010010', dataEmissao: '2026-05-10',
      valorTotal: 1180, valorProdutos: 1000, valorIcms: 180, valorIpi: 0,
      itens: [
        { numeroItem: 1, codItem: 'PRD1', descricao: 'Produto Um', cfop: '5102', cstIcms: '000', quantidade: 10, unidade: 'UN', valorItem: 600, baseIcms: 600, aliqIcms: 18, valorIcms: 108 },
        { numeroItem: 2, codItem: 'PRD2', descricao: 'Produto Dois', cfop: '5102', cstIcms: '000', quantidade: 4, unidade: 'CX', valorItem: 400, baseIcms: 400, aliqIcms: 18, valorIcms: 72 },
      ],
    },
    {
      tipoOperacao: 'ENTRADA' as const, indEmitente: '1' as const, codParticipante: 'P2', modelo: '55', serie: '2', numero: 55,
      dataEmissao: '2026-05-05', valorTotal: 500, valorProdutos: 500, valorIcms: 60, valorIpi: 25,
      itens: [
        { numeroItem: 1, codItem: 'PRD1', descricao: 'Produto Um', cfop: '1102', cstIcms: '000', quantidade: 5, unidade: 'UN', valorItem: 500, baseIcms: 500, aliqIcms: 12, valorIcms: 60, cstIpi: '00', baseIpi: 500, aliqIpi: 5, valorIpi: 25 },
      ],
    },
  ],
  apuracaoIcms: { debitos: 180, creditos: 60, saldoCredorAnterior: 0, valorRecolher: 120, saldoCredorTransportar: 0 },
  apuracaoIpi: { debitos: 0, creditos: 25, saldoCredorAnterior: 0, valorRecolher: 0, saldoCredorTransportar: 25 },
};

const arquivoFiscal = gerarSpedFiscal(dadosFiscal);
const regsFiscal = validarArquivo(arquivoFiscal, 'Fiscal');

// Conteúdo específico
const reg0000 = regsFiscal[0];
eq(reg0000.campos[1], '0', 'Fiscal: 0000 COD_FIN = 0 (original)');
eq(reg0000.campos[2], '01052026', 'Fiscal: 0000 DT_INI = ddmmaaaa');
eq(reg0000.campos[5], '12345678000199', 'Fiscal: 0000 CNPJ');
const c100 = regsFiscal.filter(r => r.reg === 'C100');
eq(c100.length, 2, 'Fiscal: 2 documentos C100');
eq(c100[0].campos[0], '1', 'Fiscal: 1º C100 IND_OPER = 1 (saída)');
eq(c100[1].campos[0], '0', 'Fiscal: 2º C100 IND_OPER = 0 (entrada)');
eq(regsFiscal.filter(r => r.reg === 'C170').length, 3, 'Fiscal: 3 itens C170 no total');
eq(regsFiscal.filter(r => r.reg === '0200').length, 2, 'Fiscal: 2 itens no 0200');
eq(regsFiscal.filter(r => r.reg === '0190').length, 2, 'Fiscal: 2 unidades no 0190');
const e110 = regsFiscal.find(r => r.reg === 'E110')!;
eq(e110.campos[0], '180,00', 'Fiscal: E110 total débitos');
eq(e110.campos[4], '60,00', 'Fiscal: E110 total créditos');
eq(e110.campos[11], '120,00', 'Fiscal: E110 ICMS a recolher');
// C190 consolida os 2 itens de mesma CST/CFOP/alíq do 1º doc numa linha
const c190 = regsFiscal.filter(r => r.reg === 'C190');
eq(c190.length, 2, 'Fiscal: 2 grupos C190 (um por documento)');
eq(c190[0].campos[3], '1000,00', 'Fiscal: C190 VL_OPR consolidado = 600 + 400');

// ════════ EFD-Contribuições ════════
const arquivoContrib = gerarSpedContribuicoes({
  empresa: { cnpj: '12345678000199', nome: 'BEAR FINANCE LTDA', uf: 'SP', codMunicipio: '3550308' },
  periodoInicial: '2026-05-01',
  periodoFinal: '2026-05-31',
  regime: 'NAO_CUMULATIVO',
  pis: { debitos: 165, creditos: 100, valorRecolher: 65 },
  cofins: { debitos: 760, creditos: 460, valorRecolher: 300 },
});
const regsContrib = validarArquivo(arquivoContrib, 'Contrib');
const m200 = regsContrib.find(r => r.reg === 'M200')!;
const m600 = regsContrib.find(r => r.reg === 'M600')!;
eq(m200.campos[0], '165,00', 'Contrib: M200 PIS contribuição do período');
eq(m200.campos[1], '100,00', 'Contrib: M200 PIS créditos descontados');
eq(m200.campos[11], '65,00', 'Contrib: M200 PIS total a recolher');
eq(m600.campos[11], '300,00', 'Contrib: M600 COFINS total a recolher');
eq(regsContrib.find(r => r.reg === '0110')!.campos[0], '1', 'Contrib: 0110 incidência = 1 (não-cumulativo)');

console.log(`\n${pass} asserções passaram, ${fail} falharam.`);
if (fail > 0) process.exit(1);
