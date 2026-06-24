# Estudo do Alterdata Pack — Visão Geral e Lógica para o Bear-ERP

> Engenharia reversa da lógica do **Alterdata Pack (edição Student/Community, interface "Diamond")**
> a partir da documentação oficial (Contábil 211 tópicos, Fiscal 536, Folha/DP 550, Integração 51 = ~49 mil linhas).
> Objetivo: **entender a lógica para reimplementar no Bear-ERP.**
> Data do estudo: 2026-06-18.

## Documentos deste estudo
- `00-VISAO-GERAL.md` — este arquivo (arquitetura que costura tudo)
- `01-contabil.md` — núcleo contábil (WCont)
- `02-fiscal.md` — escrita fiscal e impostos (WFiscal)
- `03-folha-dp.md` — folha de pagamento / departamento pessoal (WDP)
- `04-integracao.md` — integração entre módulos + layouts de arquivo exatos

---

## 1. O que é o Alterdata Pack

Suite **contábil de escritório** (multiempresa, multiusuário), feita em **Delphi** sobre **PostgreSQL/SQL**, com um lançador central em **Chromium/CEF** (o "WPHD"). Não é um ERP de faturamento — é o sistema que o **contador** usa para escriturar, apurar impostos, rodar folha e gerar obrigações acessórias (SPED, Sintegra, eSocial, etc.).

Módulos: **WCont** (Contabilidade, o hub), **WFiscal** (Escrita Fiscal), **WDP** (Folha/DP), **WAtivo** (Ativo Imobilizado), **WCiap** (CIAP), além de Financeiro/Cobrança, Guias, Condomínio, Locação.

---

## 2. Os 7 padrões arquiteturais que se repetem em TODO o sistema

Estes são os conceitos que, se o Bear-ERP adotar, replicam a "lógica Alterdata":

### Padrão 1 — Arquitetura Hub-and-Spoke, com a Contabilidade no centro
Todos os módulos convergem para o **WCont**. Fiscal, Folha, Ativo e Financeiro são *spokes* que **alimentam lançamentos contábeis** no hub. A regra de ouro (do manual de integração):

> Um lançamento contábil precisa de **data, valor, conta devedora, conta credora e histórico**.
> O módulo de origem (Fiscal/Folha/Ativo) fornece só **data + valor**.
> A Contabilidade fornece **conta débito + conta crédito + histórico** via *Lançamento Automático*.

➡️ **No Bear-ERP:** separe "evento de negócio" de "regra de contabilização". O módulo que gera o fato econômico só emite `(origem, data, valor, dimensões)`; uma camada de regras converte isso em partida dobrada.

### Padrão 2 — "Código de Chamada" como chave natural universal
Toda entidade mestre (conta contábil, centro de custo, histórico padrão, lançamento automático, evento de folha, CFOP) tem um **código curto** ("código de chamada") que é usado em **toda** entrada de dados, importação e fórmula — distinto do `id` interno e da classificação hierárquica.

➡️ **No Bear-ERP:** use `id` surrogate como PK real, mas mantenha `codigo_chamada` como **chave natural única e indexada** por entidade. É o que torna importação/integração viáveis. Para integrar com sistemas de planos diferentes, há ainda o **"Chamada Externa"** (mapa código-interno → código-no-outro-sistema).

### Padrão 3 — O "Lançamento Automático" (regra de contabilização parametrizável)
É a peça central da integração: amarra `código → (conta débito, conta crédito, histórico, rateio de CC)`. Cada evento de negócio referencia um código; o sistema resolve a partida dobrada. Variações importantes:
- **Apropriação / Pagamento / Estorno**: um mesmo evento tem até 3 códigos (provisão por competência, baixa por caixa, e o contralançamento que zera a provisão).
- **Padrão x Personalizado**: regra global vs. override por empresa/departamento (o específico tem prioridade).

➡️ **No Bear-ERP:** tabela `lancamento_automatico(codigo, conta_deb, conta_cred, historico_id, cc_deb, cc_cred)` + resolução por prioridade (específico→padrão) + tripla apropriação/pagamento/estorno.

### Padrão 4 — Histórico Padrão com complemento dinâmico
Texto reutilizável + complemento preenchido por variáveis no momento do lançamento (ex.: Fiscal acrescenta nº da NF e nome do cliente; Folha acrescenta `NMFUNC`, `CODFUNC`, `NRCPF` e a referência da competência).

➡️ **No Bear-ERP:** `historico_padrao(codigo, texto, tem_complemento, template)` com motor de variáveis.

### Padrão 5 — Versionamento por vigência / competência
Quase tudo que muda no tempo é **versionado**: tabelas de INSS/IRRF/salário-família por mês de referência; alíquotas e incidências de CFOP por ano; configurações estaduais/federais por ano; bases de cálculo da folha por vigência.

➡️ **No Bear-ERP:** **não** guarde alíquotas/regras hardcoded. Modele como **dados com `vigencia_inicio/fim`**. Toda apuração lê a regra vigente na data do fato.

