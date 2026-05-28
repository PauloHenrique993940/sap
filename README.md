# SAP Warehouse Portfolio (MM/WM)

Plataforma full-stack para gestao de almoxarifado inspirada em SAP MM/WM, com foco em rastreabilidade, transacoes seguras e UX moderna.

## Stack

- API: Node.js + Express + TypeScript + Prisma + PostgreSQL
- Web: React + TypeScript + Tailwind + React Router + React Query

## Scripts

- `npm run dev`: sobe API e frontend em paralelo
- `npm run dev:api`: sobe API (porta 3333)
- `npm run dev:web`: sobe frontend Vite (porta 5173)
- `npm run prisma:generate`: gera Prisma Client
- `npm run prisma:migrate`: cria/aplica migration
- `npm run typecheck`: valida tipagem API + Web
- `npm run build`: build API + Web

## Endpoints principais

- Dashboard: `GET /api/v1/dashboard/summary`
- Estoque:
  - `GET /api/v1/inventory/stocks`
  - `POST /api/v1/inventory/receipts`
  - `POST /api/v1/inventory/transfers`
- Requisicoes:
  - `GET /api/v1/requests`
  - `POST /api/v1/requests`
  - `PATCH /api/v1/requests/:requestId/decision`
  - `POST /api/v1/requests/:requestId/items/:itemId/reserve`
  - `POST /api/v1/requests/:requestId/items/:itemId/deliver`
- Auditoria: `GET /api/v1/audit/timeline?productId=...`

## Swagger

- UI interativa: `http://localhost:3333/api/docs`
- OpenAPI JSON: `http://localhost:3333/api/docs.json`
- Autenticacao mock nos endpoints protegidos: use os headers `x-user-id` e `x-user-role`.

## Autenticacao para ambiente de portfolio

As rotas exigem cabecalhos:

- `x-user-id`
- `x-user-role` em `ADMIN | GESTOR | ALMOXARIFE | REQUISITANTE`

## Front-end

Visoes implementadas:

- Dashboard com KPI e grafico de consumo por centro de custo
- Almoxarifado digital com filtros e status critico
- Carrinho logistico + conciliacao de requisicoes
- Timeline de rastreabilidade por produto

## Documentacao detalhada

- `docs/prisma-schema-e-consistencia.md`
- `docs/backend-transacoes-e-endpoints.md`
- `docs/guia-completo-fullstack-mm-wm.md`
