/**
 * DEMO ponta a ponta da emissão de NF-e — com DADOS MOCADOS, SEM rede e SEM A1 real.
 *
 * Costura o ciclo inteiro que foi construído nas fases fiscais:
 *   dados mocados → gera XML (front) → reimporta (prova) → assina A1 de teste
 *   → envelope SOAP → "transmite" p/ SEFAZ FALSO → interpreta a autorização.
 *
 *   node scripts/demo-nfe-e2e.ts
 *
 * Cruza os dois runtimes: engine do front (TS/ESM via type-stripping) +
 * camada de transmissão das functions (CommonJS via createRequire).
 */
import { createRequire } from 'node:module';
import { gerarXmlNFe } from '../frontend-angular/src/app/features/fiscal/engine/nfe-xml.ts';
import { importarNfeXml } from '../frontend-angular/src/app/features/fiscal/engine/importador-xml-nfe.ts';

const require = createRequire(import.meta.url);
const REPO = '/home/gustavo-oliveira-santiago/bear-erp/functions';
const { assinarNfe, verificarAssinatura } = require(`${REPO}/_shared/nfe/assinatura`);
const { transmitirNfe } = require(`${REPO}/_shared/nfe/transmissao`);
const { lerPkcs12 } = require(`${REPO}/_shared/certificado/pkcs12`);
const { gerarPfxTeste } = require(`${REPO}/_shared/__tests__/helpers/gera-pfx`);

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const titulo = (s: string) => console.log(`\n\x1b[1m── ${s} ──\x1b[0m`);

// ════════════════════════════════════════════════════════════
// 1) DADOS MOCADOS (uma venda interestadual SP → RJ, 2 itens)
// ════════════════════════════════════════════════════════════
titulo('1) Dados mocados');
const nota = {
  ide: { natOp: 'Venda de mercadoria', serie: 1, numero: 1042, dataEmissao: '2026-05-12', tipoOperacao: '1' as const, idDest: '2', tpAmb: '2' },
  emit: {
    cnpj: '12345678000199', nome: 'BEAR FINANCE COMERCIO LTDA', fantasia: 'Bear', ie: '110042490114', crt: '3',
    endereco: { logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', codMunicipio: '3550308', municipio: 'Sao Paulo', uf: 'SP', cep: '01310100' },
  },
  dest: {
    cnpjCpf: '11222333000181', nome: 'Cliente Alpha Distribuidora LTDA', ie: '99999999', indIEDest: '1',
    endereco: { logradouro: 'Rua das Laranjeiras', numero: '50', bairro: 'Centro', codMunicipio: '3304557', municipio: 'Rio de Janeiro', uf: 'RJ', cep: '20021000' },
  },
  itens: [
    { numeroItem: 1, codigo: 'PRD-001', descricao: 'Teclado mecânico ABNT2', ncm: '84716053', cfop: '6102', unidade: 'UN',
      quantidade: 10, valorUnitario: 250, valorProdutos: 2500, origem: '0', cstIcms: '00', baseIcms: 2500, aliqIcms: 12, valorIcms: 300,
      cstPis: '01', aliqPis: 1.65, valorPis: 41.25, cstCofins: '01', aliqCofins: 7.6, valorCofins: 190 },
    { numeroItem: 2, codigo: 'PRD-002', descricao: 'Mouse sem fio', ncm: '84716054', cfop: '6102', unidade: 'UN',
      quantidade: 20, valorUnitario: 80, valorProdutos: 1600, origem: '0', cstIcms: '00', baseIcms: 1600, aliqIcms: 12, valorIcms: 192,
      cstPis: '01', aliqPis: 1.65, valorPis: 26.4, cstCofins: '01', aliqCofins: 7.6, valorCofins: 121.6 },
  ],
};
console.log(`Emitente : ${nota.emit.nome} (${nota.emit.endereco.uf})`);
console.log(`Destino  : ${nota.dest.nome} (${nota.dest.endereco!.uf}) — operação interestadual`);
console.log(`Itens    : ${nota.itens.length} | Produtos: ${brl(nota.itens.reduce((s, i) => s + i.valorProdutos, 0))}`);

// ════════════════════════════════════════════════════════════
// 2) GERA O XML DA NF-e (engine do front)
// ════════════════════════════════════════════════════════════
titulo('2) Geração do XML (layout 4.00)');
const { chave, xml } = gerarXmlNFe(nota);
console.log(`Chave de acesso (44) : ${chave}`);
console.log(`DV                   : ${chave.slice(-1)}`);
console.log(`Tamanho do XML       : ${xml.length} bytes`);

// ════════════════════════════════════════════════════════════
// 3) PROVA: reimporta o XML pelo parser independente (Fase 2)
// ════════════════════════════════════════════════════════════
titulo('3) Reimportação (prova de que o XML é coerente)');
const imp = importarNfeXml(xml);
console.log(`Nº / série    : ${imp.numero} / ${imp.serie}`);
console.log(`Total ICMS    : ${brl(imp.valorICMS)}  | Total nota: ${brl(imp.valorTotal)}`);
console.log(`Itens lidos   : ${imp.itens.length}  | 1º item: ${imp.itens[0].descricao} (CFOP ${imp.itens[0].cfop})`);
console.log(`Chave bate    : ${imp.chaveAcesso === chave ? 'SIM ✅' : 'NÃO ❌'}`);

// ════════════════════════════════════════════════════════════
// 4) ASSINA com um A1 de TESTE (gerado em memória — jamais real)
// ════════════════════════════════════════════════════════════
titulo('4) Assinatura digital (A1 de teste)');
const { pfx, senha } = gerarPfxTeste({ cn: 'BEAR FINANCE COMERCIO LTDA:12345678000199' });
const material = lerPkcs12(pfx, senha);
const xmlAssinado = assinarNfe(xml, material);
console.log(`Certificado (titular): ${material.titular}`);
console.log(`Assinou              : ${xmlAssinado.includes('Signature') ? 'SIM' : 'NÃO'}`);
console.log(`Assinatura válida    : ${verificarAssinatura(xmlAssinado, material.leafPem) ? 'SIM ✅' : 'NÃO ❌'}`);

// ════════════════════════════════════════════════════════════
// 5) "TRANSMITE" para um SEFAZ FALSO (resposta mockada p/ a chave)
// ════════════════════════════════════════════════════════════
titulo('5) Transmissão para SEFAZ-SP FALSO (homologação)');
const protocoloFake = '135260000098765';
const respostaSefaz =
  '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
  '<retEnviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">' +
  '<tpAmb>2</tpAmb><cStat>104</cStat><xMotivo>Lote processado</xMotivo>' +
  `<protNFe><infProt><nProt>${protocoloFake}</nProt><chNFe>${chave}</chNFe>` +
  '<dhRecbto>2026-05-12T10:30:00-03:00</dhRecbto>' +
  '<cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe>' +
  '</retEnviNFe></soap:Body></soap:Envelope>';

// SEFAZ falso: captura o que foi enviado e devolve a resposta canned.
const { EventEmitter } = require('node:events');
const captura: Record<string, unknown> = {};
const httpsFake = {
  Agent: class { constructor(o: unknown) { captura.agentOpts = o; } },
  request(options: Record<string, unknown>, cb: (res: unknown) => void) {
    captura.options = options;
    const req = new EventEmitter() as EventEmitter & Record<string, unknown>;
    req.write = (buf: Buffer | string) => { captura.body = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf); };
    req.end = () => {
      const res = new EventEmitter() as EventEmitter & Record<string, unknown>;
      res.statusCode = 200; res.headers = {};
      cb(res);
      process.nextTick(() => { res.emit('data', Buffer.from(respostaSefaz, 'utf8')); res.emit('end'); });
    };
    req.destroy = () => {};
    return req;
  },
};

