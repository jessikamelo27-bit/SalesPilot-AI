import {
  AnalysisResponse,
  AssistantQueryResponse,
  DashboardResponse,
  ExecutiveReportResponse,
  FilterOptionsResponse,
  FilterState,
  ImportBatchInfo,
  ImportPreviewResponse,
  SettingsResponse,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function buildQueryString(filters?: Partial<FilterState>): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.product && filters.product !== 'all') params.set('product', filters.product);
  if (filters.salesperson && filters.salesperson !== 'all') params.set('salesperson', filters.salesperson);
  if (filters.region && filters.region !== 'all') params.set('region', filters.region);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Erro HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody.detail) {
        message = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getFilterOptions: async (): Promise<FilterOptionsResponse> => {
    const res = await fetch(`${API_BASE}/filters`);
    return handleJson<FilterOptionsResponse>(res);
  },

  getDashboard: async (filters: FilterState): Promise<DashboardResponse> => {
    const res = await fetch(`${API_BASE}/dashboard${buildQueryString(filters)}`);
    return handleJson<DashboardResponse>(res);
  },

  getAnalysis: async (filters: FilterState): Promise<AnalysisResponse> => {
    const res = await fetch(`${API_BASE}/analysis${buildQueryString(filters)}`);
    return handleJson<AnalysisResponse>(res);
  },

  getExecutiveReport: async (filters: FilterState): Promise<ExecutiveReportResponse> => {
    const res = await fetch(`${API_BASE}/reports/executive${buildQueryString(filters)}`);
    return handleJson<ExecutiveReportResponse>(res);
  },

  getCsvExportUrl: (filters: FilterState): string => {
    return `${API_BASE}/reports/export/csv${buildQueryString(filters)}`;
  },

  getPdfExportUrl: (filters: FilterState): string => {
    return `${API_BASE}/reports/export/pdf${buildQueryString(filters)}`;
  },

  getTemplateUrl: (): string => {
    return `${API_BASE}/imports/template`;
  },

  uploadSpreadsheet: async (file: File): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/imports/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleJson<ImportPreviewResponse>(res);
  },

  confirmImport: async (batchId: number): Promise<{ batch_id: number; status: string; imported_records: number }> => {
    const res = await fetch(`${API_BASE}/imports/${batchId}/confirm`, {
      method: 'POST',
    });
    return handleJson(res);
  },

  cancelImport: async (batchId: number): Promise<{ batch_id: number; status: string }> => {
    const res = await fetch(`${API_BASE}/imports/${batchId}/cancel`, {
      method: 'POST',
    });
    return handleJson(res);
  },

  listImportBatches: async (): Promise<ImportBatchInfo[]> => {
    const res = await fetch(`${API_BASE}/imports/batches`);
    return handleJson<ImportBatchInfo[]>(res);
  },

  loadDemoData: async (): Promise<{ status: string; demo_records_loaded: number }> => {
    const res = await fetch(`${API_BASE}/demo/load`, { method: 'POST' });
    return handleJson(res);
  },

  clearDemoData: async (): Promise<{ status: string; deleted_demo_records: number; remaining_real_records: number }> => {
    const res = await fetch(`${API_BASE}/demo/clear`, { method: 'POST' });
    return handleJson(res);
  },

  askAssistant: async (question: string, filters: FilterState): Promise<AssistantQueryResponse> => {
    const payload = {
      question,
      start_date: filters.start_date || null,
      end_date: filters.end_date || null,
      category: filters.category !== 'all' ? filters.category || null : null,
      product: filters.product !== 'all' ? filters.product || null : null,
      salesperson: filters.salesperson !== 'all' ? filters.salesperson || null : null,
      region: filters.region !== 'all' ? filters.region || null : null,
    };
    const res = await fetch(`${API_BASE}/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<AssistantQueryResponse>(res);
  },

  getSettings: async (): Promise<SettingsResponse> => {
    const res = await fetch(`${API_BASE}/settings`);
    return handleJson<SettingsResponse>(res);
  },

  updateSettings: async (payload: {
    ai_provider?: string;
    openai_api_key?: string;
    openai_model?: string;
    gemini_api_key?: string;
    gemini_model?: string;
  }): Promise<SettingsResponse> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<SettingsResponse>(res);
  },

  clearRealData: async (): Promise<{ status: string; deleted_real_records: number }> => {
    const res = await fetch(`${API_BASE}/settings/real-data`, { method: 'DELETE' });
    return handleJson(res);
  },
};

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Indisponível';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/D';
  }
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(2).replace('.', ',')}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
  }
  return formatCurrency(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/D';
  }
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number | null | undefined, showSign = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Indisponível';
  }
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1).replace('.', ',')}%`;
}
