import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SAP Warehouse API',
    version: '1.0.0',
    description: 'API de gestao de almoxarifado (MM/WM) com estoque, requisicoes, auditoria e materiais.',
  },
  servers: [{ url: 'http://localhost:3333', description: 'Ambiente local' }],
  tags: [
    { name: 'Health' },
    { name: 'Dashboard' },
    { name: 'Inventory' },
    { name: 'Requests' },
    { name: 'Audit' },
    { name: 'Materials' },
  ],
  components: {
    securitySchemes: {
      UserIdHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
      },
      UserRoleHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-role',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Erro interno do servidor' },
        },
      },
      MaterialPayload: {
        type: 'object',
        required: ['sku', 'name', 'categoryName', 'unit', 'minStock', 'costPrice'],
        properties: {
          sku: { type: 'string', example: 'MAT-001' },
          name: { type: 'string', example: 'Caneta esferografica azul' },
          categoryName: { type: 'string', example: 'Escritorio' },
          unit: { type: 'string', enum: ['UN', 'KG', 'CX'] },
          minStock: { type: 'integer', minimum: 0, example: 10 },
          maxStock: { type: 'integer', minimum: 0, nullable: true, example: 100 },
          costPrice: { type: 'number', example: 2.03 },
          description: { type: 'string', nullable: true },
          barcode: { type: 'string', nullable: true },
          isActive: { type: 'boolean', example: true },
        },
      },
      RequestDecisionPayload: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['APROVAR', 'RECUSAR'] },
          rejectionReason: { type: 'string', nullable: true },
        },
      },
    },
  },
  security: [{ UserIdHeader: [], UserRoleHeader: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check da API',
        security: [],
        responses: {
          '200': {
            description: 'API operacional',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Resumo operacional do dashboard',
        responses: {
          '200': { description: 'Resumo retornado com sucesso' },
          '401': { description: 'Nao autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/inventory/stocks': {
      get: {
        tags: ['Inventory'],
        summary: 'Lista saldos de estoque',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'criticalOnly', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': { description: 'Lista de estoque retornada com sucesso' },
        },
      },
    },
    '/api/v1/inventory/receipts': {
      post: {
        tags: ['Inventory'],
        summary: 'Registra recebimento de estoque',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'number' },
                  addressCode: { type: 'string' },
                  lotCode: { type: 'string', nullable: true },
                  expiresAt: { type: 'string', format: 'date-time', nullable: true },
                },
                required: ['productId', 'quantity', 'addressCode'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Recebimento registrado' },
        },
      },
    },
    '/api/v1/inventory/transfers': {
      post: {
        tags: ['Inventory'],
        summary: 'Transfere estoque entre enderecos',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'number' },
                  fromAddressCode: { type: 'string' },
                  toAddressCode: { type: 'string' },
                },
                required: ['productId', 'quantity', 'fromAddressCode', 'toAddressCode'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Transferencia registrada' },
        },
      },
    },
    '/api/v1/requests': {
      get: {
        tags: ['Requests'],
        summary: 'Lista requisicoes',
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Requisicoes retornadas' },
        },
      },
      post: {
        tags: ['Requests'],
        summary: 'Cria requisicao de materiais',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  costCenter: { type: 'string' },
                  department: { type: 'string' },
                  notes: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string' },
                        requestedQty: { type: 'number' },
                        unit: { type: 'string', enum: ['UN', 'KG', 'CX'] },
                      },
                      required: ['productId', 'requestedQty', 'unit'],
                    },
                  },
                },
                required: ['costCenter', 'items'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Requisicao criada' },
        },
      },
    },
    '/api/v1/requests/{requestId}/decision': {
      patch: {
        tags: ['Requests'],
        summary: 'Aprova ou recusa requisicao',
        parameters: [{ name: 'requestId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RequestDecisionPayload' },
            },
          },
        },
        responses: {
          '200': { description: 'Decisao aplicada' },
        },
      },
    },
    '/api/v1/requests/{requestId}/items/{itemId}/reserve': {
      post: {
        tags: ['Requests'],
        summary: 'Reserva item da requisicao',
        parameters: [
          { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Item reservado' },
        },
      },
    },
    '/api/v1/requests/{requestId}/items/{itemId}/deliver': {
      post: {
        tags: ['Requests'],
        summary: 'Entrega item da requisicao',
        parameters: [
          { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Item entregue' },
        },
      },
    },
    '/api/v1/audit/timeline': {
      get: {
        tags: ['Audit'],
        summary: 'Consulta timeline de auditoria por produto',
        parameters: [{ name: 'productId', in: 'query', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Timeline retornada' },
        },
      },
    },
    '/api/v1/materials': {
      get: {
        tags: ['Materials'],
        summary: 'Lista materiais',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'activeOnly', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': { description: 'Materiais retornados' },
        },
      },
      post: {
        tags: ['Materials'],
        summary: 'Cria material',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaterialPayload' },
            },
          },
        },
        responses: {
          '201': { description: 'Material criado' },
        },
      },
    },
    '/api/v1/materials/{id}': {
      patch: {
        tags: ['Materials'],
        summary: 'Atualiza material',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaterialPayload' },
            },
          },
        },
        responses: {
          '200': { description: 'Material atualizado' },
        },
      },
      delete: {
        tags: ['Materials'],
        summary: 'Inativa material',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Material inativado' },
        },
      },
    },
  },
} as const;

export function setupSwagger(app: Express) {
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.status(200).json(openApiDocument);
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'SAP Warehouse API Docs',
  }));
}