const cofreFake = { carregar: async () => ({ pfx, senha }) };
const retorno = await transmitirNfe({
  cofre: cofreFake,
  empresaId: 'empresa-bear',
  uf: 'SP',
  xmlNFe: xml,
  ambiente: 'homologacao',
  truststoreEstrito: false,
  httpsModule: httpsFake,
});

console.log(`Endpoint chamado : ${(captura.options as Record<string, string>).hostname}${(captura.options as Record<string, string>).path}`);
console.log(`Corpo assinado   : ${/<(\w+:)?Signature[ >]/.test(captura.body as string) ? 'SIM' : 'NÃO'} | tem <enviNFe>: ${(captura.body as string).includes('<enviNFe') ? 'SIM' : 'NÃO'}`);

// ════════════════════════════════════════════════════════════
// 6) RESULTADO interpretado
// ════════════════════════════════════════════════════════════
titulo('6) Retorno da SEFAZ (interpretado)');
console.log(`Situação    : ${retorno.situacao}`);
console.log(`cStat       : ${retorno.cStat} — ${retorno.xMotivo}`);
console.log(`Protocolo   : ${retorno.nProt}`);
console.log(`Chave       : ${retorno.chNFe}`);

const ok =
  imp.chaveAcesso === chave &&
  verificarAssinatura(xmlAssinado, material.leafPem) &&
  retorno.situacao === 'AUTORIZADA' &&
  retorno.nProt === protocoloFake &&
  retorno.chNFe === chave;

console.log(`\n${ok ? '\x1b[32m✅ CICLO COMPLETO: emitida → assinada → transmitida → AUTORIZADA\x1b[0m' : '\x1b[31m❌ algo divergiu no ciclo\x1b[0m'}`);
if (!ok) process.exit(1);
