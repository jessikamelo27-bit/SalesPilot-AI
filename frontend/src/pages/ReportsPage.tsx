import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
} from 'lucide-react';
import { api, formatCurrency, formatNumber, formatPercent } from '../lib/api';
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

export const ReportsPage: React.FC = () => {
  const { filters } = useFilters();

  const { data, isLoading } = useQuery({
    queryKey: ['executive-report', filters],
    queryFn: () => api.getExecutiveReport(filters),
  });

  if (isLoading) {
    return <LoadingState message="Compilando relatório executivo consolidado..." />;
  }

  if (!data || data.kpis.total_orders === 0) {
    return <EmptyDataState />;
  }

  const csvUrl = api.getCsvExportUrl(filters);
  const pdfUrl = api.getPdfExportUrl(filters);

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Relatórios Executivos</h1>
            <Badge variant="electric">Exportação Auditável</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gerado em {data.generated_at} • Todos os quadros e arquivos exportados respeitam os filtros selecionados.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a href={csvUrl} download>
            <Button variant="secondary" size="sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Exportar Relatório (.CSV)
            </Button>
          </a>
          <a href={pdfUrl} download>
            <Button variant="primary" size="sm">
              <Download className="w-4 h-4" />
              Exportar Relatório (.PDF)
            </Button>
          </a>
        </div>
      </div>

      {/* 1. Resumo Executivo */}
      <Card className="border-blue-500/30">
        <CardHeader className="bg-blue-950/15">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>1. Resumo Executivo</span>
          </CardTitle>
          <CardDescription>Síntese consolidada do período e filtros aplicados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-200 leading-relaxed">{data.executive_summary}</p>
          <div className="p-3 rounded-lg bg-navy-900 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              As recomendações geradas pelo SalesPilot AI constituem análises auxiliares baseadas nos dados históricos
              validados e não representam garantia de resultados comerciais futuros.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Indicadores Principais */}
      <Card>
        <CardHeader>
          <CardTitle>2. Indicadores Principais do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Faturamento Bruto</p>
              <p className="text-lg font-bold text-white mt-1">{formatCurrency(data.kpis.gross_revenue)}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Total de Descontos</p>
              <p className="text-lg font-bold text-slate-300 mt-1">{formatCurrency(data.kpis.total_discounts)}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Faturamento Líquido</p>
              <p className="text-lg font-bold text-blue-400 mt-1">{formatCurrency(data.kpis.net_revenue)}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Ticket Médio (Por Pedido)</p>
              <p className="text-lg font-bold text-white mt-1">{formatCurrency(data.kpis.average_ticket)}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Pedidos Únicos</p>
              <p className="text-lg font-bold text-white mt-1">{formatNumber(data.kpis.total_orders)}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Unidades Vendidas</p>
              <p className="text-lg font-bold text-white mt-1">{formatNumber(data.kpis.total_items_sold)}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Lucro Bruto Estimado</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {data.kpis.has_cost_data ? formatCurrency(data.kpis.gross_profit) : 'Indisponível'}
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Margem Bruta (%)</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {data.kpis.has_cost_data ? formatPercent(data.kpis.profit_margin_pct) : 'Indisponível'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Evolução do Faturamento & 4. Desempenho por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>3. Evolução do Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950 text-slate-400 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Período</th>
                    <th className="py-2.5 px-3 text-right">Pedidos</th>
                    <th className="py-2.5 px-3 text-right">Itens</th>
                    <th className="py-2.5 px-3 text-right">Faturamento Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {data.revenue_evolution.map((pt) => (
                    <tr key={pt.period}>
                      <td className="py-2 px-3 font-medium text-white">{pt.period}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{pt.orders}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{formatNumber(pt.items_sold)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-blue-400">
                        {formatCurrency(pt.net_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Desempenho por Categoria e Vendedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2">Por Categoria:</p>
              <div className="space-y-1.5">
                {data.category_performance.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between text-xs p-2 rounded bg-navy-900 border border-slate-800/80"
                  >
                    <span className="font-medium text-white">{cat.category}</span>
                    <span className="text-slate-300">
                      {formatCurrency(cat.net_revenue)} ({formatPercent(cat.share_pct)})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2">Por Vendedor:</p>
              <div className="space-y-1.5">
                {data.salesperson_performance.map((sp) => (
                  <div
                    key={sp.salesperson}
                    className="flex items-center justify-between text-xs p-2 rounded bg-navy-900 border border-slate-800/80"
                  >
                    <span className="font-medium text-white">
                      {sp.salesperson} ({sp.region})
                    </span>
                    <span className="text-slate-300">
                      {formatCurrency(sp.net_revenue)} • Ticket: {formatCurrency(sp.average_ticket)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Desempenho por Produto */}
      <Card>
        <CardHeader>
          <CardTitle>5. Desempenho por Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3 text-right">Unidades</th>
                  <th className="py-2.5 px-3 text-right">Receita Líquida</th>
                  <th className="py-2.5 px-3 text-right">Margem (%)</th>
                  <th className="py-2.5 px-3 text-right">Share (%)</th>
                  <th className="py-2.5 px-3 text-right">Variação (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.top_products.map((p) => (
                  <tr key={p.product}>
                    <td className="py-2 px-3 font-medium text-white">{p.product}</td>
                    <td className="py-2 px-3 text-slate-300">{p.category}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{formatNumber(p.items_sold)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-white">{formatCurrency(p.net_revenue)}</td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {data.kpis.has_cost_data ? formatPercent(p.margin_pct) : 'N/D'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">{formatPercent(p.share_pct)}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={(p.growth_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatPercent(p.growth_pct, true)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 6. Recomendações Baseadas nos Dados */}
      <Card>
        <CardHeader>
          <CardTitle>6. Alertas e Recomendações Baseadas nos Dados</CardTitle>
          <CardDescription>Plano de ação sugerido a partir das evidências estatísticas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recommendations.map((rec, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{rec.area}</span>
                </div>
                <Badge variant={rec.priority === 'Alta' ? 'negative' : 'electric'}>
                  Prioridade {rec.priority}
                </Badge>
              </div>
              <p className="text-xs text-slate-200">{rec.action}</p>
              <p className="text-[11px] text-slate-400">Base verificada: {rec.basis}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
