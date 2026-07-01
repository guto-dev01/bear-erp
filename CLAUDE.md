# Bear ERP — Workflow de Conformidade Fiscal e Folha (2026)

> Backend vivo = **Appwrite Functions** (`functions/`) + **Angular** (`frontend-angular/`).
> O Java em `backend/microservices/` é **scaffolding sem tráfego** — IGNORAR.
> Branch de trabalho: `feat/conformidade-fiscal-2026`.

## Regras do workflow
- **TDD obrigatório.** A árvore de features tem **0 `.spec.ts`** hoje. Toda correção entra
  com teste rodando em `ng test` (Karma/Jasmine já configurado em `angular.json:69`).
- **Não quebrar o motor que já funciona:** `engine/motor-tributario.ts`, `engine/apuracao-*.ts`,
  `engine/sped.ts`, `engine/guias.ts` (cobertos por `scripts/test-*.ts`, 198 asserções node).
- **Markdown primeiro:** propor diff + `.spec.ts` em markdown; só escrever código após OK **por tarefa**.
- **Versionar regra como dado** (Padrão 5 do estudo Alterdata): alíquotas/limites por vigência,
  não hardcoded.
- Uma branch por bloco; commit só quando solicitado.

---

## SPRINT 0 — Ops (você roda; pré-requisito ambiental, sem código)

| Tarefa | O quê | Aceite | Esforço |
|---|---|---|---|
| **P0.0** Destravar emissão NF-e | Rodar `scripts/deploy-nfe-transmissao.js` (publica o dispatcher `fiscal-cofre` no slot `ocr-cadastro` — reuso deliberado, não é bug); subir A1 real no cofre; homologar Autorização + Status na SEFAZ-homologação | 1 NF-e de teste autorizada ponta-a-ponta na SEFAZ-homolog | ~1–2 dias (env) |

---

## SPRINT 1 — P0 (bloqueadores de código)

| # | Tarefa | Arquivos | Aceite | Esforço |
|---|---|---|---|---|
| **1** | **P0.3 — IRRF reformado na folha** *(VIGENTE; bootstrap do harness de teste/CI)* | `folha-calc.ts` (+ `folha-calc.spec.ts` novo) | R$5.000 → IRRF 0; faixa 5.000,01–7.350 → redutor decrescente; >7.350 → tabela normal; dividendos >50k/mês → 10%; casos em `.spec.ts` verdes | Médio (1–2 d) |
| **2** | **P0.1 — IBS/CBS + IS no XML do DF-e** *(PRAZO DURO 03/08/2026)* | `motor-tributario.ts` (calc), `nfe-xml.ts` (grupos `gIBSCBS`/`IS` + total), `fiscal.types.ts` | NF-e passa na validação de leiaute NT 2025.002 com `gIBSCBS` (IBS 0,1% + CBS 0,9% = teste 1%), `cClassTrib` e grupo `IS` presentes; não rejeitada por campo ausente; round-trip do `scripts/test-nfe-xml.ts` segue verde | Alto (3–5 d) |
| **3** | **P0.2 — Tela NF-e usa o motor** | `nfe.component.ts`, cadastro de produto (`produtos.component.ts`) | Item adicionado na tela passa por `calcularDocumento`; perfil fiscal (alíq/CST/MVA) capturado no produto; nota emitida usa valores do motor, não `cfop:'5102'/cst:'00'/aliq:18` fixos | Médio (2–3 d) |

**Por que P0.3 primeiro:** é self-contained (função pura em `folha-calc.ts`), erra **toda** folha mensal
agora, e estabelece o **primeiro `.spec.ts` + CI** que o P0.1 vai reusar. P0.1 (deadline 03/08) é a tarefa 2;
P0.0 corre em paralelo como trilha de ops.

### Progresso
- ✅ **Tarefa 1 (P0.3)** — `calcularIrrf` (redutor oficial 978,62 − 0,133145×R, cap no apurado, simplificado 607,20,
  reuso no 13º) + `calcularIrrfDividendos` (10% sobre o total, flag `reterSimples`). `folha-calc.spec.ts`.
  Verificado: 13/13 asserções (Node, pois `ng test` exige Chrome — ausente neste ambiente). Callers compatíveis.
