# Prisma Schema - Almoxarifado SAP-style (MM/WM)

Este documento descreve as decisoes de modelagem para garantir rastreabilidade, consistencia e performance em um contexto de almoxarifado com inspiracao em SAP MM/WM.

## 1. Objetivos da modelagem

- Garantir rastreabilidade fim-a-fim: entrada, reserva, transferencia e baixa fisica.
- Evitar inconsistencias de saldo (fisico e reservado).
- Suportar consultas operacionais rapidas (painel, filtros, auditoria e timeline).
- Permitir governanca por perfis (RBAC) e trilha de auditoria imutavel.

## 2. Visao das entidades

- users: autenticacao e autorizacao (roles e status).
- product_categories e products: cadastro mestre de materiais.
- warehouse_locations: enderecamento fisico no padrao predio-rua-estante-nivel.
- suppliers e batches: rastreabilidade de lote, fornecedor e validade (FIFO/PEPS).
- inventory_stocks: saldo por combinacao produto + endereco + lote.
- material_requests e material_request_items: ciclo de requisicao e atendimento.
- audit_logs: log imutavel de movimentacoes e mudancas de saldo.

## 3. Relacionamentos e cardinalidade

- User 1:N MaterialRequest (requester).
- User 1:N MaterialRequest (approver).
- ProductCategory 1:N Product.
- Product 1:N Batch.
- Product 1:N InventoryStock.
- WarehouseLocation 1:N InventoryStock.
- Batch 1:N InventoryStock.
- MaterialRequest 1:N MaterialRequestItem.
- Product 1:N MaterialRequestItem.
- MaterialRequestItem N:1 Batch (alocacao opcional).
- MaterialRequestItem N:1 WarehouseLocation (alocacao opcional).
- AuditLog referencia opcionalmente Request/RequestItem/Batch/Stock/Locations para reconstruir timeline.

## 4. Constraints fundamentais de consistencia

As regras abaixo devem ser aplicadas em migration SQL adicional (CHECK e trigger), pois o Prisma Schema nao cobre tudo em nivel declarativo:

```sql
-- 1) Evita estoque negativo ou reservado negativo
ALTER TABLE inventory_stocks
  ADD CONSTRAINT ck_inventory_non_negative
  CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0);

-- 2) Evita reservado maior que fisico
ALTER TABLE inventory_stocks
  ADD CONSTRAINT ck_inventory_reserved_lte_on_hand
  CHECK (quantity_reserved <= quantity_on_hand);

-- 3) Evita minimo acima de maximo (quando maximo existir)
ALTER TABLE products
  ADD CONSTRAINT ck_products_min_max
  CHECK (max_stock IS NULL OR min_stock <= max_stock);

-- 4) Evita quantidades invalidas em itens de requisicao
ALTER TABLE material_request_items
  ADD CONSTRAINT ck_request_item_qty
  CHECK (
    requested_qty > 0
    AND (approved_qty IS NULL OR approved_qty >= 0)
    AND (delivered_qty IS NULL OR delivered_qty >= 0)
  );

-- 5) Evita movimento com quantidade nula/negativa
ALTER TABLE audit_logs
  ADD CONSTRAINT ck_audit_positive_quantity
  CHECK (quantity > 0);
```

## 5. Imutabilidade da auditoria

`audit_logs` deve ser append-only. Aplique trigger para bloquear UPDATE/DELETE:

```sql
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs e imutavel';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_no_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_audit_log_no_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
```

## 6. Indices para performance

Ja modelados no schema:

- Busca operacional de produto: `products(sku)`, `products(barcode)`, `products(name)`, `products(category_id, is_active)`.
- Saldo de estoque: `inventory_stocks(product_id)`, `inventory_stocks(location_id)`, `inventory_stocks(batch_id)`.
- Timeline/auditoria: `audit_logs(product_id, performed_at)`, `audit_logs(batch_id, performed_at)`, `audit_logs(movement_type, performed_at)`.
- Requisicoes: `material_requests(status, requested_at)`, `material_requests(cost_center)`.

Indice recomendado por migration SQL para busca textual (opcional):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
```

## 7. Concorrencia e integridade transacional

Para operacoes criticas (entrada, reserva, entrega e transferencia):

- Sempre usar `prisma.$transaction(...)`.
- Ler e atualizar saldo no mesmo bloco transacional.
- Usar controle otimista via coluna `inventory_stocks.version` (incremento a cada movimento).
- Em cenarios de alta concorrencia, usar SQL com `FOR UPDATE` via `prisma.$queryRaw` nos saldos alvo.

## 8. Regras de negocio obrigatorias no service layer

- Nao permitir `quantity_on_hand` negativo em nenhuma hipotese.
- Na saida por requisicao:
  - Reserva: decrementa disponivel implicito ao aumentar `quantity_reserved`.
  - Entrega: baixa `quantity_on_hand` e baixa `quantity_reserved` na mesma transacao.
- Transferencia interna:
  - debita origem e credita destino na mesma transacao.
  - validar `capacity_limit` do destino antes do credito.
- Alerta de estoque critico:
  - calcular por produto: soma de `quantity_on_hand - quantity_reserved` vs `min_stock`.

## 9. Padroes de naming e interoperabilidade

- Nomes de tabela em snake_case via `@@map` para facilitar interoperabilidade com BI/DBA.
- Modelos Prisma em PascalCase para ergonomia TypeScript.
- Enums para estados fechados, reduzindo erro humano e ifs fragilizados.

## 10. Proximos passos

1. Gerar migration inicial com Prisma.
2. Adicionar migration SQL complementar com CHECKs e triggers acima.
3. Implementar services transacionais (recebimento, requisicao/reserva, entrega e transferencia).
4. Expor endpoints com RBAC e validacao de payload (Zod ou class-validator).
