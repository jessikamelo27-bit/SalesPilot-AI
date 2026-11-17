import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronDown, ChevronUp, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';
import { useFilters } from '../../context/FilterContext';
import { Badge, Button } from '../ui/Primitives';

export const FilterBar: React.FC = () => {
  const { filters, setFilter, resetFilters, hasActiveFilters } = useFilters();
  const [expandedMobile, setExpandedMobile] = useState(false);

  const { data: options } = useQuery({
    queryKey: ['filter-options'],
    queryFn: api.getFilterOptions,
  });

  const periodText =
    filters.start_date || filters.end_date
      ? `${filters.start_date || options?.min_date || 'Início'} → ${filters.end_date || options?.max_date || 'Fim'}`
      : options?.min_date && options?.max_date
      ? `${options.min_date} → ${options.max_date} (Série Completa)`
      : 'Sem período carregado';

  return (
    <section className="bg-cream-warm/75 border-b border-sand">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-8 py-3">
        {/* Top Summary Line for Mobile / Period Context */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-sand/80">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-burnt">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Recorte Analítico Ativo
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink bg-surface px-2.5 py-0.5 rounded border border-sand">
              <Calendar className="w-3.5 h-3.5 text-burnt" />
              Janela: <strong>{periodText}</strong>
            </span>
            {hasActiveFilters && (
              <Badge variant="burnt">Filtro Segmentado Aplicado</Badge>
            )}
            {options && !options.has_cost_data && options.total_records > 0 && (
              <Badge variant="neutral">Custo unitário ausente na planilha (Lucro/Margem suprimidos)</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={resetFilters} className="h-7 text-[11px]">
                <RotateCcw className="w-3 h-3 text-burnt" />
                Redefinir Recorte
              </Button>
            )}
            <button
              type="button"
              onClick={() => setExpandedMobile(!expandedMobile)}
              className="lg:hidden inline-flex items-center gap-1 font-mono text-xs text-ink bg-surface px-2.5 py-1 rounded border border-sand"
            >
              <span>Filtros</span>
              {expandedMobile ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div
          className={`${
            expandedMobile ? 'grid' : 'hidden lg:grid'
          } grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end`}
        >
          <div>
            <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={filters.start_date}
              min={options?.min_date || undefined}
              max={options?.max_date || undefined}
              onChange={(e) => setFilter('start_date', e.target.value)}
              className="w-full bg-surface border border-sand-strong rounded px-2.5 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-burnt"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={filters.end_date}
              min={options?.min_date || undefined}
              max={options?.max_date || undefined}
              onChange={(e) => setFilter('end_date', e.target.value)}
              className="w-full bg-surface border border-sand-strong rounded px-2.5 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-burnt"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-1">
              Categoria Comercial
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
              className="w-full bg-surface border border-sand-strong rounded px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-burnt"
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
            <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-1">
              Produto / SKU
            </label>
            <select
              value={filters.product}
              onChange={(e) => setFilter('product', e.target.value)}
              className="w-full bg-surface border border-sand-strong rounded px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-burnt"
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
            <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-1">
              Executivo de Vendas
            </label>
            <select
              value={filters.salesperson}
              onChange={(e) => setFilter('salesperson', e.target.value)}
              className="w-full bg-surface border border-sand-strong rounded px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-burnt"
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
            <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-1">
              Região / Território
            </label>
            <select
              value={filters.region}
              onChange={(e) => setFilter('region', e.target.value)}
              className="w-full bg-surface border border-sand-strong rounded px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-burnt"
            >
              <option value="all">Todas as regiões</option>
              {options?.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
};
