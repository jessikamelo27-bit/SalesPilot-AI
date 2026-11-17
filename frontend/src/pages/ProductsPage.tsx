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
import { ArrowUpDown, Package, Search } from 'lucide-react';
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
    return <LoadingState message="Carregando matriz de rentabilidade por produto..." />;
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Desempenho de Produtos</h1>
            <Badge variant="electric">{data.top_products.length} SKUs ativos</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Análise detalhada de volume, faturamento líquido, descontos, custo, margem bruta e variação entre períodos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar produto ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-navy-850 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
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
            Unidades
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
            Crescimento (%)
          </Button>
        </div>
      </div>

      {/* Product Revenue & Margin Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz Receita Líquida vs. Margem de Lucro por Produto</CardTitle>
          <CardDescription>
            Compare o volume financeiro gerado por cada SKU com sua respectiva margem percentual
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredProducts} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                dataKey="product"
                stroke="#94A3B8"
                fontSize={11}
                tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 16)}…` : v)}
              />
              <YAxis
                yAxisId="left"
                stroke="#3B82F6"
                fontSize={11}
                tickFormatter={(v) => formatCompactCurrency(v)}
              />
              {hasCost && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10B981"
                  fontSize={11}
                  tickFormatter={(v) => `${v}%`}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1326',
                  borderColor: '#1E293B',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  name === 'net_revenue' ? formatCurrency(value) : formatPercent(value),
                  name === 'net_revenue' ? 'Faturamento Líquido' : 'Margem Bruta (%)',
                ]}
              />
              <Legend
                formatter={(v) => (v === 'net_revenue' ? 'Faturamento Líquido' : 'Margem de Lucro (%)')}
              />
              <Bar yAxisId="left" dataKey="net_revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              {hasCost && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margin_pct"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Complete Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tabela Analítica de Produtos</CardTitle>
          <CardDescription>Clique em um produto para filtrar o recorte global se desejar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950 text-slate-400">
                <tr>
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3 text-right">Qtd. Vendida</th>
                  <th className="py-3 px-3 text-right">Pedidos</th>
                  <th className="py-3 px-3 text-right">Preço Médio</th>
                  <th className="py-3 px-3 text-right">Descontos</th>
                  <th className="py-3 px-3 text-right">Receita Líquida</th>
                  <th className="py-3 px-3 text-right">Lucro Bruto</th>
                  <th className="py-3 px-3 text-right">Margem (%)</th>
                  <th className="py-3 px-3 text-right">Share (%)</th>
                  <th className="py-3 px-3 text-right">Variação</th>
                  <th className="py-3 px-3 text-center">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.product}
                    onClick={() => setFilter('product', filters.product === p.product ? 'all' : p.product)}
                    className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{p.product}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{p.category}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{formatNumber(p.items_sold)}</td>
                    <td className="py-3 px-3 text-right text-slate-300">{formatNumber(p.orders)}</td>
                    <td className="py-3 px-3 text-right text-slate-300">{formatCurrency(p.avg_unit_price)}</td>
                    <td className="py-3 px-3 text-right text-slate-400">{formatCurrency(p.discounts)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">
                      {formatCurrency(p.net_revenue)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200">
                      {hasCost ? formatCurrency(p.gross_profit) : 'Indisponível'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {hasCost && p.margin_pct !== null ? (
                        <span
                          className={`font-semibold ${
                            p.margin_pct < 15
                              ? 'text-rose-400'
                              : p.margin_pct >= 50
                              ? 'text-emerald-400'
                              : 'text-slate-200'
                          }`}
                        >
                          {formatPercent(p.margin_pct)}
                        </span>
                      ) : (
                        <span className="text-slate-500">N/D</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">{formatPercent(p.share_pct)}</td>
                    <td className="py-3 px-3 text-right">
                      {p.growth_pct !== null ? (
                        <span className={p.growth_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {formatPercent(p.growth_pct, true)}
                        </span>
                      ) : (
                        <span className="text-slate-500">N/D</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant={
                          p.status === 'crescimento'
                            ? 'positive'
                            : p.status === 'queda'
                            ? 'negative'
                            : p.status === 'atencao_margem'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {p.status === 'crescimento'
                          ? 'Em Expansão'
                          : p.status === 'queda'
                          ? 'Em Queda'
                          : p.status === 'atencao_margem'
                          ? 'Margem Baixa'
                          : 'Estável'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
