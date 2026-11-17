import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bot,
  Coins,
  DollarSign,
  Layers,
  Percent,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
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
  StatCard,
} from '../components/ui/Primitives';

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];

export const DashboardPage: React.FC = () => {
  const { filters } = useFilters();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => api.getDashboard(filters),
  });

  const loadDemoMutation = useMutation({
    mutationFn: api.loadDemoData,
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (isLoading) {
    return <LoadingState message="Calculando indicadores executivos e séries temporais..." />;
  }

  if (error) {
    return (
      <Card className="p-6 border-rose-500/40 bg-rose-950/20 text-rose-200">
        <p className="font-semibold">Erro ao carregar o Dashboard Executivo</p>
        <p className="text-xs mt-1">{(error as Error).message}</p>
      </Card>
    );
  }

  if (!data || !data.has_data) {
    return (
      <EmptyDataState
        onLoadDemo={() => loadDemoMutation.mutate()}
        isLoadingDemo={loadDemoMutation.isPending}
      />
    );
  }

  const { kpis } = data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Executivo</h1>
            <Badge variant="electric">Visão Consolidada</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Janela comparativa: <span className="text-slate-200 font-medium">{kpis.period_label}</span> vs.{' '}
            <span className="text-slate-300">{kpis.previous_period_label}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/analise">
            <Button variant="secondary" size="sm">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Ver Alertas Inteligentes
            </Button>
          </Link>
          <Link to="/assistente">
            <Button variant="ai" size="sm">
              <Bot className="w-4 h-4" />
              Perguntar ao Assistente IA
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Faturamento Líquido"
          value={formatCurrency(kpis.net_revenue)}
          subtitle={`Bruto: ${formatCompactCurrency(kpis.gross_revenue)}`}
          growthPct={kpis.revenue_growth_pct}
          icon={<DollarSign className="w-5 h-5" />}
          accent="electric"
        />

        <StatCard
          title="Qtd. de Vendas (Pedidos)"
          value={formatNumber(kpis.total_orders)}
          subtitle="Pedidos únicos"
          growthPct={kpis.orders_growth_pct}
          icon={<Receipt className="w-5 h-5" />}
          accent="electric"
        />

        <StatCard
          title="Produtos Vendidos"
          value={`${formatNumber(kpis.total_items_sold)} un.`}
          subtitle={`Descontos: ${formatCompactCurrency(kpis.total_discounts)}`}
          icon={<ShoppingBag className="w-5 h-5" />}
          accent="electric"
        />

        <StatCard
          title="Ticket Médio"
          value={formatCurrency(kpis.average_ticket)}
          subtitle="Receita Líq. ÷ Pedidos"
          growthPct={kpis.ticket_growth_pct}
          icon={<Layers className="w-5 h-5" />}
          accent="electric"
        />

        <StatCard
          title="Lucro Bruto Estimado"
          value={kpis.has_cost_data ? formatCurrency(kpis.gross_profit) : 'Indisponível'}
          subtitle={kpis.has_cost_data ? `Custo: ${formatCompactCurrency(kpis.total_cost)}` : 'Planilha sem custo'}
          growthPct={kpis.profit_growth_pct}
          icon={<Coins className="w-5 h-5" />}
          accent={kpis.has_cost_data ? 'positive' : 'electric'}
        />

        <StatCard
          title="Margem de Lucro"
          value={kpis.has_cost_data ? formatPercent(kpis.profit_margin_pct) : 'Indisponível'}
          subtitle={kpis.has_cost_data ? 'Lucro Bruto ÷ Receita Líq.' : 'Sem custo cadastrado'}
          icon={<Percent className="w-5 h-5" />}
          accent={
            !kpis.has_cost_data
              ? 'electric'
              : (kpis.profit_margin_pct ?? 0) >= 25
              ? 'positive'
              : 'negative'
          }
        />
      </div>

      {/* Row 1 Charts: Evolução do Faturamento & Comparação entre Períodos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Evolução do Faturamento Líquido e Lucro Bruto</CardTitle>
              <CardDescription>Acompanhamento temporal da receita líquida e rentabilidade</CardDescription>
            </div>
            <Badge variant="electric">{data.revenue_evolution.length} períodos</Badge>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenue_evolution} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} />
                <YAxis
                  stroke="#94A3B8"
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
                    name === 'net_revenue' ? 'Faturamento Líquido' : 'Lucro Bruto',
                  ]}
                />
                <Legend
                  formatter={(v) => (v === 'net_revenue' ? 'Faturamento Líquido' : 'Lucro Bruto Estimado')}
                />
                <Area
                  type="monotone"
                  dataKey="net_revenue"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revGrad)"
                />
                {kpis.has_cost_data && (
                  <Area
                    type="monotone"
                    dataKey="gross_profit"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#profGrad)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparação entre Períodos */}
        <Card>
          <CardHeader>
            <CardTitle>Comparação entre Períodos</CardTitle>
            <CardDescription>Faturamento atual vs. período imediatamente anterior</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.revenue_evolution} margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatCompactCurrency(v)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1326',
                    borderColor: '#1E293B',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'net_revenue' ? 'Período Atual' : 'Período Anterior',
                  ]}
                />
                <Legend formatter={(v) => (v === 'net_revenue' ? 'Período Atual' : 'Período Anterior')} />
                <Bar dataKey="net_revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="previous_net_revenue"
                  stroke="#A855F7"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 Charts: Vendas por Categoria & Produtos Mais Vendidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Categoria</CardTitle>
            <CardDescription>Distribuição de faturamento líquido e participação por linha</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.sales_by_category}
                    dataKey="net_revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {data.sales_by_category.map((entry, idx) => (
                      <Cell key={entry.category} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B1326',
                      borderColor: '#1E293B',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-2.5 overflow-y-auto max-h-72 pr-1">
              {data.sales_by_category.map((cat, idx) => (
                <div
                  key={cat.category}
                  className="p-2.5 rounded-lg bg-navy-900/90 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="font-medium text-slate-200 truncate">{cat.category}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-semibold text-white">{formatCurrency(cat.net_revenue)}</p>
                    <p className="text-[11px] text-slate-400">
                      {cat.share_pct.toFixed(1)}%{' '}
                      {cat.growth_pct !== null && (
                        <span className={cat.growth_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          ({formatPercent(cat.growth_pct, true)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos (Top Faturamento)</CardTitle>
            <CardDescription>Ranking de SKUs por faturamento líquido gerado</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.top_products.slice(0, 7)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatCompactCurrency(v)} />
                <YAxis
                  type="category"
                  dataKey="product"
                  stroke="#CBD5E1"
                  fontSize={11}
                  width={150}
                  tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 20)}…` : v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1326',
                    borderColor: '#1E293B',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  formatter={(v: number) => [formatCurrency(v), 'Faturamento Líquido']}
                />
                <Bar dataKey="net_revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 Charts: Desempenho dos Vendedores & Vendas por Região */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Desempenho dos Vendedores</CardTitle>
            <CardDescription>Receita líquida consolidada por executivo comercial</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.salesperson_performance} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="salesperson" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatCompactCurrency(v)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1326',
                    borderColor: '#1E293B',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  formatter={(v: number) => [formatCurrency(v), 'Faturamento Líquido']}
                />
                <Bar dataKey="net_revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas por Região</CardTitle>
            <CardDescription>Distribuição geográfica do faturamento e ticket médio regional</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sales_by_region} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="region" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => formatCompactCurrency(v)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1326',
                    borderColor: '#1E293B',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  formatter={(v: number) => [formatCurrency(v), 'Faturamento Regional']}
                />
                <Bar dataKey="net_revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
