import React from 'react';
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
import { Award, MapPin, Users } from 'lucide-react';
import { api, formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '../lib/api';
import { useFilters } from '../context/FilterContext';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyDataState,
  LoadingState,
} from '../components/ui/Primitives';

export const SalespeoplePage: React.FC = () => {
  const { filters, setFilter } = useFilters();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => api.getDashboard(filters),
  });

  if (isLoading) {
    return <LoadingState message="Calculando ranking e produtividade da equipe comercial..." />;
  }

  if (!data || !data.has_data) {
    return <EmptyDataState />;
  }

  const team = data.salesperson_performance;
  const hasCost = data.kpis.has_cost_data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Desempenho de Vendedores e Regiões</h1>
            <Badge variant="electric">{team.length} executivos avaliados</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Análise de faturamento individual, ticket médio por pedido, desvio em relação à média do time e distribuição
            regional.
          </p>
        </div>
      </div>

      {/* Salesperson Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {team.map((sp, idx) => (
          <Card
            key={sp.salesperson}
            className={`p-4 cursor-pointer hover:border-blue-500/60 transition-colors ${
              idx === 0 ? 'border-blue-500/50 bg-blue-950/10' : ''
            }`}
          >
            <div
              onClick={() =>
                setFilter('salesperson', filters.salesperson === sp.salesperson ? 'all' : sp.salesperson)
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono text-slate-400">#{idx + 1} no Ranking</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{sp.salesperson}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    {sp.region}
                  </p>
                </div>
                {idx === 0 && <Award className="w-5 h-5 text-amber-400 shrink-0" />}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Receita Líquida:</span>
                  <span className="font-semibold text-white">{formatCurrency(sp.net_revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pedidos Únicos:</span>
                  <span className="text-slate-200">{sp.orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ticket Médio:</span>
                  <span className="text-slate-200">{formatCurrency(sp.average_ticket)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">vs. Média Time:</span>
                  <Badge variant={sp.vs_team_avg_pct >= 0 ? 'positive' : 'negative'}>
                    {formatPercent(sp.vs_team_avg_pct, true)}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart: Revenue vs Average Ticket */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento Líquido vs. Ticket Médio por Vendedor</CardTitle>
          <CardDescription>
            Comparativo entre o volume total gerado e o valor médio por pedido fechado
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={team} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="salesperson" stroke="#94A3B8" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="#3B82F6"
                fontSize={11}
                tickFormatter={(v) => formatCompactCurrency(v)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#A855F7"
                fontSize={11}
                tickFormatter={(v) => formatCompactCurrency(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1326',
                  borderColor: '#1E293B',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'net_revenue' ? 'Faturamento Líquido' : 'Ticket Médio',
                ]}
              />
              <Legend formatter={(v) => (v === 'net_revenue' ? 'Faturamento Líquido' : 'Ticket Médio')} />
              <Bar yAxisId="left" dataKey="net_revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="average_ticket"
                stroke="#A855F7"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Salesperson Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tabela Consolidada da Equipe Comercial</CardTitle>
          <CardDescription>Indicadores auditáveis de produtividade individual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950 text-slate-400">
                <tr>
                  <th className="py-3 px-3">Vendedor</th>
                  <th className="py-3 px-3">Região</th>
                  <th className="py-3 px-3">Principal Categoria</th>
                  <th className="py-3 px-3 text-right">Pedidos</th>
                  <th className="py-3 px-3 text-right">Itens Vendidos</th>
                  <th className="py-3 px-3 text-right">Ticket Médio</th>
                  <th className="py-3 px-3 text-right">Descontos</th>
                  <th className="py-3 px-3 text-right">Faturamento Líquido</th>
                  <th className="py-3 px-3 text-right">Margem Bruta</th>
                  <th className="py-3 px-3 text-right">Share (%)</th>
                  <th className="py-3 px-3 text-right">Desvio vs. Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {team.map((sp) => (
                  <tr key={sp.salesperson} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{sp.salesperson}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{sp.region}</td>
                    <td className="py-3 px-3 text-slate-300">{sp.top_category}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{formatNumber(sp.orders)}</td>
                    <td className="py-3 px-3 text-right text-slate-300">{formatNumber(sp.items_sold)}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{formatCurrency(sp.average_ticket)}</td>
                    <td className="py-3 px-3 text-right text-slate-400">{formatCurrency(sp.discounts)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">
                      {formatCurrency(sp.net_revenue)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200">
                      {hasCost ? formatPercent(sp.margin_pct) : 'Indisponível'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">{formatPercent(sp.share_pct)}</td>
                    <td className="py-3 px-3 text-right">
                      <Badge variant={sp.vs_team_avg_pct >= 0 ? 'positive' : 'negative'}>
                        {formatPercent(sp.vs_team_avg_pct, true)}
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
