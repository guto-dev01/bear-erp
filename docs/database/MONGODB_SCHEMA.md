# Bear ERP — Modelagem MongoDB

## Estratégia Multi-Tenant
Todos os documentos possuem `tenantId` e `empresaId` como campos obrigatórios.
Índices compostos `{ tenantId: 1, empresaId: 1, ... }` em todas as coleções.

---

## 1. CORE (15 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 1 | tenants | Escritórios contábeis (tenant raiz) |
| 2 | tenant_configs | Configurações por tenant |
| 3 | tenant_planos | Planos de assinatura do tenant |
| 4 | offices | Filiais do escritório |
| 5 | empresas | Empresas clientes |
| 6 | empresa_configs | Configurações por empresa |
| 7 | usuarios | Usuários do sistema |
| 8 | usuario_sessions | Sessões ativas |
| 9 | roles | Papéis de acesso |
| 10 | permissoes | Permissões granulares |
| 11 | role_permissoes | Associação role ↔ permissão |
| 12 | audit_logs | Logs de auditoria imutáveis |
| 13 | audit_log_hashes | Hash chain para integridade |
| 14 | notifications | Notificações do sistema |
| 15 | notification_preferences | Preferências de notificação |

## 2. CADASTROS — Clientes (12 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 16 | clientes | Cadastro de clientes |
| 17 | clientes_contatos | Contatos do cliente |
| 18 | clientes_enderecos | Endereços do cliente |
| 19 | clientes_documentos | Documentos anexos |
| 20 | clientes_historico | Histórico de alterações |
| 21 | clientes_categorias | Categorias de clientes |
| 22 | clientes_credito | Análise de crédito |
| 23 | clientes_contratos | Contratos com clientes |
| 24 | clientes_observacoes | Observações internas |
| 25 | clientes_tags | Tags para classificação |
| 26 | clientes_grupos | Grupos de clientes |
| 27 | clientes_limites_credito | Limites de crédito |

## 3. CADASTROS — Fornecedores (10 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 28 | fornecedores | Cadastro de fornecedores |
| 29 | fornecedores_contatos | Contatos do fornecedor |
| 30 | fornecedores_enderecos | Endereços do fornecedor |
| 31 | fornecedores_documentos | Documentos anexos |
| 32 | fornecedores_historico | Histórico de alterações |
| 33 | fornecedores_categorias | Categorias de fornecedores |
| 34 | fornecedores_avaliacoes | Avaliação de fornecedores |
| 35 | fornecedores_contratos | Contratos com fornecedores |
| 36 | fornecedores_produtos | Produtos por fornecedor |
| 37 | fornecedores_pagamentos_config | Config de pagamento |

## 4. PRODUTOS E SERVIÇOS (15 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 38 | produtos | Cadastro de produtos |
| 39 | produtos_categorias | Categorias de produtos |
| 40 | produtos_precos | Tabelas de preços |
| 41 | produtos_estoque | Controle de estoque |
| 42 | produtos_movimentacoes | Movimentações de estoque |
| 43 | produtos_ncm | NCM dos produtos |
| 44 | produtos_cest | CEST dos produtos |
| 45 | produtos_tributacao | Tributação por produto |
| 46 | produtos_imagens | Imagens do produto |
| 47 | produtos_composicao | Composição (kit/combo) |
| 48 | servicos | Cadastro de serviços |
| 49 | servicos_categorias | Categorias de serviços |
| 50 | servicos_precos | Tabelas de preços de serviços |
| 51 | servicos_tributacao | Tributação por serviço |
| 52 | unidades_medida | Unidades de medida |

