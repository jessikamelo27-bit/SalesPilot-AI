import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpDown, Search } from 'lucide-react';
import { api, formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '../lib/api';
import { useFilters } from '../context/FilterContext';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DeltaBadge,
  EditorialSectionTitle,
  EditorialSubheader,
  EmptyDataState,
  LoadingState,
} from '../components/ui/Primitives';

export const ProductsPage: React.FC = () => {
  const { filters, setFilter } = useFilters();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'net_revenue' | 'items_sold' | 'margin_pct' | 'growth_pct'>('net_revenue');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => api.getDashboard(filters),
  });

  if (isLoading) {
    return <LoadingState message="Auditando matriz de rentabilidade e giro por SKU..." />;
  }

  if (!data || !data.has_data) {
    return <EmptyDataState />;
  }

  const hasCost = data.kpis.has_cost_data;

  const filteredProducts = data.top_products
    .filter(
      (p) =>
        p.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const valA = a[sortBy] ?? -999999;
      const valB = b[sortBy] ?? -999999;
      return Number(valB) - Number(valA);
    });

  return (
    <div className="space-y-10">
      <EditorialSectionTitle
        index="04"
        kicker="ARQUITETURA DE PORTFÓLIO & MARGENS"
        title="Análise de Produtos e Rentabilidade por SKU"
        subtitle="Demonstrativo comercial combinando volume expedido, receita líquida, descontos praticados, custo total e margem bruta."
        rightContent={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-warmgray absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar SKU ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-surface border border-sand-strong rounded-md pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-warmgray focus:outline-none focus:border-burnt"
              />
            </div>

            <Button
              variant={sortBy === 'net_revenue' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSortBy('net_revenue')}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Receita
            </Button>
            <Button
              variant={sortBy === 'items_sold' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSortBy('items_sold')}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Volume
            </Button>
            {hasCost && (
              <Button
                variant={sortBy === 'margin_pct' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSortBy('margin_pct')}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                Margem (%)
              </Button>
            )}
            <Button
              variant={sortBy === 'growth_pct' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSortBy('growth_pct')}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Variação (%)
            </Button>
          </div>
        }
      />

      {/* Wide Visual Composition: Net Revenue vs Profit Margin % */}
      <Card>
        <CardHeader>
          <CardTitle>Composição Receita Líquida vs. Margem de Lucro Bruta por Produto</CardTitle>
          <CardDescription>
            Barras em terracota/laranja indicam o faturamento líquido (eixo esquerdo); linha em verde sálvia indica a
            margem percentual (eixo direito)
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredProducts} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D8" />
              <XAxis
                dataKey="product"
                stroke="#252722"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 16)}…` : v)}
              />
              <YAxis
                yAxisId="left"
                stroke="#C56B3D"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => formatCompactCurrency(v)}
              />
              {hasCost && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#537A60"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E2D8',
                  borderRadius: '0.375rem',
                  color: '#252722',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  name === 'net_revenue' ? formatCurrency(value) : formatPercent(value),
                  name === 'net_revenue' ? 'Receita Líquida' : 'Margem Bruta (%)',
                ]}
              />
              <Legend
                formatter={(v) => (v === 'net_revenue' ? 'Receita Líquida (R$)' : 'Margem de Lucro (%)')}
              />
              <Bar yAxisId="left" dataKey="net_revenue" fill="#D9856C" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              {hasCost && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margin_pct"
                  stroke="#537A60"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#537A60' }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Editorial Accounting Table of Products */}
      <section>
        <EditorialSubheader
          rubric="DEMONSTRATIVO ANALÍTICO POR ITEM"
          title="Tabela Completa do Portfólio Comercial"
          description="Clique sobre qualquer linha para isolar o produto nos filtros globais"
        />

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-warm text-warmgray font-mono text-[10px] uppercase tracking-wider border-b border-sand">
                <tr>
                  <th className="py-3.5 px-4">Produto / SKU</th>
                  <th className="py-3.5 px-3">Categoria</th>
                  <th className="py-3.5 px-3 text-right">Unidades</th>
                  <th className="py-3.5 px-3 text-right">Pedidos</th>
                  <th className="py-3.5 px-3 text-right">Preço Médio</th>
                  <th className="py-3.5 px-3 text-right">Descontos</th>
                  <th className="py-3.5 px-3 text-right">Receita Líquida</th>
                  <th className="py-3.5 px-3 text-right">Lucro Bruto</th>
                  <th className="py-3.5 px-3 text-right">Margem</th>
                  <th className="py-3.5 px-3 text-right">Share</th>
                  <th className="py-3.5 px-3 text-right">Variação</th>
                  <th className="py-3.5 px-4 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand bg-surface">
                {filteredProducts.map((p, idx) => (
                  <tr
                    key={p.product}
                    onClick={() => setFilter('product', filters.product === p.product ? 'all' : p.product)}
                    className="hover:bg-cream-soft cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] text-burnt font-semibold">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-display font-bold text-ink">{p.product}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-warmgray">{p.category}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-ink">{formatNumber(p.items_sold)}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-warmgray">{formatNumber(p.orders)}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-ink">{formatCurrency(p.avg_unit_price)}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-crimson">
                      {formatCurrency(p.discounts)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-ink">
                      {formatCurrency(p.net_revenue)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-ink">
                      {hasCost ? formatCurrency(p.gross_profit) : 'Indisponível'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono">
                      {hasCost && p.margin_pct !== null ? (
                        <span
                          className={`font-semibold ${
                            p.margin_pct < 15
                              ? 'text-crimson'
                              : p.margin_pct >= 45
                              ? 'text-sage'
                              : 'text-ink'
                          }`}
                        >
                          {formatPercent(p.margin_pct)}
                        </span>
                      ) : (
                        <span className="text-warmgray">N/D</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-warmgray">
                      {formatPercent(p.share_pct)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <DeltaBadge value={p.growth_pct} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          p.status === 'crescimento'
                            ? 'sage'
                            : p.status === 'queda'
                            ? 'crimson'
                            : p.status === 'atencao_margem'
                            ? 'burnt'
                            : 'neutral'
                        }
                      >
                        {p.status === 'crescimento'
                          ? 'Expansão'
                          : p.status === 'queda'
                          ? 'Retração'
                          : p.status === 'atencao_margem'
                          ? 'Margem Comprimida'
                          : 'Estável'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
};