- 🟡 **Tarefa 2 (P0.1)** — **Parte A (motor) FEITA**: campos IBS/CBS/IS em `ConfigTributariaItem`/`ResultadoItem`/
  `TotaisDocumento` + `calcularIbsCbs` (fase-teste IBS 0,1% + CBS 0,9%, `ALIQUOTAS_REFORMA_2026`), híbrido (não soma ao
  vNF). `motor-tributario.reforma.spec.ts`: 8/8 + 161/161 de regressão (engines existentes).
  ⚠️ split `ibsUf 0,1 / ibsMun 0` é **provisório** (palpite) — confirmar contra a tabela oficial junto da Parte B.
- ✅ **Tarefa 3 (P0.2)** — **Parte 1:** mapeador puro `montarEmissaoNfe` (`fiscal.types.ts`) + `emitirNfeDoForm`
  (`fiscal.service.ts`); `nfe.component.salvar()` agora roda o motor em vez da heurística (`createNfe` @deprecated).
  `fiscal.emissao.spec.ts` (7 casos, incl. end-to-end ICMS interestadual 120 ≠ heurística 180). **Parte 2:** aba
  Fiscal do produto captura o perfil completo (CST/CSOSN/alíq/MVA/FCP/IPI/PIS/COFINS/ISS) — schema já provisionado
  (Fase 2). Type-check app+spec limpo (`tsc -p tsconfig.app|spec.json`).
- 👤 **P0.0 (ops)** — com o usuário (deploy dispatcher + A1 no cofre + homologação SEFAZ).
- ⛔ **Parte B do P0.1 (serialização `<IBSCBS>`/`<IBSCBSTot>` no XML) está BLOQUEADA NO P0.0 — NÃO em "colar leiaute".**
  O leiaute não se cola em chat: é um pacote de XSDs + tabelas, já PUBLICADO no Portal Nacional NF-e → Documentos →
  Esquemas XML (Pacote de Liberação **~v1.36**, não 1.20) + Tabela CST/cClassTrib em Documentos → Diversos. A Parte B
  se constrói contra esse XSD e se VALIDA na homologação SEFAZ (o próprio P0.0). Serializar antes é às cegas.
  **Para sessões futuras: NÃO pedir o leiaute ao usuário — baixar o XSD do Portal e validar em homologação.**

---

## SPRINT 2 — P1 (alta prioridade)

