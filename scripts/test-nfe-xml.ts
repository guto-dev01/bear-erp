/**
 * Teste do gerador de XML da NF-e (Fase 6) — roda SEM Appwrite e SEM navegador.
 * Valida o DV da chave (módulo 11), a estrutura da chave e faz ROUND-TRIP:
 * gera o XML e o reimporta pelo parser da Fase 2, conferindo que tudo bate.
 *
 *   node scripts/test-nfe-xml.ts
 */
import {
  calcularDV,
  gerarChaveAcesso,
  gerarXmlNFe,
} from '../frontend-angular/src/app/features/fiscal/engine/nfe-xml.ts';
import { importarNfeXml } from '../frontend-angular/src/app/features/fiscal/engine/importador-xml-nfe.ts';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  cond ? pass++ : fail++;
};
const eq = (a: unknown, b: unknown, msg: string) => ok(a === b, `${msg} (esperado ${JSON.stringify(b)}, obtido ${JSON.stringify(a)})`);
const near = (a: number, b: number, msg: string) => ok(Math.abs(a - b) < 0.01, `${msg} (esperado ${b}, obtido ${a})`);

// ════════ Dígito verificador (módulo 11) ════════
eq(calcularDV('1' + '0'.repeat(42)), 7, 'DV: 1 seguido de 42 zeros → 7 (peso/direção corretos)');
eq(calcularDV('0'.repeat(43)), 0, 'DV: tudo zero → resto 0 ⇒ DV 0');
ok(calcularDV('3525'.padEnd(43, '9')) >= 0 && calcularDV('3525'.padEnd(43, '9')) <= 9, 'DV: sempre 0..9');

// ════════ Chave de acesso ════════
const chave = gerarChaveAcesso({ uf: 'SP', dataEmissao: '2026-05-10', cnpj: '12.345.678/0001-99', modelo: 55, serie: 1, numero: 1001, codigoNumerico: '00012345' });
eq(chave.length, 44, 'Chave: 44 dígitos');
eq(chave.slice(0, 2), '35', 'Chave: cUF de SP = 35');
eq(chave.slice(2, 6), '2605', 'Chave: AAMM = 2605');
eq(chave.slice(6, 20), '12345678000199', 'Chave: CNPJ posicionado');
eq(chave.slice(20, 22), '55', 'Chave: modelo 55');
eq(chave.slice(22, 25), '001', 'Chave: série 001');
eq(chave.slice(25, 34), '000001001', 'Chave: número 9 dígitos');
eq(calcularDV(chave.slice(0, 43)), Number(chave.slice(-1)), 'Chave: DV consistente com os 43 dígitos');

