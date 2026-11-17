import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, RotateCcw, Sparkles, Trash2, Database } from 'lucide-react';
import { api } from '../../lib/api';
import { useFilters } from '../../context/FilterContext';
import { Badge, Button } from '../ui/Primitives';

export const FilterBar: React.FC = () => {
  const { filters, setFilter, resetFilters, hasActiveFilters } = useFilters();
  const queryClient = useQueryClient();

  const { data: options } = useQuery({
    queryKey: ['filter-options'],
    queryFn: api.getFilterOptions,
  });

  const loadDemoMutation = useMutation({
    mutationFn: api.loadDemoData,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const clearDemoMutation = useMutation({
    mutationFn: api.clearDemoData,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const hasDemo = (options?.demo_records ?? 0) > 0;
  const hasReal = (options?.real_records ?? 0) > 0;

  return (
    <div className="bg-navy-850/95 border-b border-slate-800/80 px-6 py-3.5 sticky top-0 z-20 backdrop-blur-md">
      {/* Top Status & Demo Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/70">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Filtros Globais Dinâmicos</span>
          </div>

          {hasDemo && (
            <Badge variant="warning" className="text-[11px]">
              <Sparkles className="w-3 h-3" />
              Base Sintética de Demonstração Ativa ({options?.demo_records} registros)
            </Badge>
          )}

          {hasReal && (
            <Badge variant="positive" className="text-[11px]">
              <Database className="w-3 h-3" />
              Dados Reais Importados ({options?.real_records} registros)
            </Badge>
          )}

          {options && !options.has_cost_data && options.total_records > 0 && (
            <Badge variant="neutral" className="text-[11px]">
              Sem coluna de custo (Lucro/Margem ocultos por integridade)
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadDemoMutation.mutate()}
            disabled={loadDemoMutation.isPending}
            title="Gera e carrega 12 meses de vendas sintéticas realistas preservando seus dados reais"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            {loadDemoMutation.isPending ? 'Carregando...' : hasDemo ? 'Recarregar Demonstração' : 'Carregar Demonstração'}
          </Button>

          {hasDemo && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => clearDemoMutation.mutate()}
              disabled={clearDemoMutation.isPending}
              title="Remove apenas os dados sintéticos de demonstração, preservando dados reais do usuário"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearDemoMutation.isPending ? 'Limpando...' : 'Limpar Demonstração'}
            </Button>
          )}
        </div>
      </div>

      {/* Interactive Filter Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 items-end">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Data Inicial</label>
          <input
            type="date"
            value={filters.start_date}
            min={options?.min_date || undefined}
            max={options?.max_date || undefined}
            onChange={(e) => setFilter('start_date', e.target.value)}
            className="w-full bg-navy-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Data Final</label>
          <input
            type="date"
            value={filters.end_date}
            min={options?.min_date || undefined}
            max={options?.max_date || undefined}
            onChange={(e) => setFilter('end_date', e.target.value)}
            className="w-full bg-navy-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Categoria</label>
          <select
            value={filters.category}
            onChange={(e) => setFilter('category', e.target.value)}
            className="w-full bg-navy-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todas as categorias</option>
            {options?.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Produto</label>
          <select
            value={filters.product}
            onChange={(e) => setFilter('product', e.target.value)}
            className="w-full bg-navy-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os produtos</option>
            {options?.products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Vendedor</label>
          <select
            value={filters.salesperson}
            onChange={(e) => setFilter('salesperson', e.target.value)}
            className="w-full bg-navy-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os vendedores</option>
            {options?.salespeople.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Região</label>
          <select
            value={filters.region}
            onChange={(e) => setFilter('region', e.target.value)}
            className="w-full bg-navy-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todas as regiões</option>
            {options?.regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="w-full h-[30px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
};