### Padrão 6 — Saldos materializados + recálculo idempotente
A contabilidade mantém **saldos agregados** (por conta/dia/centro de custo) atualizados na "liberação do lote". Para corrigir divergências existem rotinas de **Alinhamento de Saldos** (recálculo a partir do movimento) e **Análise Crítica** (detecta saldo invertido com histórico de inversões). Vários utilitários do Alterdata existem só para corrigir inconsistências — sinal de fragilidade do modelo materializado original.

➡️ **No Bear-ERP:** mantenha saldos materializados, mas com **integridade transacional desde o início** e um job de recálculo idempotente `recalcular_saldos(empresa, conta?, data?)`. Isso elimina a maioria das "ferramentas de manutenção" que o Alterdata precisou criar.

### Padrão 7 — Motor de fórmulas interpretadas (em DOIS lugares)
- Na **Contabilidade**: fórmulas de demonstrativos (DRE, Balanço) com `SD` (saldo), `MV` (movimento), `ST`, `TG`, constantes e consolidação multi-empresa.
- Na **Folha**: linguagem de fórmulas por evento (variáveis, intervalos `..`, condicionais `SE`, aplicação em tabela `/TI`, `/TR`, médias `MV/MQ`, aritmética **saturada não-negativa**), uma fórmula por tipo de processo.

➡️ **No Bear-ERP:** vale construir **um interpretador de expressões reutilizável** (lexer→parser→AST→evaluator). É o que dá a flexibilidade legal do sistema sem recompilar.

---

## 3. Mapa de integração (hub-and-spoke)

```
        WFiscal ─┐  (NF, ICMS/IPI/PIS/COFINS/ISS, duplicatas)
        WDP ─────┤  (folha: apropriação/pagamento, rateio CC)   arquivo .txt
        WAtivo ──┼──────────────────────────────────────────►  W C O N T  (hub)
        Financeiro┤ (honorários: apropriação/pagamento/estorno)   = partida
        Condomínio┘  (layout configurável, via "Chamada Externa")    dobrada
                                                                       │
                                                                       ▼
                                                    Balancete / Razão / Diário /
                                                    DRE / Balanço / SPED ECD
```

A troca **não** é via banco compartilhado nem API — é por **arquivos-texto** (um exporta, outro importa), com marcação "EXPORTADO" antiduplicidade. Os layouts exatos (posições e tamanhos de campo) estão em `04-integracao.md`.

---

## 4. Como o Bear-ERP pode se relacionar com o Alterdata

Três cenários possíveis (não excludentes):

1. **Bear-ERP alimenta a contabilidade Alterdata** (mais provável a curto prazo):
   o Bear-ERP gera um arquivo `.txt` no layout que o WCont importa. Recomendado: o
   **"Layout de Importação Personalizado" (TXT/XLS, 10 colunas A–J)** ou o
   **"Sistemas Específicos Modelo 2"** (delimitado por vírgula+aspas). Detalhes em `04-integracao.md §5`.

2. **Bear-ERP reimplementa a lógica internamente** (médio/longo prazo):
   adotar os 7 padrões acima como base do próprio motor contábil/fiscal/folha.

3. **Bear-ERP consome dados do Alterdata** (ex.: exportações do WCont para "outro sistema").

Pré-requisito comum a (1) e (3): uma tabela de-para `conta_bear → codigo_chamada_wcont`
(e idem para centros de custo) — sem isso nenhum arquivo é válido.

---

## 5. Resumo do modelo de dados (núcleo a recriar)

| Área | Entidades centrais |
|---|---|
| **Contábil** | plano_contas, conta_contabil (código de chamada + classificação), lote, lancamento + lancamento_partida (4 fórmulas, Σdéb=Σcréd), historico_padrao, lancamento_automatico, centro_custo, rateio, saldo_conta (materializado), trava_contabil |
| **Fiscal** | empresa (+config por vigência), cfop + cfop_incidencia (liga/desliga tributo), produto (NCM/CST), documento_fiscal + documento_imposto + documento_item, apuracao mensal, ajuste_apuracao |
| **Folha** | empresa, departamento, funcionario (+histórico salarial), dependente, evento + evento_formula (por processo) + evento_incidencia (N:N tributo), tabelas fiscais por referência (INSS/IRRF/sal-família), movimento, processo + processo_evento |
| **Integração** | lancamento_automatico, historico_padrao, mapa_conta_externa, regra_por_empresa_depto, lote com status EXPORTADO/IMPORTADO/LIBERADO |

Detalhes de campos, relacionamentos, regras de cálculo e DDL sugerido estão nos 4 documentos por área.

---

## 6. Recomendações estratégicas (prioridade)

1. **Comece pelo núcleo contábil de partida dobrada** (`lancamento_partida` desde o início, validação Σdéb=Σcréd, saldos materializados + recálculo). É a fundação de tudo.
2. **Modele o "Lançamento Automático" cedo** — é o que permite Fiscal/Folha/Financeiro plugarem na contabilidade sem acoplamento.
3. **Tudo versionado por vigência** (regras tributárias e de folha como dados, não código).
4. **Construa o interpretador de fórmulas** uma vez, reutilize em demonstrativos e folha.
5. **Camada de obrigações acessórias desacoplada** (cada layout = um mapeador sobre uma view canônica).
6. Para integrar **com** o Alterdata agora, implemente o **exporter de TXT** (layout Personalizado ou Modelo 2) — é entrega rápida e de valor imediato.
