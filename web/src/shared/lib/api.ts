const AUTH_HEADERS = {
  'x-user-id': 'demo-almoxarife-001',
  'x-user-role': 'ALMOXARIFE',
};

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: 'Erro inesperado' }));
    throw new Error(data.message ?? 'Erro inesperado');
  }
  return response.json() as Promise<T>;
}

export const api = {
  async getDashboard() {
    const response = await fetch('/api/v1/dashboard/summary', { headers: AUTH_HEADERS });
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
    const response = await fetch(`/api/v1/inventory/stocks?${params.toString()}`, {
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
    const response = await fetch(`/api/v1/requests${query}`, { headers: AUTH_HEADERS });
    return handle<{ data: Array<any> }>(response);
  },

  async createRequest(payload: {
    costCenter: string;
    department?: string;
    notes?: string;
    items: Array<{ productId: string; requestedQty: number; unit: 'UN' | 'KG' | 'CX' }>;
  }) {
    const response = await fetch('/api/v1/requests', {
      method: 'POST',
      headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handle<any>(response);
  },

  async decideRequest(requestId: string, action: 'APROVAR' | 'RECUSAR', rejectionReason?: string) {
    const response = await fetch(`/api/v1/requests/${requestId}/decision`, {
      method: 'PATCH',
      headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejectionReason }),
    });
    return handle<any>(response);
  },

  async getTimeline(productId: string) {
    const response = await fetch(`/api/v1/audit/timeline?productId=${productId}`, {
      headers: AUTH_HEADERS,
    });
    return handle<{ data: Array<any> }>(response);
  },
};
