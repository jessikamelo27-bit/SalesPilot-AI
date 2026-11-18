import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
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
  DeltaBadge,
  EditorialSectionTitle,
  EditorialSubheader,
  EmptyDataState,
  LoadingState,
} from '../components/ui/Primitives';

export const ReportsPage: React.FC = () => {
  const { filters } = useFilters();

  const { data, isLoading } = useQuery({
    queryKey: ['executive-report', filters],
    queryFn: () => api.getExecutiveReport(filters),
  });

  if (isLoading) {
    return <LoadingState message="Diagramando dossiê executivo e tabelas demonstrativas..." />;
  }

  if (!data || data.kpis.total_orders === 0) {
    return <EmptyDataState />;
  }

  const csvUrl = api.getCsvExportUrl(filters);
  const pdfUrl = api.getPdfExportUrl(filters);

  return (
    <div className="space-y-10">
      {/* 1. Editorial Header & Export Controls */}
      <EditorialSectionTitle
        index="07"
        kicker="PUBLICAÇÃO ANALÍTICA & EXPORTAÇÃO AUDITÁVEL"
        title="Dossiê Executivo de Desempenho Comercial"
        subtitle={`Documento consolidado emitido em ${data.generated_at} respeitando integralmente o recorte analítico ativo.`}
        rightContent={
          <>
            <a href={csvUrl} download>
              <Button variant="secondary" size="sm">
                <FileSpreadsheet className="w-4 h-4 text-sage" />
                Exportar Dados (.CSV)
              </Button>
            </a>
            <a href={pdfUrl} download>
              <Button variant="primary" size="sm">
                <Download className="w-4 h-4" />
                Exportar Dossiê Editorial (.PDF)
              </Button>
            </a>
          </>
        }
      />

      {/* 2. Dossier Cover & Executive Summary */}
      <div className="bg-surface border border-sand rounded-lg overflow-hidden">
        <div className="h-2 bg-burnt w-full" />
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-sand">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-burnt">
                CAPÍTULO I // SÍNTESE EXECUTIVA DO PERÍODO
              </p>
              <h2 className="font-display text-xl font-bold text-ink mt-1">
                Panorama Financeiro e Trajetória Operacional
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[11px]">
              <Badge variant="neutral">Período: {data.applied_filters.start_date} → {data.applied_filters.end_date}</Badge>
              <Badge variant="neutral">Categoria: {data.applied_filters.category}</Badge>
              <Badge variant="neutral">Região: {data.applied_filters.region}</Badge>
            </div>
          </div>

          <p className="text-sm text-ink leading-relaxed max-w-4xl">{data.executive_summary}</p>

          {/* Numerical Highlights Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pt-2">
            <div className="p-4 rounded bg-cream-soft border border-sand">
              <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">Receita Bruta</p>
              <p className="font-mono text-base font-bold text-ink mt-1">
                {formatCurrency(data.kpis.gross_revenue)}
              </p>
            </div>
            <div className="p-4 rounded bg-cream-soft border border-sand">
              <p className="font-mono text-[10px] uppercase tracking-wider text-burnt">Receita Líquida</p>
              <p className="font-mono text-base font-bold text-burnt mt-1">
                {formatCurrency(data.kpis.net_revenue)}
              </p>
            </div>
            <div className="p-4 rounded bg-cream-soft border border-sand">
              <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">Pedidos Únicos</p>
              <p className="font-mono text-base font-bold text-ink mt-1">
                {formatNumber(data.kpis.total_orders)}
              </p>
            </div>
            <div className="p-4 rounded bg-cream-soft border border-sand">
              <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">Ticket Médio</p>
              <p className="font-mono text-base font-bold text-ink mt-1">
                {formatCurrency(data.kpis.average_ticket)}
              </p>
            </div>
            <div className="p-4 rounded bg-cream-soft border border-sand">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sage">Lucro Bruto</p>
              <p className="font-mono text-base font-bold text-sage mt-1">
                {data.kpis.has_cost_data ? formatCurrency(data.kpis.gross_profit) : 'Indisponível'}
              </p>
            </div>
            <div className="p-4 rounded bg-cream-soft border border-sand">
              <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">Margem Bruta</p>
              <p className="font-mono text-base font-bold text-ink mt-1">
                {data.kpis.has_cost_data ? formatPercent(data.kpis.profit_margin_pct) : 'Indisponível'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Embedded Visual Chart + Time-Series Table */}
      <section>
        <EditorialSubheader
          rubric="CAPÍTULO II // COMPORTAMENTO TEMPORAL"
          title="Curva de Receita Líquida e Série Mensal Auditada"
          description="Representação gráfica acompanhada da memória de cálculo por período"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Composição Gráfica da Evolução</CardTitle>
              <CardDescription>Curva de receita líquida consolidada no recorte selecionado</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue_evolution} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C56B3D" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#C56B3D" stopOpacity={0.02} />
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
                    formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), 'Receita Líquida']}
                  />
                  <Area
                    type="monotone"
                    dataKey="net_revenue"
                    stroke="#C56B3D"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#reportArea)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-5 overflow-hidden">
            <CardHeader>
              <CardTitle>Memória de Cálculo Temporal</CardTitle>
              <CardDescription>Volume de pedidos únicos, unidades e receita por período</CardDescription>
            </CardHeader>
            <div className="overflow-y-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-cream-warm text-warmgray font-mono text-[10px] uppercase sticky top-0 border-b border-sand">
                  <tr>
                    <th className="py-2.5 px-4">Período</th>
                    <th className="py-2.5 px-3 text-right">Pedidos</th>
                    <th className="py-2.5 px-3 text-right">Itens</th>
                    <th className="py-2.5 px-4 text-right">Receita Líquida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand bg-surface">
                  {data.revenue_evolution.map((pt) => (
                    <tr key={pt.period} className="hover:bg-cream-soft">
                      <td className="py-2 px-4 font-mono font-semibold text-ink">{pt.period}</td>
                      <td className="py-2 px-3 text-right font-mono text-warmgray">{pt.orders}</td>
                      <td className="py-2 px-3 text-right font-mono text-warmgray">
                        {formatNumber(pt.items_sold)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-burnt">
                        {formatCurrency(pt.net_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. Products, Categories & Salespeople Tables */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 overflow-hidden">
          <CardHeader className="bg-cream-soft">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-burnt">
              CAPÍTULO III // DESEMPENHO DE PRODUTOS
            </p>
            <CardTitle className="mt-0.5">Demonstrativo por Produto / SKU</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-warm text-warmgray font-mono text-[10px] uppercase border-b border-sand">
                <tr>
                  <th className="py-2.5 px-4">Produto</th>
                  <th className="py-2.5 px-3 text-right">Unidades</th>
                  <th className="py-2.5 px-3 text-right">Receita Líquida</th>
                  <th className="py-2.5 px-3 text-right">Margem</th>
                  <th className="py-2.5 px-4 text-right">Variação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand bg-surface">
                {data.top_products.map((p) => (
                  <tr key={p.product} className="hover:bg-cream-soft">
                    <td className="py-2.5 px-4">
                      <p className="font-semibold text-ink">{p.product}</p>
                      <p className="text-[11px] text-warmgray">{p.category}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink">{formatNumber(p.items_sold)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                      {formatCurrency(p.net_revenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-warmgray">
                      {data.kpis.has_cost_data ? formatPercent(p.margin_pct) : 'N/D'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <DeltaBadge value={p.growth_pct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="bg-cream-soft">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-burnt">
              CAPÍTULO IV // CATEGORIAS & EXECUTIVOS
            </p>
            <CardTitle className="mt-0.5">Síntese por Linha e Vendedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-2">
                Receita por Categoria:
              </p>
              <div className="space-y-2">
                {data.category_performance.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between text-xs p-2.5 rounded bg-cream-soft border border-sand"
                  >
                    <span className="font-semibold text-ink">{cat.category}</span>
                    <span className="font-mono text-ink">
                      {formatCurrency(cat.net_revenue)}{' '}
                      <span className="text-warmgray">({formatPercent(cat.share_pct)})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-2">
                Produtividade por Vendedor:
              </p>
              <div className="space-y-2">
                {data.salesperson_performance.map((sp) => (
                  <div
                    key={sp.salesperson}
                    className="flex items-center justify-between text-xs p-2.5 rounded bg-cream-soft border border-sand"
                  >
                    <span className="font-semibold text-ink">
                      {sp.salesperson} <span className="font-normal text-warmgray">({sp.region})</span>
                    </span>
                    <span className="font-mono text-ink">{formatCurrency(sp.net_revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 5. Recommendations & Investigation Notes */}
      <section>
        <EditorialSubheader
          rubric="CAPÍTULO V // CADERNO DE ENCAMINHAMENTOS"
          title="Diretrizes de Investigação Baseadas em Evidências"
          description="Síntese de prioridades operacionais amparadas nos fatos estatísticos observados"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recommendations.map((rec, idx) => (
            <Card key={idx} className="p-5 border-l-4 border-l-burnt">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 font-display font-bold text-sm text-ink">
                  <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
                  <span>{rec.area}</span>
                </div>
                <Badge variant={rec.priority === 'Alta' ? 'crimson' : 'burnt'}>
                  Prioridade {rec.priority}
                </Badge>
              </div>
              <p className="text-xs text-ink leading-relaxed">{rec.action}</p>
              <p className="font-mono text-[11px] text-warmgray mt-2.5 pt-2 border-t border-sand">
                Evidência de base: {rec.basis}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-4 p-4 rounded bg-cream-warm border border-sand flex items-start gap-2.5 text-xs text-warmgray">
          <Info className="w-4 h-4 text-burnt shrink-0 mt-0.5" />
          <span>
            Nota Editorial: As diretrizes contidas neste relatório constituem análises auxiliares fundamentadas nos
            registros históricos e não representam garantia de resultados comerciais futuros.
          </span>
        </div>
      </section>
    </div>
  );
};
