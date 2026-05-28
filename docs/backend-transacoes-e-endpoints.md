# Backend transacional (Clean Architecture leve)

Implementacao base criada para os fluxos criticos com Prisma `$transaction`.

## Estrutura de pastas

- src/modules/inventory/application: regras de entrada e transferencia.
- src/modules/requests/application: regras de reserva e baixa fisica.
- src/modules/*/http: controllers HTTP.
- src/routes: composicao das rotas.
- src/shared: prisma client, middlewares e tratamento global de erro.

## Endpoints

Todos exigem cabecalhos:

- x-user-id
- x-user-role: ADMIN | GESTOR | ALMOXARIFE | REQUISITANTE

### 1) Recebimento de material

POST /api/v1/inventory/receipts

Body exemplo:

```json
{
  "productId": "prod_123",
  "supplierId": "sup_123",
  "batchNumber": "L-2026-0001",
  "manufacturedAt": "2026-04-10",
  "expiresAt": "2027-04-10",
  "locationId": "loc_001",
  "quantity": 50,
  "reason": "Recebimento NF 12345"
}
```

Garantias:

- Cria/atualiza lote.
- Incrementa saldo fisico no endereco.
- Valida capacidade do endereco destino.
- Registra auditoria ENTRADA com before/after.
- Sinaliza `metadata.lowStock` no audit log.

### 2) Reserva de item de requisicao

POST /api/v1/requests/:requestId/items/:itemId/reserve

Body exemplo:

```json
{
  "locationId": "loc_001",
  "batchId": "bat_001",
  "quantity": 10
}
```

Garantias:

- Nao permite reservar acima do disponivel.
- Nao permite requisicao em status invalido.
- Move saldo de disponivel para reservado (`quantityReserved +`).
- Grava lote/endereco alocados no item da requisicao.
- Registra auditoria RESERVA.

### 3) Confirmacao de entrega fisica

POST /api/v1/requests/:requestId/items/:itemId/deliver

Body exemplo:

```json
{
  "quantity": 10
}
```

Garantias:

- Exige alocacao previa de lote/endereco.
- Nao permite baixar acima do reservado.
- Baixa fisico e reservado na mesma transacao.
- Atualiza status para ENTREGUE.
- Registra auditoria BAIXA_FISICA.

### 4) Transferencia interna de endereco

POST /api/v1/inventory/transfers

Body exemplo:

```json
{
  "productId": "prod_123",
  "batchId": "bat_001",
  "fromLocationId": "loc_001",
  "toLocationId": "loc_002",
  "quantity": 5,
  "reason": "Reorganizacao de corredor"
}
```

Garantias:

- Valida saldo disponivel na origem.
- Valida capacidade do destino.
- Debita origem e credita destino na mesma transacao.
- Usa controle otimista por `version` para concorrencia.
- Registra auditoria TRANSFERENCIA_INTERNA.

## Regras de concorrencia

As escritas criticas usam `updateMany` com filtro por `version` + condicoes de saldo. Se `count !== 1`, ocorre conflito de concorrencia (HTTP 409).

## RBAC aplicado

- Endpoints de estoque/requisicao operacional: ADMIN, GESTOR, ALMOXARIFE.
- Requisitante nao tem permissao nesses endpoints operacionais.

## Proximos passos recomendados

1. Trocar `mockAuthMiddleware` por JWT real (access + refresh token).
2. Adicionar validacao de payload com Zod.
3. Cobrir services com testes de concorrencia e transacao.
4. Integrar fila/evento para notificacao de estoque critico.