## 5. FINANCEIRO — Contas a Pagar (12 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 53 | contas_pagar | Títulos a pagar |
| 54 | contas_pagar_parcelas | Parcelas de contas a pagar |
| 55 | contas_pagar_pagamentos | Pagamentos realizados |
| 56 | contas_pagar_renegociacoes | Renegociações |
| 57 | contas_pagar_aprovacoes | Workflow de aprovação |
| 58 | contas_pagar_categorias | Categorias de despesa |
| 59 | contas_pagar_centros_custo | Centro de custo |
| 60 | contas_pagar_rateios | Rateios por centro de custo |
| 61 | contas_pagar_recorrentes | Contas recorrentes |
| 62 | contas_pagar_anexos | Comprovantes anexos |
| 63 | contas_pagar_historico | Histórico de alterações |
| 64 | contas_pagar_lotes | Lotes de pagamento |

## 6. FINANCEIRO — Contas a Receber (12 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 65 | contas_receber | Títulos a receber |
| 66 | contas_receber_parcelas | Parcelas |
| 67 | contas_receber_recebimentos | Recebimentos realizados |
| 68 | contas_receber_renegociacoes | Renegociações |
| 69 | contas_receber_boletos | Boletos gerados |
| 70 | contas_receber_pix | Cobranças PIX |
| 71 | contas_receber_cartao | Recebimentos em cartão |
| 72 | contas_receber_categorias | Categorias de receita |
| 73 | contas_receber_recorrentes | Receitas recorrentes |
| 74 | contas_receber_anexos | Comprovantes |
| 75 | contas_receber_historico | Histórico |
| 76 | contas_receber_inadimplencia | Controle de inadimplência |

## 7. FINANCEIRO — Bancos e Caixa (15 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 77 | bancos | Cadastro de bancos |
| 78 | contas_bancarias | Contas bancárias |
| 79 | transacoes_bancarias | Extrato/transações |
| 80 | conciliacoes_bancarias | Conciliações |
| 81 | conciliacoes_itens | Itens da conciliação |
| 82 | transferencias_bancarias | Transferências entre contas |
| 83 | caixas | Caixas da empresa |
| 84 | caixa_movimentacoes | Movimentações de caixa |
| 85 | caixa_fechamentos | Fechamentos de caixa |
| 86 | fluxo_caixa | Fluxo de caixa |
| 87 | fluxo_caixa_projecoes | Projeções de fluxo |
| 88 | cheques_emitidos | Cheques emitidos |
| 89 | cheques_recebidos | Cheques recebidos |
| 90 | cartoes_corporativos | Cartões corporativos |
| 91 | cartoes_transacoes | Transações de cartão |

## 8. CONTABILIDADE — Plano de Contas (10 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 92 | plano_contas | Plano de contas |
| 93 | plano_contas_modelos | Modelos padrão de plano de contas |
| 94 | contas_contabeis | Contas contábeis ativas |
| 95 | contas_contabeis_historico | Histórico de alterações |
| 96 | centros_custo | Centros de custo |
| 97 | centros_resultado | Centros de resultado |
| 98 | projetos_contabeis | Projetos contábeis |
| 99 | plano_contas_referencial | Plano referencial (SPED) |
| 100 | de_para_contas | De/Para entre planos |
| 101 | grupo_contas | Agrupamento de contas |

## 9. CONTABILIDADE — Lançamentos (12 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 102 | lancamentos_contabeis | Lançamentos contábeis |
| 103 | lancamentos_partidas | Partidas (débito/crédito) |
| 104 | lancamentos_lotes | Lotes de lançamento |
| 105 | lancamentos_modelos | Modelos de lançamento |
| 106 | lancamentos_recorrentes | Lançamentos recorrentes |
| 107 | lancamentos_provisoes | Provisões contábeis |
| 108 | lancamentos_estornos | Estornos |
| 109 | lancamentos_importacoes | Importações de lançamentos |
| 110 | lancamentos_aprovacoes | Workflow de aprovação |
| 111 | lancamentos_historico_padrao | Históricos padrão |
| 112 | lancamentos_anexos | Documentos comprobatórios |
| 113 | lancamentos_rateios | Rateios por centro de custo |

