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
import { Award, MapPin } from 'lucide-react';
import { api, formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '../lib/api';
import { useFilters } from '../context/FilterContext';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EditorialSectionTitle,
  EditorialSubheader,
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
    return <LoadingState message="Apurando ranking individual e desvios frente à média da equipe..." />;
  }

  if (!data || !data.has_data) {
    return <EmptyDataState />;
  }

  const team = data.salesperson_performance;
  const hasCost = data.kpis.has_cost_data;

  return (
    <div className="space-y-10">
      <EditorialSectionTitle
        index="05"
        kicker="DESEMPENHO DA FORÇA DE VENDAS & TERRITÓRIOS"
        title="Produtividade Comercial por Executivo"
        subtitle="Avaliação de receita líquida, volume de pedidos únicos, ticket médio e desvio percentual em relação ao benchmark da equipe."
      />

      {/* Editorial Team Strip (Horizontal Divided Ledger instead of identical cards) */}
      <div className="bg-surface border border-sand rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-sand">
          {team.map((sp, idx) => {
            const isSelected = filters.salesperson === sp.salesperson;
            return (
              <div
                key={sp.salesperson}
                onClick={() => setFilter('salesperson', isSelected ? 'all' : sp.salesperson)}
                className={`p-5 cursor-pointer transition-colors flex flex-col justify-between ${
                  isSelected
                    ? 'bg-burnt-light/50'
                    : idx === 0
                    ? 'bg-cream-soft hover:bg-cream-warm/60'
                    : 'hover:bg-cream-soft'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-burnt">
                      POSIÇÃO #{String(idx + 1).padStart(2, '0')}
                    </span>
                    {idx === 0 && <Award className="w-4 h-4 text-burnt shrink-0" />}
                  </div>
                  <h3 className="font-display text-base font-bold text-ink mt-1">{sp.salesperson}</h3>
                  <p className="text-xs text-warmgray flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-burnt" />
                    <span>{sp.region}</span>
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-sand space-y-2 text-xs">
                  <div>
                    <p className="text-[11px] text-warmgray">Receita Líquida</p>
                    <p className="font-mono text-lg font-bold text-ink">{formatCurrency(sp.net_revenue)}</p>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-warmgray">Ticket Médio:</span>
                    <span className="text-ink font-semibold">{formatCurrency(sp.average_ticket)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] text-warmgray">vs. Média Equipe:</span>
                    <Badge variant={sp.vs_team_avg_pct >= 0 ? 'sage' : 'crimson'}>
                      {formatPercent(sp.vs_team_avg_pct, true)}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wide Visual Chart: Revenue vs Average Ticket */}
      <Card>
        <CardHeader>
          <CardTitle>Relação Volume de Receita vs. Ticket Médio por Vendedor</CardTitle>
          <CardDescription>
            Barras em laranja queimado representam a receita líquida acumulada; linha escura representa o ticket médio
            por pedido único
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={team} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D8" />
              <XAxis dataKey="salesperson" stroke="#252722" fontSize={11} tickLine={false} />
              <YAxis
                yAxisId="left"
                stroke="#C56B3D"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => formatCompactCurrency(v)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#252722"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => formatCompactCurrency(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E8E2D8',
                  borderRadius: '0.375rem',
                  color: '#252722',
                  fontSize: '12px',
                }}
                formatter={(value: unknown, name: unknown) => [
                  formatCurrency(Number(value ?? 0)),
                  name === 'net_revenue' ? 'Receita Líquida' : 'Ticket Médio',
                ]}
              />
              <Legend formatter={(v) => (v === 'net_revenue' ? 'Receita Líquida' : 'Ticket Médio por Pedido')} />
              <Bar yAxisId="left" dataKey="net_revenue" fill="#C56B3D" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="average_ticket"
                stroke="#252722"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#252722' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Salesperson Table */}
      <section>
        <EditorialSubheader
          rubric="QUADRO DEMONSTRATIVO DE EXECUTIVOS"
          title="Indicadores Auditados por Vendedor"
          description="Detalhamento de pedidos únicos, unidades vendidas, descontos concedidos e categoria âncora"
        />

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-warm text-warmgray font-mono text-[10px] uppercase tracking-wider border-b border-sand">
                <tr>
                  <th className="py-3.5 px-4">Executivo</th>
                  <th className="py-3.5 px-3">Região</th>
                  <th className="py-3.5 px-3">Categoria Âncora</th>
                  <th className="py-3.5 px-3 text-right">Pedidos</th>
                  <th className="py-3.5 px-3 text-right">Unidades</th>
                  <th className="py-3.5 px-3 text-right">Ticket Médio</th>
                  <th className="py-3.5 px-3 text-right">Descontos</th>
                  <th className="py-3.5 px-3 text-right">Receita Líquida</th>
                  <th className="py-3.5 px-3 text-right">Margem Bruta</th>
                  <th className="py-3.5 px-3 text-right">Share</th>
                  <th className="py-3.5 px-4 text-right">Desvio vs. Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand bg-surface">
                {team.map((sp) => (
                  <tr key={sp.salesperson} className="hover:bg-cream-soft transition-colors">
                    <td className="py-3.5 px-4 font-display font-bold text-ink">{sp.salesperson}</td>
                    <td className="py-3.5 px-3 text-warmgray">{sp.region}</td>
                    <td className="py-3.5 px-3 text-ink">{sp.top_category}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-ink">{formatNumber(sp.orders)}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-warmgray">
                      {formatNumber(sp.items_sold)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-ink">
                      {formatCurrency(sp.average_ticket)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-crimson">
                      {formatCurrency(sp.discounts)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-ink">
                      {formatCurrency(sp.net_revenue)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-sage">
                      {hasCost ? formatPercent(sp.margin_pct) : 'Indisponível'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-warmgray">
                      {formatPercent(sp.share_pct)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={sp.vs_team_avg_pct >= 0 ? 'sage' : 'crimson'}>
                        {formatPercent(sp.vs_team_avg_pct, true)}
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
