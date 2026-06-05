# Bear ERP — Arquitetura de Software

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│              (Browser / Mobile / Integrações)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS/TLS 1.3
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Spring Cloud)                   │
│              Rate Limiting · Auth · Routing · CORS              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SERVICE MESH / DISCOVERY                      │
│                      (Eureka / Consul)                           │
└──────────────────────────────────────────────────────────────────┘
              │            │            │
    ┌─────────┴──┐   ┌────┴─────┐  ┌───┴──────────┐
    ▼            ▼   ▼          ▼  ▼              ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  AUTH   │ │ TENANT │ │EMPRESA │ │CONTAB. │ │ FISCAL │
│SERVICE  │ │SERVICE │ │SERVICE │ │SERVICE │ │SERVICE │
└────┬───┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
     │         │          │          │           │
     └─────────┴──────────┴──────────┴───────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         ┌─────────┐ ┌────────┐ ┌─────────┐
         │ MongoDB │ │ Redis  │ │  Kafka  │
         │ Cluster │ │ Cache  │ │ Broker  │
         └─────────┘ └────────┘ └─────────┘
```

## Padrões Arquiteturais

| Padrão | Uso |
|--------|-----|
| Clean Architecture | Separação domain/application/infrastructure/interfaces |
| DDD | Agregados, Value Objects, Domain Events, Repositories |
| CQRS | Separação de comandos e queries nos serviços de alto volume |
| Event-Driven | Kafka para comunicação assíncrona entre serviços |
| Saga Pattern | Transações distribuídas (ex: emissão NF-e + lançamento contábil) |
| Circuit Breaker | Resilience4j para chamadas inter-serviço |
| API Gateway | Ponto único de entrada, rate limiting, auth |

## Estrutura Interna de Cada Microserviço (Clean Architecture)

```
service/
├── domain/           ← Entidades, Value Objects, Regras de negócio
│   ├── model/        ← Agregados e entidades
│   ├── repository/   ← Interfaces de repositório (portas)
│   ├── service/      ← Domain services
│   └── event/        ← Domain events
├── application/      ← Casos de uso, DTOs
│   ├── dto/          ← Request/Response DTOs
│   ├── usecase/      ← Application services (orquestração)
│   └── mapper/       ← Mapeamento entity ↔ DTO
├── infrastructure/   ← Implementações externas
│   ├── config/       ← Configurações Spring
│   ├── persistence/  ← Implementação dos repositories (MongoDB)
│   ├── messaging/    ← Kafka producers/consumers
│   └── security/     ← Filtros de segurança
└── interfaces/       ← Adaptadores de entrada
    └── rest/         ← Controllers REST
```

## Multi-Tenancy

```
Tenant (Escritório Contábil)
├── Office (Filial do escritório)
│   ├── Empresa Cliente 1
│   │   ├── Usuários
│   │   ├── Contabilidade
│   │   ├── Fiscal
│   │   ├── Financeiro
│   │   └── Folha
│   ├── Empresa Cliente 2
│   └── Empresa Cliente N
└── Office N
```

Estratégia: **Discriminador por campo** — todos os documentos possuem `tenantId` e `empresaId`.
Índices compostos garantem isolamento e performance.

## Segurança

```
                    ┌──────────────┐
                    │   Cliente    │
                    └──────┬───────┘
                           │ Login (email + senha + 2FA)
                           ▼
                    ┌──────────────┐
                    │ Auth Service │
                    │  OAuth2/JWT  │
                    │  Argon2id    │
                    └──────┬───────┘
                           │ JWT (RS256, RSA-4096)
                           ▼
                    ┌──────────────┐
                    │ API Gateway  │
                    │ Valida JWT   │
                    │ Extrai Tenant│
                    └──────┬───────┘
                           │ Header: X-Tenant-Id
                           ▼
                    ┌──────────────┐
                    │ Microserviço │
                    │ Filtra por   │
                    │ tenantId     │
                    └──────────────┘
```

- Senhas: Argon2id (memory=65536, iterations=3, parallelism=4)
- JWT: RS256, chaves RSA-4096, access token 15min, refresh token 7d
- Campos sensíveis: AES-256-GCM no MongoDB
- TLS 1.3 em todas as conexões
- Audit logs imutáveis com hash chain (SHA-256)
- Conformidade LGPD: endpoints de anonimização e exportação

## Comunicação entre Serviços

| Tipo | Tecnologia | Uso |
|------|-----------|-----|
| Síncrona | REST/gRPC via Gateway | Consultas simples |
| Assíncrona | Apache Kafka | Eventos de domínio, sagas |
| Cache | Redis | Sessions, dados frequentes |

## Eventos Kafka (Tópicos Principais)

```
bear.auth.user-created
bear.auth.user-logged-in
bear.tenant.created
bear.empresa.created
bear.empresa.updated
bear.contabil.lancamento-created
bear.contabil.lancamento-approved
bear.fiscal.nfe-emitted
bear.fiscal.nfe-cancelled
bear.fiscal.nfse-emitted
bear.financeiro.conta-pagar-created
bear.financeiro.conta-receber-created
bear.financeiro.pagamento-confirmed
bear.folha.holerite-generated
bear.folha.esocial-event-sent
bear.tributario.apuracao-completed
bear.ai.classificacao-completed
bear.obrigacoes.sped-generated
```

## Monitoramento

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Microserviços│────▶│  Prometheus  │────▶│   Grafana    │
│  /actuator   │     │   Scraping   │     │  Dashboards  │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Logback    │────▶│ Logstash/    │────▶│ Elasticsearch│
│   JSON logs  │     │ Filebeat     │     │   + Kibana   │
└──────────────┘     └──────────────┘     └──────────────┘
```