## 10. CONTABILIDADE — Demonstrações (12 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 114 | balancetes | Balancetes mensais |
| 115 | balancetes_contas | Detalhamento do balancete |
| 116 | dre | Demonstração de resultado |
| 117 | dre_contas | Detalhamento da DRE |
| 118 | balanco_patrimonial | Balanço patrimonial |
| 119 | balanco_patrimonial_contas | Detalhamento do balanço |
| 120 | dmpl | Dem. mutações patrimônio líquido |
| 121 | dfc | Dem. fluxo de caixa (contábil) |
| 122 | dva | Dem. valor adicionado |
| 123 | notas_explicativas | Notas explicativas |
| 124 | livro_diario | Livro diário |
| 125 | livro_razao | Livro razão |

## 11. CONTABILIDADE — Encerramento (8 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 126 | periodos_contabeis | Períodos contábeis |
| 127 | encerramento_exercicio | Encerramento anual |
| 128 | encerramento_mensal | Fechamento mensal |
| 129 | apuracao_resultado | Apuração de resultado |
| 130 | depreciacao_bens | Depreciação de bens |
| 131 | amortizacao | Amortização |
| 132 | patrimonio_ativo | Ativo imobilizado |
| 133 | patrimonio_baixas | Baixas de ativo |

## 12. FISCAL — NF-e (12 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 134 | nfe | Notas fiscais eletrônicas |
| 135 | nfe_itens | Itens da NF-e |
| 136 | nfe_xml | XMLs da NF-e |
| 137 | nfe_eventos | Eventos (cancelamento, CCe) |
| 138 | nfe_inutilizacoes | Inutilização de numeração |
| 139 | nfe_danfe | DANFEs gerados |
| 140 | nfe_manifestacoes | Manifestações do destinatário |
| 141 | nfe_importacoes | NF-e importadas (entrada) |
| 142 | nfe_contingencia | Registros de contingência |
| 143 | nfe_lotes | Lotes de envio |
| 144 | nfe_certificados | Certificados digitais |
| 145 | nfe_configuracoes | Config por empresa |

## 13. FISCAL — NFS-e (8 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 146 | nfse | Notas fiscais de serviço |
| 147 | nfse_itens | Itens da NFS-e |
| 148 | nfse_xml | XMLs da NFS-e |
| 149 | nfse_eventos | Eventos (cancelamento) |
| 150 | nfse_rps | RPS gerados |
| 151 | nfse_lotes | Lotes de envio |
| 152 | nfse_prefeituras | Config por prefeitura |
| 153 | nfse_configuracoes | Config por empresa |

## 14. FISCAL — CT-e / MDF-e (8 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 154 | cte | Conhecimento transporte |
| 155 | cte_itens | Itens do CT-e |
| 156 | cte_xml | XMLs do CT-e |
| 157 | cte_eventos | Eventos do CT-e |
| 158 | mdfe | Manifesto eletrônico |
| 159 | mdfe_xml | XMLs do MDF-e |
| 160 | mdfe_eventos | Eventos do MDF-e |
| 161 | mdfe_encerramento | Encerramentos MDF-e |

## 15. FISCAL — Apurações de Impostos (20 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 162 | icms_apuracoes | Apuração ICMS mensal |
| 163 | icms_creditos | Créditos de ICMS |
| 164 | icms_debitos | Débitos de ICMS |
| 165 | icms_st_apuracoes | Apuração ICMS-ST |
| 166 | icms_difal | Diferencial de alíquota |
| 167 | pis_apuracoes | Apuração PIS |
| 168 | pis_creditos | Créditos de PIS |
| 169 | cofins_apuracoes | Apuração COFINS |
| 170 | cofins_creditos | Créditos de COFINS |
| 171 | ipi_apuracoes | Apuração IPI |
| 172 | ipi_creditos | Créditos de IPI |
| 173 | iss_apuracoes | Apuração ISS |
| 174 | irpj_apuracoes | Apuração IRPJ |
| 175 | csll_apuracoes | Apuração CSLL |
| 176 | irrf_apuracoes | Apuração IRRF |
| 177 | inss_apuracoes | Apuração INSS patronal |
| 178 | guias_recolhimento | Guias de recolhimento |
| 179 | guias_pagamentos | Pagamentos de guias |
| 180 | calendario_fiscal | Calendário de obrigações |
| 181 | aliquotas_impostos | Tabela de alíquotas |

