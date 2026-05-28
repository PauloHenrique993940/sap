const AUTH_HEADERS = {
  'x-user-id': 'demo-almoxarife-001',
  'x-user-role': 'ALMOXARIFE',
};

const REQUEST_TIMEOUT_MS = 12000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tempo limite excedido. Verifique se a API está ativa e tente novamente.');
    }
    throw new Error('Falha de conexao com a API. Verifique o servidor.');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: 'Erro inesperado' }));
    throw new Error(data.message ?? 'Erro inesperado');
  }
  return response.json() as Promise<T>;
}

export const api = {
  async getMaterials(search?: string, activeOnly = false) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (activeOnly) params.set('activeOnly', 'true');

    const response = await fetchWithTimeout(`/api/v1/materials?${params.toString()}`, {
      headers: AUTH_HEADERS,
    });

    return handle<{
      data: Array<{
        id: string;
        sku: string;
        barcode: string | null;
        name: string;
        description: string | null;
        unit: 'UN' | 'KG' | 'CX';
        minStock: number;
        maxStock: number | null;
        costPrice: number;
        isActive: boolean;
        category: { id: string; name: string };
      }>;
    }>(response);
  },

  async createMaterial(payload: {
    sku: string;
    barcode?: string | null;
    name: string;
    description?: string | null;
    unit: 'UN' | 'KG' | 'CX';
    minStock: number;
    maxStock?: number | null;
    costPrice: number;
    categoryName: string;
    isActive?: boolean;
  }) {
    const response = await fetchWithTimeout('/api/v1/materials', {
      method: 'POST',
      headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handle<any>(response);
  },

  async updateMaterial(
    id: string,
    payload: Partial<{
      sku: string;
      barcode: string | null;
      name: string;
      description: string | null;
      unit: 'UN' | 'KG' | 'CX';
      minStock: number;
      maxStock: number | null;
      costPrice: number;
      categoryName: string;
      isActive: boolean;
    }>
  ) {
    const response = await fetchWithTimeout(`/api/v1/materials/${id}`, {
      method: 'PATCH',
      headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handle<any>(response);
  },

  async deleteMaterial(id: string) {
    const response = await fetchWithTimeout(`/api/v1/materials/${id}`, {
      method: 'DELETE',
      headers: AUTH_HEADERS,
    });
    return handle<any>(response);
  },

  async getDashboard() {
    const response = await fetchWithTimeout('/api/v1/dashboard/summary', { headers: AUTH_HEADERS });
    return handle<{
      kpis: {
        totalItemsOnHand: number;
        criticalProducts: number;
        pendingRequests: number;
        expiringBatches: number;
      };
      consumptionByCostCenter: Array<{ costCenter: string; quantity: number }>;
    }>(response);
  },

  async getStocks(params: URLSearchParams) {
    const response = await fetchWithTimeout(`/api/v1/inventory/stocks?${params.toString()}`, {
      headers: AUTH_HEADERS,
    });
    return handle<{
      data: Array<{
        id: string;
        sku: string;
        productName: string;
        quantityOnHand: number;
        quantityReserved: number;
        quantityAvailable: number;
        isCritical: boolean;
        addressCode: string;
      }>;
      pagination: { page: number; pageSize: number; total: number };
    }>(response);
  },

  async getRequests(status?: string) {
    const query = status ? `?status=${status}` : '';
    const response = await fetchWithTimeout(`/api/v1/requests${query}`, { headers: AUTH_HEADERS });
    return handle<{ data: Array<any> }>(response);
  },

  async createRequest(payload: {
    costCenter: string;
    department?: string;
    notes?: string;
    items: Array<{ productId: string; requestedQty: number; unit: 'UN' | 'KG' | 'CX' }>;
  }) {
    const response = await fetchWithTimeout('/api/v1/requests', {
      method: 'POST',
      headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handle<any>(response);
  },

  async decideRequest(requestId: string, action: 'APROVAR' | 'RECUSAR', rejectionReason?: string) {
    const response = await fetchWithTimeout(`/api/v1/requests/${requestId}/decision`, {
      method: 'PATCH',
      headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejectionReason }),
    });
    return handle<any>(response);
  },

  async getTimeline(productId: string) {
    const response = await fetchWithTimeout(`/api/v1/audit/timeline?productId=${productId}`, {
      headers: AUTH_HEADERS,
    });
    return handle<{ data: Array<any> }>(response);
  },
};
