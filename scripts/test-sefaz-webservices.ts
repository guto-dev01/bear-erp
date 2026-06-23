/**
 * Teste do resolvedor de Web Services da SEFAZ (Fase 6, etapa [4]).
 * Valida o roteamento UF→autorizador, URLs exatas, serviço nacional e lacunas.
 *
 *   node scripts/test-sefaz-webservices.ts
 *
 * Nota: confere a LÓGICA de roteamento/montagem, não a validade ao vivo das URLs
 * (essas mudam por NT e devem ser conferidas no Portal Nacional).
 */
import {
  autorizadorDaUf,
  urlWebService,
  urlPorAutorizador,
} from '../frontend-angular/src/app/features/fiscal/engine/sefaz-webservices.ts';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  cond ? pass++ : fail++;
};
const eq = (a: unknown, b: unknown, msg: string) => ok(a === b, `${msg}\n   esperado: ${b}\n   obtido:   ${a}`);

// ── Roteamento UF → autorizador ─────────────────────────────
eq(autorizadorDaUf('SP'), 'SP', 'SP é autorizador próprio');
eq(autorizadorDaUf('rj'), 'SVRS', 'RJ usa SVRS (case-insensitive)');
eq(autorizadorDaUf('MA'), 'SVAN', 'MA usa SVAN');
eq(autorizadorDaUf('AM'), null, 'AM é lacuna conhecida (própria não mapeada)');
eq(autorizadorDaUf('XX'), null, 'UF inválida → null');

// ── URLs exatas de produção ─────────────────────────────────
eq(urlWebService('SP', 'NFeAutorizacao4', 'producao'),
  'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx', 'SP NFeAutorizacao4 produção');
eq(urlWebService('SP', 'NfeConsultaCadastro4', 'producao'),
  'https://nfe.fazenda.sp.gov.br/ws/cadconsultacadastro4.asmx', 'SP ConsultaCadastro produção');
eq(urlWebService('BA', 'NFeStatusServico4', 'producao'),
  'https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx', 'BA StatusServico produção');
eq(urlWebService('MG', 'NFeRecepcaoEvento4', 'producao'),
  'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4', 'MG RecepcaoEvento produção');
eq(urlWebService('PR', 'NFeAutorizacao4', 'producao'),
  'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4?wsdl', 'PR NFeAutorizacao4 produção (?wsdl)');

// ── SVRS: RJ herda os endpoints SVRS; cadastro em host dedicado ─
eq(urlWebService('RJ', 'NFeAutorizacao4', 'producao'),
  'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx', 'RJ (SVRS) NFeAutorizacao4 produção');
eq(urlWebService('RJ', 'NfeConsultaCadastro4', 'producao'),
  'https://cad.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx', 'RJ (SVRS) ConsultaCadastro usa cad.svrs');

// ── RS próprio vs SVRS: ConsultaCadastro do RS também aponta para cad.svrs ─
eq(urlWebService('RS', 'NfeConsultaCadastro4', 'producao'),
  'https://cad.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx', 'RS ConsultaCadastro usa cad.svrs');

// ── Homologação ─────────────────────────────────────────────
eq(urlWebService('SP', 'NFeAutorizacao4', 'homologacao'),
  'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx', 'SP NFeAutorizacao4 homologação');
eq(urlWebService('RJ', 'NFeAutorizacao4', 'homologacao'),
  'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx', 'RJ (SVRS) homologação');

// ── Serviço nacional: DistribuicaoDFe é AN independentemente da UF ─
eq(urlWebService('SP', 'NFeDistribuicaoDFe', 'producao'),
  'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx', 'DistribuicaoDFe (AN) produção');
eq(urlWebService('AM', 'NFeDistribuicaoDFe', 'homologacao'),
  'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx', 'DistribuicaoDFe funciona mesmo p/ UF não mapeada');

// ── SVAN não expõe ConsultaCadastro ─────────────────────────
eq(urlWebService('MA', 'NfeConsultaCadastro4', 'producao'), null, 'SVAN (MA) não tem ConsultaCadastro');
ok(urlWebService('MA', 'NFeAutorizacao4', 'producao')!.includes('sefazvirtual.fazenda.gov.br'), 'MA (SVAN) autoriza na sefazvirtual');

// ── UF não mapeada devolve null nos serviços estaduais ──────
eq(urlWebService('AM', 'NFeAutorizacao4', 'producao'), null, 'AM (lacuna) → null em serviço estadual');

// ── Contingência acessível diretamente por autorizador ──────
eq(urlPorAutorizador('SVCAN', 'NFeAutorizacao4', 'producao'),
  'https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx', 'SVC-AN (contingência) NFeAutorizacao4');

// ── Cobertura: cada autorizador estadual expõe os 7 serviços em produção ─
const SERVICOS_ESTADUAIS = ['NFeAutorizacao4', 'NFeRetAutorizacao4', 'NFeStatusServico4', 'NFeConsultaProtocolo4', 'NFeInutilizacao4', 'NfeConsultaCadastro4', 'NFeRecepcaoEvento4'] as const;
for (const aut of ['SP', 'MG', 'RS', 'PR', 'BA', 'SVRS'] as const) {
  const faltando = SERVICOS_ESTADUAIS.filter(s => !urlPorAutorizador(aut, s, 'producao'));
  ok(faltando.length === 0, `${aut}: expõe os 7 serviços em produção${faltando.length ? ' (faltam: ' + faltando.join(', ') + ')' : ''}`);
}

console.log(`\n${pass} asserções passaram, ${fail} falharam.`);
if (fail > 0) process.exit(1);