## 16. TRIBUTÁRIO — Simples Nacional (8 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 182 | simples_apuracoes | Apuração mensal SN |
| 183 | simples_das | DAS gerados |
| 184 | simples_faturamento | Faturamento 12 meses |
| 185 | simples_anexos | Enquadramento por anexo |
| 186 | simples_sublimites | Controle sublimites |
| 187 | simples_exclusao | Controle exclusão |
| 188 | simples_parcelamento | Parcelamentos |
| 189 | simples_defis | DEFIS anual |

## 17. TRIBUTÁRIO — Lucro Presumido (6 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 190 | lp_apuracoes | Apuração trimestral |
| 191 | lp_receitas | Receitas por atividade |
| 192 | lp_presuncao | Percentuais de presunção |
| 193 | lp_irpj | Cálculo IRPJ |
| 194 | lp_csll | Cálculo CSLL |
| 195 | lp_adicional_ir | Adicional de IR |

## 18. TRIBUTÁRIO — Lucro Real (10 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 196 | lr_lalur | LALUR (parte A e B) |
| 197 | lr_lacs | LACS |
| 198 | lr_adicoes | Adições ao lucro real |
| 199 | lr_exclusoes | Exclusões do lucro real |
| 200 | lr_compensacoes | Compensações de prejuízo |
| 201 | lr_irpj | Cálculo IRPJ |
| 202 | lr_csll | Cálculo CSLL |
| 203 | lr_estimativa | Estimativa mensal |
| 204 | lr_balanco_suspensao | Balanço de suspensão/redução |
| 205 | lr_ecf_ajustes | Ajustes ECF |

## 19. FOLHA DE PAGAMENTO (20 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 206 | funcionarios | Cadastro de funcionários |
| 207 | funcionarios_documentos | Documentos do funcionário |
| 208 | funcionarios_dependentes | Dependentes |
| 209 | funcionarios_enderecos | Endereços |
| 210 | funcionarios_cargos | Histórico de cargos |
| 211 | funcionarios_salarios | Histórico salarial |
| 212 | funcionarios_beneficios | Benefícios |
| 213 | funcionarios_banco | Dados bancários |
| 214 | cargos | Cadastro de cargos |
| 215 | departamentos | Departamentos |
| 216 | sindicatos | Sindicatos |
| 217 | convencoes_coletivas | Convenções coletivas |
| 218 | tabela_inss | Tabela INSS vigente |
| 219 | tabela_irrf | Tabela IRRF vigente |
| 220 | tabela_salario_familia | Tabela salário-família |
| 221 | eventos_folha | Eventos/verbas da folha |
| 222 | formulas_calculo | Fórmulas de cálculo |
| 223 | jornadas_trabalho | Jornadas de trabalho |
| 224 | escalas | Escalas de trabalho |
| 225 | afastamentos | Afastamentos |

## 20. FOLHA — Processamento (15 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 226 | folha_processamentos | Processamentos da folha |
| 227 | holerites | Holerites gerados |
| 228 | holerites_eventos | Eventos do holerite |
| 229 | folha_resumo | Resumo da folha |
| 230 | folha_provisoes | Provisões (13º, férias) |
| 231 | ferias | Programação de férias |
| 232 | ferias_calculos | Cálculos de férias |
| 233 | decimo_terceiro | 13º salário |
| 234 | rescisoes | Rescisões |
| 235 | rescisoes_calculos | Cálculos rescisórios |
| 236 | adiantamentos | Adiantamentos salariais |
| 237 | pensoes_alimenticias | Pensões alimentícias |
| 238 | emprestimos_consignados | Empréstimos consignados |
| 239 | vale_transporte | Vale-transporte |
| 240 | ponto_eletronico | Registro de ponto |

