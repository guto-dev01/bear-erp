'use strict';

/**
 * Gera um certificado A1 autoassinado de TESTE (.pfx) para desenvolvimento
 * em produção restrita. NUNCA usar em produção nem com dados reais.
 *
 * Uso:
 *   node scripts/gen-test-cert.js [saida.pfx] [senha] ["NOME:CNPJ"]
 *
 * Exemplo:
 *   node scripts/gen-test-cert.js ./cert-teste.pfx teste123 "EMPRESA TESTE LTDA:12345678000199"
 *
 * O arquivo gerado está no .gitignore (*.pfx) — não será versionado.
 */

const fs = require('fs');
const path = require('path');
const { gerarPfxTeste } = require('../functions/_shared/__tests__/helpers/gera-pfx');

const saida = process.argv[2] || path.resolve(process.cwd(), 'cert-teste.pfx');
const senha = process.argv[3] || 'teste123';
const cn = process.argv[4] || 'EMPRESA TESTE LTDA:12345678000199';

const { pfx } = gerarPfxTeste({ senha, cn, diasValidade: 365 });
fs.writeFileSync(saida, pfx);

console.log('✓ Certificado de TESTE gerado (não use em produção):');
console.log(`  arquivo : ${saida}`);
console.log(`  senha   : ${senha}`);
console.log(`  titular : ${cn}`);
console.log('\nEnvie ao cofre (Appwrite Storage) e configure a senha em env:');
console.log('  CERT_SENHA_<EMPRESAID> ou CERT_SENHA');
