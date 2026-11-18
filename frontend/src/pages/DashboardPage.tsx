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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Bot, Sparkles } from 'lucide-react';
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

const EDITORIAL_PALETTE = ['#C56B3D', '#D9856C', '#537A60', '#8C7A6B', '#E9B29B', '#4A4944'];

export const DashboardPage: React.FC = () => {
  const { filters, setFilter } = useFilters();
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
    return <LoadingState message="Processando balanço comercial e séries históricas..." />;
  }

  if (error) {
    return (
      <Card className="p-6 border-crimson/40 bg-crimson-light text-crimson">
        <p className="font-display font-bold">Falha ao compilar o Panorama Executivo</p>
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
  const topCategory = data.sales_by_category[0];
  const topProduct = data.top_products[0];
  const topSeller = data.salesperson_performance[0];

  return (
    <div className="space-y-10">
      {/* 1. Editorial Masthead Title */}
      <EditorialSectionTitle
        index="01"
        kicker="PANORAMA EXECUTIVO & BALANÇO COMERCIAL"
        title="Desempenho Consolidado de Vendas"
        subtitle={`Análise determinística referente ao período ${kpis.period_label}, confrontada com a janela anterior equivalente (${kpis.previous_period_label}).`}
        rightContent={
          <>
            <Link to="/analise">
              <Button variant="secondary" size="sm">
                <Sparkles className="w-3.5 h-3.5 text-burnt" />
                Inteligência Comercial
              </Button>
            </Link>
            <Link to="/assistente">
              <Button variant="primary" size="sm">
                <Bot className="w-3.5 h-3.5" />
                Consultar Mesa Analítica IA
              </Button>
            </Link>
          </>
        }
      />

      {/* 2. Asymmetric Hero Financial Ledger (Headline Metric + Structured Ledger Block) */}
      <div className="bg-surface border border-sand rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-sand">
          {/* Primary Spotlight: Net Revenue & Period Growth */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-cream-soft">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-burnt">
                  INDICADOR PRINCIPAL // RECEITA LÍQUIDA
                </span>
                <Badge variant="burnt">Auditado</Badge>
              </div>

              <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-ink">
                  {formatCurrency(kpis.net_revenue)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <DeltaBadge value={kpis.revenue_growth_pct} suffix="vs. janela anterior" />
                {kpis.previous_net_revenue !== null && (
                  <span className="font-mono text-xs text-warmgray">
                    (Base ant.: {formatCompactCurrency(kpis.previous_net_revenue)})
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-sand grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-warmgray">Faturamento Bruto</p>
                <p className="font-mono font-semibold text-ink mt-0.5">{formatCurrency(kpis.gross_revenue)}</p>
              </div>
              <div>
                <p className="text-warmgray">Descontos Concedidos</p>
                <p className="font-mono font-semibold text-crimson mt-0.5">
                  - {formatCurrency(kpis.total_discounts)}
                </p>
              </div>
            </div>
          </div>

          {/* Right Ledger: 4 Key Commercial Indicators in Asymmetric Editorial Cells */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-sand">
            <div className="divide-y divide-sand flex flex-col justify-between">
              {/* Cell 1: Número de Pedidos & Volume */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-warmgray">
                    VOLUME TRANSACIONAL // PEDIDOS ÚNICOS
                  </p>
                  <p className="font-mono text-2xl font-bold text-ink mt-2">
                    {formatNumber(kpis.total_orders)}{' '}
                    <span className="text-xs font-normal text-warmgray">pedidos</span>
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-sand/60">
                  <DeltaBadge value={kpis.orders_growth_pct} />
                  <span className="font-mono text-warmgray">
                    {formatNumber(kpis.total_items_sold)} un. expedidas
                  </span>
                </div>
              </div>

              {/* Cell 2: Ticket Médio */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-warmgray">
                    VALOR POR TRANSAÇÃO // TICKET MÉDIO
                  </p>
                  <p className="font-mono text-2xl font-bold text-ink mt-2">
                    {formatCurrency(kpis.average_ticket)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-sand/60">
                  <DeltaBadge value={kpis.ticket_growth_pct} />
                  <span className="text-warmgray">Receita Líq. ÷ Pedidos</span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-sand flex flex-col justify-between">
              {/* Cell 3: Lucro Bruto Estimado */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-warmgray">
                    RESULTADO OPERACIONAL // LUCRO BRUTO ESTIMADO
                  </p>
                  <p className="font-mono text-2xl font-bold text-ink mt-2">
                    {kpis.has_cost_data ? formatCurrency(kpis.gross_profit) : 'Indisponível'}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-sand/60">
                  {kpis.has_cost_data ? (
                    <>
                      <DeltaBadge value={kpis.profit_growth_pct} />
                      <span className="font-mono text-warmgray">
                        Custo: {formatCompactCurrency(kpis.total_cost)}
                      </span>
                    </>
                  ) : (
                    <span className="text-warmgray">Planilha sem coluna de custo unitário</span>
                  )}
                </div>
              </div>

              {/* Cell 4: Margem de Lucro */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-warmgray">
                    EFICIÊNCIA COMERCIAL // MARGEM BRUTA
                  </p>
                  <div className="flex items-baseline gap-2.5 mt-2">
                    <p
                      className={`font-mono text-2xl font-bold ${
                        !kpis.has_cost_data
                          ? 'text-warmgray'
                          : (kpis.profit_margin_pct ?? 0) >= 25
                          ? 'text-sage'
                          : 'text-burnt'
                      }`}
                    >
                      {kpis.has_cost_data ? formatPercent(kpis.profit_margin_pct) : 'Indisponível'}
                    </p>
                    {kpis.has_cost_data && (
                      <Badge variant={(kpis.profit_margin_pct ?? 0) >= 25 ? 'sage' : 'coral'}>
                        {(kpis.profit_margin_pct ?? 0) >= 25 ? 'Saudável' : 'Atenção'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-sand/60">
                  <span className="text-warmgray">Lucro Bruto ÷ Receita Líquida</span>
                  <span className="font-mono text-ink font-medium">
                    {kpis.revenue_growth_pct !== null
                      ? `Cresc. Geral: ${formatPercent(kpis.revenue_growth_pct, true)}`
                      : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Editorial Synthesis Strip Under Ledger */}
        <div className="bg-cream-warm px-6 py-3 border-t border-sand flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span>
              <strong className="font-mono uppercase text-[10px] text-burnt mr-1.5">Líder de Categoria:</strong>
              <span className="font-medium text-ink">{topCategory?.category ?? '-'}</span>{' '}
              <span className="font-mono text-warmgray">({formatPercent(topCategory?.share_pct)} da receita)</span>
            </span>
            <span>
              <strong className="font-mono uppercase text-[10px] text-burnt mr-1.5">SKU Principal:</strong>
              <span className="font-medium text-ink">{topProduct?.product ?? '-'}</span>
            </span>
            <span>
              <strong className="font-mono uppercase text-[10px] text-burnt mr-1.5">Executivo Líder:</strong>
              <span className="font-medium text-ink">{topSeller?.salesperson ?? '-'}</span>{' '}
              <span className="font-mono text-warmgray">({topSeller?.region ?? '-'})</span>
            </span>
          </div>
          <Link
            to="/relatorios"
            className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-burnt hover:underline"
          >
            <span>Abrir Dossiê Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 3. Wide Time-Series Composition + Period Comparison */}
      <section>
        <EditorialSubheader
          rubric="SÉRIE TEMPORAL & DINÂMICA DE RECEITA"
          title="Evolução do Faturamento e Comparação entre Períodos"
          description="Trajetória da receita líquida (laranja queimado), lucro bruto estimado (verde sálvia) e linha de referência do período anterior"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Wide Primary Chart (7 cols) */}
          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Trajetória de Receita Líquida vs. Lucro Bruto</CardTitle>
                <CardDescription>Evolução consolidada ao longo dos {data.revenue_evolution.length} períodos</CardDescription>
              </div>
              <span className="font-mono text-[11px] text-warmgray">Valores em R$</span>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue_evolution} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="burntGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C56B3D" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#C56B3D" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="sageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#537A60" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#537A60" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D8" />
                  <XAxis dataKey="period" stroke="#77756F" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#77756F"
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
                      name === 'net_revenue' ? 'Receita Líquida' : 'Lucro Bruto Estimado',
                    ]}
                  />
                  <Legend
                    formatter={(v) => (v === 'net_revenue' ? 'Receita Líquida' : 'Lucro Bruto Estimado')}
                  />
                  <Area
                    type="monotone"
                    dataKey="net_revenue"
                    stroke="#C56B3D"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#burntGrad)"
                    isAnimationActive={false}
                  />
                  {kpis.has_cost_data && (
                    <Area
                      type="monotone"
                      dataKey="gross_profit"
                      stroke="#537A60"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#sageGrad)"
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Period-over-Period Comparison Chart (5 cols) */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Confronto Direto entre Períodos</CardTitle>
              <CardDescription>Barras: Período analisado • Linha tracejada: Período imediatamente anterior</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.revenue_evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D8" />
                  <XAxis dataKey="period" stroke="#77756F" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#77756F"
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
                      name === 'net_revenue' ? 'Período Atual' : 'Período Anterior',
                    ]}
                  />
                  <Legend formatter={(v) => (v === 'net_revenue' ? 'Período Atual' : 'Período Anterior')} />
                  <Bar dataKey="net_revenue" fill="#E9B29B" stroke="#C56B3D" strokeWidth={1} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Line
                    type="monotone"
                    dataKey="previous_net_revenue"
                    stroke="#252722"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#252722' }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Category Visual Composition + Top Products Compact Table & Chart */}
      <section>
        <EditorialSubheader
          rubric="ARQUITETURA DE RECEITA // CATEGORIAS E PRODUTOS"
          title="Participação por Categoria e Ranking de Produtos"
          description="Clique em qualquer categoria ou SKU para filtrar instantaneamente toda a plataforma"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Category Visual Comparison Block (5 cols) */}
          <Card className="lg:col-span-5 flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Desempenho por Categoria Comercial</CardTitle>
              <CardDescription>Participação relativa no faturamento, margem e ritmo de expansão</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 flex-1">
              {data.sales_by_category.map((cat, idx) => {
                const barColor = EDITORIAL_PALETTE[idx % EDITORIAL_PALETTE.length];
                const isSelected = filters.category === cat.category;
                return (
                  <div
                    key={cat.category}
                    onClick={() => setFilter('category', isSelected ? 'all' : cat.category)}
                    className={`p-3.5 rounded-md border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-burnt-light/60 border-burnt'
                        : 'bg-cream-soft hover:bg-cream-warm/60 border-sand'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: barColor }}
                        />
                        <span className="font-display font-bold text-sm text-ink">{cat.category}</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-ink">
                        {formatCurrency(cat.net_revenue)}
                      </span>
                    </div>

                    {/* Editorial Proportion Bar */}
                    <div className="w-full h-2 bg-sand rounded-full overflow-hidden my-2.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(Math.max(cat.share_pct, 3), 100)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-warmgray font-mono">
                      <span>
                        Share: <strong className="text-ink">{formatPercent(cat.share_pct)}</strong> • {cat.orders} ped.
                      </span>
                      <div className="flex items-center gap-3">
                        {kpis.has_cost_data && cat.margin_pct !== null && (
                          <span>Margem: {formatPercent(cat.margin_pct)}</span>
                        )}
                        <DeltaBadge value={cat.growth_pct} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top Products Chart + Compact Ledger Table (7 cols) */}
          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Produtos Mais Vendidos (Top SKUs)</CardTitle>
                <CardDescription>Composição visual de faturamento e demonstrativo compacto de margens</CardDescription>
              </div>
              <Link to="/produtos" className="font-mono text-xs text-burnt hover:underline">
                Ver catálogo completo →
              </Link>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.top_products.slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D8" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#77756F"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => formatCompactCurrency(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="product"
                      stroke="#252722"
                      fontSize={11}
                      width={165}
                      tickLine={false}
                      tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 22)}…` : v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E8E2D8',
                        borderRadius: '0.375rem',
                        color: '#252722',
                        fontSize: '12px',
                      }}
                      formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), 'Receita Líquida']}
                    />
                    <Bar dataKey="net_revenue" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                      {data.top_products.slice(0, 6).map((entry, idx) => (
                        <Cell
                          key={entry.product}
                          fill={idx === 0 ? '#C56B3D' : idx === 1 ? '#D9856C' : '#E9B29B'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Compact Editorial Table */}
              <div className="overflow-x-auto border-t border-sand pt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-sand font-mono text-[10px] uppercase tracking-wider text-warmgray">
                      <th className="py-2 pr-3">Produto / SKU</th>
                      <th className="py-2 px-3 text-right">Unidades</th>
                      <th className="py-2 px-3 text-right">Receita Líquida</th>
                      <th className="py-2 px-3 text-right">Margem</th>
                      <th className="py-2 pl-3 text-right">Variação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand/70">
                    {data.top_products.slice(0, 5).map((p) => (
                      <tr
                        key={p.product}
                        onClick={() => setFilter('product', filters.product === p.product ? 'all' : p.product)}
                        className="hover:bg-cream-warm/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-ink">{p.product}</p>
                          <p className="text-[11px] text-warmgray">{p.category}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-ink">
                          {formatNumber(p.items_sold)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                          {formatCurrency(p.net_revenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {kpis.has_cost_data && p.margin_pct !== null ? (
                            <span className={p.margin_pct < 15 ? 'text-crimson font-semibold' : 'text-sage'}>
                              {formatPercent(p.margin_pct)}
                            </span>
                          ) : (
                            <span className="text-warmgray">N/D</span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <DeltaBadge value={p.growth_pct} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5. Salesperson Performance & Regional Ledger */}
      <section>
        <EditorialSubheader
          rubric=" PRODUTIVIDADE DE CAMPO & GEOGRAFIA"
          title="Desempenho de Vendedores e Distribuição Regional"
          description="produtividade individual confrontada com a média da equipe e participação por território"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Salesperson Chart (7 cols) */}
          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Receita Líquida por Executivo de Vendas</CardTitle>
                <CardDescription>Destaque em laranja queimado para performances acima da média da equipe</CardDescription>
              </div>
              <Link to="/vendedores" className="font-mono text-xs text-burnt hover:underline">
                Análise de equipe →
              </Link>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.salesperson_performance} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D8" vertical={false} />
                  <XAxis dataKey="salesperson" stroke="#252722" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#77756F"
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
                    formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), 'Receita Líquida']}
                  />
                  <Bar dataKey="net_revenue" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {data.salesperson_performance.map((sp) => (
                      <Cell
                        key={sp.salesperson}
                        fill={sp.vs_team_avg_pct >= 0 ? '#C56B3D' : '#E9B29B'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Compact Regional Table & Comparison (5 cols) */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Balanço por Região Geográfica</CardTitle>
              <CardDescription>Volume de pedidos únicos, ticket médio e participação territorial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-sand font-mono text-[10px] uppercase tracking-wider text-warmgray">
                      <th className="py-2 pr-2">Região</th>
                      <th className="py-2 px-2 text-right">Pedidos</th>
                      <th className="py-2 px-2 text-right">Ticket Médio</th>
                      <th className="py-2 px-2 text-right">Receita Líquida</th>
                      <th className="py-2 pl-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand/70">
                    {data.sales_by_region.map((reg) => (
                      <tr
                        key={reg.region}
                        onClick={() => setFilter('region', filters.region === reg.region ? 'all' : reg.region)}
                        className="hover:bg-cream-warm/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 pr-2 font-semibold text-ink">{reg.region}</td>
                        <td className="py-3 px-2 text-right font-mono text-warmgray">{reg.orders}</td>
                        <td className="py-3 px-2 text-right font-mono text-ink">
                          {formatCurrency(reg.average_ticket)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-semibold text-ink">
                          {formatCurrency(reg.net_revenue)}
                        </td>
                        <td className="py-3 pl-2 text-right font-mono text-burnt font-semibold">
                          {formatPercent(reg.share_pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};