// ════════ Round-trip: gerar → importar (regime normal) ════════
const notaNormal = {
  ide: { natOp: 'Venda de mercadoria', serie: 1, numero: 1001, dataEmissao: '2026-05-10', tipoOperacao: '1' as const, tpAmb: '2' },
  emit: {
    cnpj: '12345678000199', nome: 'BEAR FINANCE LTDA', ie: '110042490114', crt: '3',
    endereco: { logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', codMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01310100' },
  },
  dest: {
    cnpjCpf: '11222333000181', nome: 'Cliente Alpha LTDA', ie: '123456789', indIEDest: '1',
    endereco: { logradouro: 'Rua B', numero: '50', bairro: 'Centro', codMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01000000' },
  },
  itens: [
    {
      numeroItem: 1, codigo: 'PRD1', descricao: 'Produto Um', ncm: '85044010', cfop: '5102', unidade: 'UN',
      quantidade: 10, valorUnitario: 60, valorProdutos: 600, origem: '0', cstIcms: '00', baseIcms: 600, aliqIcms: 18, valorIcms: 108,
      cstIpi: '50', baseIpi: 600, aliqIpi: 5, valorIpi: 30, cstPis: '01', aliqPis: 1.65, valorPis: 9.9, cstCofins: '01', aliqCofins: 7.6, valorCofins: 45.6,
    },
    {
      numeroItem: 2, codigo: 'PRD2', descricao: 'Produto Dois', ncm: '39269090', cfop: '5102', unidade: 'CX',
      quantidade: 4, valorUnitario: 100, valorProdutos: 400, origem: '0', cstIcms: '00', baseIcms: 400, aliqIcms: 18, valorIcms: 72,
      cstPis: '01', aliqPis: 1.65, valorPis: 6.6, cstCofins: '01', aliqCofins: 7.6, valorCofins: 30.4,
    },
  ],
};

const { chave: chaveGerada, xml } = gerarXmlNFe(notaNormal);
ok(xml.startsWith('<?xml'), 'XML: começa com declaração <?xml');
ok(xml.includes(`<infNFe Id="NFe${chaveGerada}" versao="4.00">`), 'XML: infNFe com Id/chave e versão 4.00');

const imp = importarNfeXml(xml);
eq(imp.chaveAcesso, chaveGerada, 'Round-trip: chave importada = chave gerada');
eq(imp.numero, 1001, 'Round-trip: número');
eq(imp.serie, '1', 'Round-trip: série');
eq(imp.modelo, '55', 'Round-trip: modelo');
eq(imp.naturezaOperacao, 'Venda de mercadoria', 'Round-trip: natureza da operação');
eq(imp.tipoOperacaoDocumento, 'SAIDA', 'Round-trip: tpNF 1 → SAIDA');
eq(imp.emitenteCnpj, '12345678000199', 'Round-trip: CNPJ emitente');
eq(imp.emitenteNome, 'BEAR FINANCE LTDA', 'Round-trip: nome emitente');
eq(imp.ufEmitente, 'SP', 'Round-trip: UF emitente');
eq(imp.destinatarioCpfCnpj, '11222333000181', 'Round-trip: CNPJ destinatário');
eq(imp.ufDestino, 'SP', 'Round-trip: UF destino');
eq(imp.contribuinteIcms, true, 'Round-trip: indIEDest 1 → contribuinte');
near(imp.valorProdutos, 1000, 'Round-trip: total produtos');
near(imp.valorICMS, 180, 'Round-trip: total ICMS');
near(imp.valorIPI, 30, 'Round-trip: total IPI');
near(imp.valorPIS, 16.5, 'Round-trip: total PIS');
near(imp.valorCOFINS, 76, 'Round-trip: total COFINS');
// vNF = produtos + IPI = 1000 + 30
near(imp.valorTotal, 1030, 'Round-trip: valor total da nota (vNF)');
eq(imp.itens.length, 2, 'Round-trip: 2 itens');
eq(imp.itens[0].codigo, 'PRD1', 'Round-trip: item 1 código');
eq(imp.itens[0].ncm, '85044010', 'Round-trip: item 1 NCM');
eq(imp.itens[0].cfop, '5102', 'Round-trip: item 1 CFOP');
eq(imp.itens[0].cstIcms, '00', 'Round-trip: item 1 CST ICMS');
near(imp.itens[0].quantidade, 10, 'Round-trip: item 1 quantidade');
near(imp.itens[0].valorIcms, 108, 'Round-trip: item 1 ICMS');
near(imp.itens[0].aliqIpi, 5, 'Round-trip: item 1 alíquota IPI');
near(imp.itens[0].valorIpi, 30, 'Round-trip: item 1 valor IPI');

// ════════ Round-trip: Simples Nacional (CSOSN) ════════
const notaSimples = {
  ide: { natOp: 'Venda', serie: 1, numero: 7, dataEmissao: '2026-05-11', tipoOperacao: '1' as const },
  emit: { cnpj: '99888777000166', nome: 'Loja Simples ME', crt: '1', endereco: { uf: 'MG', codMunicipio: '3106200' } },
  dest: { cnpjCpf: '52998224725', nome: 'Consumidor', indIEDest: '9' },
  itens: [
    { numeroItem: 1, codigo: 'X', descricao: 'Item Simples', ncm: '61091000', cfop: '5405', unidade: 'UN', quantidade: 2, valorUnitario: 50, valorProdutos: 100, origem: '0', csosn: '102' },
  ],
};
const impSimples = importarNfeXml(gerarXmlNFe(notaSimples).xml);
eq(impSimples.itens[0].csosn, '102', 'Round-trip Simples: CSOSN 102 preservado');
eq(impSimples.contribuinteIcms, false, 'Round-trip Simples: indIEDest 9 → não contribuinte');
eq(impSimples.destinatarioCpfCnpj, '52998224725', 'Round-trip Simples: CPF do destinatário');

console.log(`\n${pass} asserções passaram, ${fail} falharam.`);
if (fail > 0) process.exit(1);