## 21. FOLHA — Encargos e Guias (10 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 241 | inss_patronal | INSS patronal |
| 242 | fgts_guias | Guias FGTS |
| 243 | fgts_depositos | Depósitos FGTS |
| 244 | irrf_folha | IRRF da folha |
| 245 | contribuicao_sindical | Contribuição sindical |
| 246 | gfip | GFIP/SEFIP |
| 247 | caged | CAGED (admissões/demissões) |
| 248 | rais | RAIS anual |
| 249 | dirf_funcionarios | DIRF - rendimentos |
| 250 | informe_rendimentos | Informes de rendimentos |

## 22. OBRIGAÇÕES ACESSÓRIAS (20 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 251 | sped_fiscal | SPED Fiscal (EFD ICMS/IPI) |
| 252 | sped_fiscal_registros | Registros do SPED Fiscal |
| 253 | sped_fiscal_blocos | Blocos do arquivo |
| 254 | sped_contribuicoes | SPED Contribuições |
| 255 | sped_contribuicoes_registros | Registros SPED Contribuições |
| 256 | ecd | Escrituração Contábil Digital |
| 257 | ecd_registros | Registros da ECD |
| 258 | ecd_livros | Livros da ECD |
| 259 | ecf | Escrituração Contábil Fiscal |
| 260 | ecf_registros | Registros da ECF |
| 261 | ecf_blocos | Blocos da ECF |
| 262 | dirf | DIRF anual |
| 263 | dirf_beneficiarios | Beneficiários DIRF |
| 264 | dctf | DCTF mensal |
| 265 | dctf_debitos | Débitos declarados |
| 266 | dctf_creditos | Créditos vinculados |
| 267 | esocial_eventos | Eventos eSocial |
| 268 | esocial_lotes | Lotes eSocial |
| 269 | esocial_retornos | Retornos eSocial |
| 270 | reinf_eventos | Eventos EFD-Reinf |

## 23. eSocial Detalhado (10 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 271 | esocial_s1000 | Empregador |
| 272 | esocial_s1010 | Rubricas |
| 273 | esocial_s1200 | Remuneração |
| 274 | esocial_s1210 | Pagamentos |
| 275 | esocial_s2200 | Admissão |
| 276 | esocial_s2299 | Desligamento |
| 277 | esocial_s2230 | Afastamento |
| 278 | esocial_s2240 | Cond. ambientais |
| 279 | esocial_s1299 | Fechamento folha |
| 280 | esocial_s3000 | Exclusão de eventos |

## 24. ANALYTICS E IA (12 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 281 | dashboards | Dashboards configurados |
| 282 | dashboard_widgets | Widgets dos dashboards |
| 283 | metricas_financeiras | Métricas calculadas |
| 284 | indicadores_kpi | KPIs por empresa |
| 285 | predicoes_fluxo_caixa | Predições de fluxo |
| 286 | classificacoes_ai | Classificações automáticas |
| 287 | modelos_ml | Modelos de ML treinados |
| 288 | sugestoes_lancamentos | Sugestões de lançamento |
| 289 | anomalias_detectadas | Anomalias fiscais |
| 290 | relatorios_gerados | Relatórios gerados |
| 291 | relatorios_modelos | Templates de relatório |
| 292 | relatorios_agendados | Relatórios agendados |

## 25. SISTEMA E INTEGRAÇÕES (10 coleções)

| # | Coleção | Descrição |
|---|---------|-----------|
| 293 | integracoes | Integrações configuradas |
| 294 | integracoes_logs | Logs de integração |
| 295 | webhooks | Webhooks configurados |
| 296 | api_keys | Chaves de API |
| 297 | jobs_agendados | Jobs em background |
| 298 | jobs_execucoes | Execuções de jobs |
| 299 | parametros_sistema | Parâmetros globais |
| 300 | tabelas_ibge | Municípios IBGE |
| 301 | cfop | Tabela CFOP |
| 302 | ncm | Tabela NCM |

---

## Total: 302 coleções organizadas em 25 domínios
