# Bear ERP

**O melhor sistema contábil SaaS do Brasil.**

ERP contábil cloud-native para escritórios de contabilidade e empresas de todos os portes (MEI, Simples Nacional, Lucro Presumido, Lucro Real).

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Angular 17, Angular Material, TailwindCSS, RxJS |
| Backend | Java 21, Spring Boot 3.2, Spring Cloud |
| Banco de Dados | MongoDB 7.0 (cluster replicado) |
| Mensageria | Apache Kafka |
| Cache | Redis |
| Infra | Docker, Kubernetes, Helm |
| Monitoramento | Prometheus, Grafana, ELK Stack |
| CI/CD | GitHub Actions |

## Arquitetura

- **Microservices** com Clean Architecture e DDD
- **Multi-tenant** (escritório > empresa > usuários)
- **CQRS** + Event-Driven (Kafka)
- **Saga Pattern** para transações distribuídas
- **Segurança bancária**: Argon2id, AES-256-GCM, JWT RS256, 2FA

## Módulos

- **Core**: Auth, Tenants, Empresas, Usuários
- **Cadastros**: Clientes, Fornecedores, Produtos, Serviços
- **Contabilidade**: Plano de Contas, Lançamentos, Balancete, DRE, Balanço
- **Fiscal**: NF-e, NFS-e, CT-e, MDF-e (integração SEFAZ)
- **Financeiro**: Contas a Pagar/Receber, Conciliação Bancária, Fluxo de Caixa
- **Folha**: Funcionários, Holerites, Férias, 13º, Rescisões
- **Tributário**: Simples Nacional, Lucro Presumido, Lucro Real
- **Obrigações**: SPED, ECD, ECF, DIRF, DCTF, eSocial, EFD-Reinf
- **IA Contábil**: Classificação automática, Predição de fluxo, Detecção de anomalias

## Quick Start

```bash
# Subir infraestrutura
docker-compose up -d mongodb redis kafka zookeeper

# Backend (a partir do diretório backend/)
mvn clean install -DskipTests
mvn spring-boot:run -pl microservices/auth-service

# Frontend (a partir do diretório frontend-angular/)
npm install
ng serve
```

## Acesso

- **Frontend**: http://localhost:4200
- **API Gateway**: http://localhost:8080
- **Eureka Dashboard**: http://localhost:8761
- **Swagger (Auth)**: http://localhost:8081/swagger-ui.html
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090

## Estrutura do Projeto

```
bear-erp/
├── frontend-angular/          # Angular 17 SPA
├── backend/
│   ├── api-gateway/           # Spring Cloud Gateway
│   ├── service-discovery/     # Eureka Server
│   ├── config-server/         # Spring Cloud Config
│   ├── shared/
│   │   ├── common-lib/        # DTOs, exceptions, multi-tenant
│   │   └── security-lib/      # JWT, AES, Argon2, Audit
│   └── microservices/         # 27 microserviços
├── infra/
│   ├── docker/                # Dockerfiles
│   ├── kubernetes/            # K8s manifests
│   ├── monitoring/            # Prometheus + Grafana
│   └── helm/                  # Helm charts
├── docs/                      # Documentação
├── docker-compose.yml
└── .github/workflows/         # CI/CD
```

## Licença

Proprietário - Bear ERP