| Tarefa | Arquivos | Esforço |
|---|---|---|
| ✅ **P1.1** Trava contábil Σdéb = Σcréd + preserva N partidas — FEITA. Módulo puro `contabilidade-partidas.ts` (`validarPartidas` rejeita na ESCRITA com tolerância < 1 centavo; `montarPersistenciaPartidas` grava todas as partidas em JSON, não trunca). `createLancamento`/`buildLancamentoPayload`/`mapLancamento` ligados; erro da trava aparece no snackbar. `contabilidade-partidas.spec.ts` (node 7/7 + tsc app/spec). **⚠️ GATE: rodar `node scripts/appwrite-setup.js` p/ provisionar a coluna `partidas` — sem isso TODO save de lançamento falha (atributo desconhecido).** | `contabilidade-partidas.ts`, `contabilidade.service.ts`, `appwrite-setup.js:159` | Médio (1–2 d) |
| 🟡 **P1.2** Eventos NF-e — **core offline FEITO**: builders puros `eventos.js` (cancelamento 110111, CC-e 110110, inutilização) + assinatura genérica `assinarElemento` (infEvento/infInut) + envelopes `envEvento`/RecepcaoEvento4/Inutilizacao4. `nfe-eventos.test.js` (node --test 8/8, incl. assinatura criptográfica; 0 regressão nos 19 NF-e). **Falta (valida na homologação SEFAZ = P0.0):** orquestradores em `transmissao.js` (cofre→assina→envelope→SOAP→parse), parsers em `respostas.js`, operações no `index.js`, wiring no `fiscal.service.ts`. | `functions/_shared/nfe/`, `index.js`, `fiscal.service.ts` | Médio-Alto (3–5 d) |
| 🟡 **P1.3** Folha patronal — **engine FEITA**: `folha-patronal.ts` (`calcularInssPatronal` 20% SEM teto; `ratEfetivo` RAT×FAP; `calcularEncargosPatronais` INSS+RAT+terceiros; flag `recolhePatronal` p/ Simples). `folha-patronal.spec.ts` (node 5/5 + tsc). Schema `empresas` += `rat/fap/codFpas/aliqTerceiros` (**gate: rodar `appwrite-setup.js`**). **Falta wiring:** form da empresa capturar FAP/RAT/terceiros + agregação por competência + feed S-1200/DCTFWeb. | `folha-patronal.ts`, `appwrite-setup.js`, `empresa`/`holerites` (wiring) | Médio (2–3 d) |
| **P1.4** Wiring eSocial: forms S-1000/1010/1200/2200/2299/1299 + totalizadores S-5xxx (montadores já existem/testados no backend) | `esocial.component.ts`, `functions/_shared/esocial/` | Alto (5–8 d) |
| **P1.5** Ativar `regras_tributarias` (hoje código morto, `fiscal.types.ts:176`): NCM/CFOP/CST parametrizáveis por vigência | `fiscal.service.ts`, `fiscal.types.ts`, `motor-tributario.ts` | Alto (4–6 d) |
| 🟡 **P1.6** Código referencial RFB — **gerador FEITO**: `EcdConta.codCtaRef` + registro **I051** em `ecd-sped.generator.ts` (`contabilidade-ecd.spec.ts`, node + tsc). Schema `plano_contas += codCtaRef` (**gate: `appwrite-setup.js`**). **Falta wiring:** form do plano capturar `codCtaRef` + `montarDadosEcd` repassar. | `ecd-sped.generator.ts`, `appwrite-setup.js`, plano-contas (form/wiring) | Médio (2–3 d) |
| **P1.7** *Confirmar* (não construir) handshake TLS eSocial em homologação (RSA-SHA256 + Sectigo 2026 já atende) | `functions/_shared/soap/truststore-sectigo.js` | Pequeno (0,5–1 d) |
| ✅ **P1.8** `consumidorFinal` capturado no form de NF-e (checkbox) + `aliqInternaDestino` no item → **DIFAL destravado** na tela. `montarEmissaoNfe` lê `consumidorFinal` (era chumbado `false`). Teste em `fiscal.emissao.spec.ts`: SP→RJ consumidor final não-contribuinte → DIFAL 80; sem a flag → 0. Node + tsc app/spec verdes. | `nfe.component.ts`, `fiscal.types.ts` | Pequeno (0,5–1 d) |

---

## SPRINT 3+ — P2 (sequenciar depois)

DCTFWeb (API Integra Contador/SERPRO) · FGTS Digital via PIX (guia + QR) · EFD-Reinf ·
SPED Layout 020 híbrido (VL_DOC do C100 sem IBS/CBS) · ECF real (e-LALUR/e-LACS) ·
NFC-e / CT-e / MDF-e · mecânica real de split payment · PAA (prod ago/26) ·
validador PVA · ponte apuração→DARF · conciliação documento↔lançamento.

---

## Estado confirmado (auditoria 2026-06-30) — não re-auditar
✅ Motor tributário (ICMS/ST/DIFAL/IPI/PIS/COFINS/ISS) · apurações · SPED Fiscal/Contrib/ECD ·
NF-e mod.55 (XML 4.00 + XML-DSig A1 + mTLS) · eSocial backend (13 eventos, RSA-SHA256, Sectigo 2026).
❌ Reforma 2026 nos DF-e (IBS/CBS/IS) · IRRF reformado na folha · trava partida dobrada ·
eventos NF-e · folha patronal · DCTFWeb/Reinf/FGTS-Digital · ECF real.
