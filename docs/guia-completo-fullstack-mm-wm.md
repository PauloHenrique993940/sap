# Guia completo - Plataforma de Almoxarifado SAP-style (MM/WM)

## 1) Visao geral de arquitetura

Arquitetura adotada:

- Backend modular por dominio (`src/modules/*`) com separacao entre `application` (regras) e `http` (controllers/rotas).
- Camada compartilhada (`src/shared`) para erro global, prisma, autenticacao e validacao.
- Frontend orientado a features (`web/src/features/*`) com React Query para sincronizacao de dados e cache.
- Banco relacional PostgreSQL via Prisma ORM com foco em rastreabilidade de lote e auditoria imutavel.

Fluxo principal:

1. Entrada de material cria/atualiza lote, incrementa saldo e gera auditoria.
2. Requisicao reserva saldo (sem baixa fisica imediata).
3. Entrega confirma baixa fisica e atualiza trilha.
4. Transferencia interna muda saldo entre enderecos com validacao de capacidade.

## 2) Banco de dados (Prisma)

Arquivo principal:

- `prisma/schema.prisma`

Entidades criticas:

- Users/Auth: role/status com enum.
- Products/Categories: SKU e barcode unicos, minimo/maximo, custo.
- WarehouseLocation: endereco composto e `addressCode` unico.
- Batch/Supplier: rastreabilidade de fornecedor e validade.
- InventoryStock: saldo por produto + endereco + lote (unique composto).
- MaterialRequest/MaterialRequestItem: ciclo de requisicao estilo carrinho logistico.
- AuditLog: trilha append-only de ENTRADA, RESERVA, BAIXA, TRANSFERENCIA e AJUSTE.

Constraints recomendadas e trigger de imutabilidade:

- `docs/prisma-schema-e-consistencia.md`

## 3) Especificacoes de backend

### Endpoints principais

- `GET /health`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/inventory/stocks`
- `POST /api/v1/inventory/receipts`
- `POST /api/v1/inventory/transfers`
- `GET /api/v1/requests`
- `POST /api/v1/requests`
- `PATCH /api/v1/requests/:requestId/decision`
- `POST /api/v1/requests/:requestId/items/:itemId/reserve`
- `POST /api/v1/requests/:requestId/items/:itemId/deliver`
- `GET /api/v1/audit/timeline?productId=...`

### Regras transacionais implementadas

- Recebimento: `InventoryService.receiveStock` com `$transaction`.
- Transferencia: `InventoryService.transferStock` com validacao de capacidade + controle otimista por `version`.
- Reserva: `RequestService.reserveRequestItem` impede reserva acima do disponivel.
- Baixa fisica: `RequestService.deliverRequestItem` baixa reservado e fisico na mesma transacao.
- Decisao de requisicao: `RequestService.decideRequest` controla aprovacao/recusa.

### RBAC

- Middleware de autenticacao por cabecalho para ambiente de portfolio.
- Middleware de autorizacao por role (`requireRoles`) por rota.

Cabecalhos esperados:

- `x-user-id`
- `x-user-role` em `ADMIN | GESTOR | ALMOXARIFE | REQUISITANTE`

### Validacao de payload

- Zod aplicado nas operacoes criticas de estoque e requisicao.
- Middleware central em `src/shared/validation/validate.ts`.

### Tratamento global de erros

- `AppError` para erros de dominio/negocio.
- `errorHandler` para resposta padronizada HTTP.

## 4) Especificacoes de frontend

Estrutura por features:

- `web/src/features/dashboard`
- `web/src/features/inventory`
- `web/src/features/requests`
- `web/src/features/traceability`

Tecnologias:

- React + TypeScript
- React Router v6
- TanStack Query
- Tailwind CSS
- Recharts

Telas implementadas:

1. Dashboard
- KPIs: itens em estoque, criticos, pendencias, lotes a vencer.
- Grafico de consumo por centro de custo.

2. Almoxarifado digital
- Tabela com busca por SKU/nome.
- Filtro de itens criticos.
- Indicador visual de status de estoque.

3. Carrinho logistico
- Form de solicitacao de material.
- Lista de pendencias para conciliacao.
- Acoes de aprovar/recusar em um clique.

4. Rastreabilidade
- Timeline por `productId` com movimentos e origem/destino.

## 5) Performance e boas praticas

- Consultas com `include/select` para evitar N+1 em telas agregadas.
- Paginacao server-side em estoque (`page`, `pageSize`).
- Controle otimista de concorrencia em estoque (`version`).
- Cache cliente com React Query e `staleTime` configurado.

## 6) Como executar

### Pre-requisitos

- Node.js 20+
- PostgreSQL 14+

### Variaveis de ambiente

1. Copie `.env.example` para `.env`.
2. Ajuste `DATABASE_URL`.

### Comandos

- Instalar dependencias: `npm install`
- Gerar client Prisma: `npm run prisma:generate`
- Rodar migration: `npm run prisma:migrate`
- Rodar API + Web em paralelo: `npm run dev`
- Rodar typecheck: `npm run typecheck`
- Rodar build: `npm run build`

## 7) Roadmap de fechamento enterprise

1. Substituir autenticacao de cabecalho por JWT + refresh token.
2. Introduzir testes automatizados (unitarios + integracao transacional).
3. Adicionar observabilidade (OpenTelemetry + logs estruturados).
4. Implementar notificacao de estoque critico (fila/evento).
5. Evoluir para ACL por centro de custo/departamento e trilha de compliance.
