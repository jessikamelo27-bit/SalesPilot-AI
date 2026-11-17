import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertOctagon,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Compass,
  Eye,
  HelpCircle,
  Scale,
  Sigma,
} from 'lucide-react';
import { api, formatCurrency, formatPercent } from '../lib/api';
import { useFilters } from '../context/FilterContext';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DeltaBadge,
  EditorialSectionTitle,
  EditorialSubheader,
  EmptyDataState,
  LoadingState,
} from '../components/ui/Primitives';

export const SalesAnalysisPage: React.FC = () => {
  const { filters } = useFilters();
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const { data: analysis, isLoading: loadingAnalysis } = useQuery({
    queryKey: ['analysis', filters],
    queryFn: () => api.getAnalysis(filters),
  });

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => api.getDashboard(filters),
  });

  if (loadingAnalysis || loadingDash) {
    return <LoadingState message="Auditando variações estatísticas, margens e concentração comercial..." />;
  }

  if (!analysis || !analysis.has_data || !dashboard || !dashboard.has_data) {
    return <EmptyDataState />;
  }

  const periodAnalyzed = analysis.summary.period_analyzed || dashboard.kpis.period_label || 'Período integral';
  const comparisonPeriod =
    analysis.summary.comparison_period || dashboard.kpis.previous_period_label || 'Janela anterior';

  const topStarProduct = dashboard.top_products[0];
  const kpis = dashboard.kpis;

  // Build synthetic supplementary insight cards for Top Product Highlight and Average Ticket Shift
  // so all 6 requested analytical dimensions are always visible alongside the backend alerts
  const supplementalInsights = [
    ...(topStarProduct
      ? [
          {
            id: 'highlight_top_product',
            title: `Produto em destaque de geração de caixa: ${topStarProduct.product}`,
            category: 'produto_destaque',
            severity: 'positiva' as const,
            metric_label: 'Participação na Receita',
            metric_value: formatPercent(topStarProduct.share_pct),
            observed_fact: `O item '${topStarProduct.product}' (${topStarProduct.category}) consolidou-se como o maior gerador individual de receita líquida, somando ${formatCurrency(topStarProduct.net_revenue)} em ${topStarProduct.orders} pedidos (${topStarProduct.items_sold} unidades).`,
            statistical_justification: `Liderança absoluta no ranking de faturamento líquido (${formatPercent(topStarProduct.share_pct)} do total da operação) com preço unitário médio praticado de ${formatCurrency(topStarProduct.avg_unit_price)}.`,
            possible_explanation:
              'A elevada tração deste SKU sustenta o fluxo de caixa operacional, mas também eleva a sensibilidade da receita global ao seu desempenho.',
            investigation_hypothesis:
              'Investigar quais segmentos de clientes e vendedores mais convertem este produto para proteger contratos ativos e criar ofertas complementares (cross-sell).',
            affected_entity: topStarProduct.product,
          },
        ]
      : []),
    {
      id: 'ticket_dynamics',
      title: 'Dinâmica e comportamento do Ticket Médio por pedido',
      category: 'mudanca_ticket_medio',
      severity: (kpis.ticket_growth_pct ?? 0) < -5 ? ('media' as const) : ('positiva' as const),
      metric_label: 'Ticket Médio Atual',
      metric_value: formatCurrency(kpis.average_ticket),
      observed_fact: `O ticket médio por pedido único situou-se em ${formatCurrency(kpis.average_ticket)} (${kpis.total_orders} pedidos únicos e ${kpis.total_items_sold} itens), apresentando variação de ${formatPercent(kpis.ticket_growth_pct, true)} frente ao período anterior (${formatCurrency(kpis.previous_average_ticket)}).`,
      statistical_justification: `Razão determinística entre Receita Líquida (${formatCurrency(kpis.net_revenue)}) e Pedidos Únicos (${kpis.total_orders}), confrontada com a janela ${comparisonPeriod}.`,
      possible_explanation:
        'Oscilações no ticket médio alteram o custo de aquisição relativo por pedido e refletem mudanças no mix de categorias ou na política de descontos.',
      investigation_hypothesis:
        'Verificar se a variação decorre de alterações na quantidade média de itens por pedido ou de migração entre produtos de maior/menor valor unitário.',
      affected_entity: 'Ticket Médio Comercial',
    },
  ];

  const allInsights = [...analysis.alerts, ...supplementalInsights];
  const filteredAlerts =
    severityFilter === 'all'
      ? allInsights
      : allInsights.filter((a) => a.severity === severityFilter);

  return (
    <div className="space-y-10">
      {/* 1. Editorial Header */}
      <EditorialSectionTitle
        index="02"
        kicker="CADERNO DE DIAGNÓSTICO ESTATÍSTICO"
        title="Inteligência Comercial"
        subtitle="Identificação automatizada de produtos em destaque, retrações de demanda, categorias em expansão, mudanças no ticket médio, margens comprimidas e variações atípicas."
        rightContent={
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'alta', 'media', 'positiva'] as const).map((sev) => (
              <Button
                key={sev}
                variant={severityFilter === sev ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSeverityFilter(sev)}
              >
                {sev === 'all'
                  ? `Todos (${allInsights.length})`
                  : sev === 'alta'
                  ? `Críticos (${analysis.summary.high_severity})`
                  : sev === 'media'
                  ? `Atenção (${analysis.summary.medium_severity})`
                  : `Destaques (${allInsights.filter((x) => x.severity === 'positiva').length})`}
              </Button>
            ))}
          </div>
        }
      />

      {/* 2. Structural Indicators Strip */}
      <div className="bg-surface border border-sand rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-sand">
        <div className="p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-burnt">
            JANELA EM ANÁLISE
          </p>
          <p className="font-mono text-sm font-bold text-ink mt-1.5">{periodAnalyzed}</p>
          <p className="text-xs text-warmgray mt-1">Base comparativa: {comparisonPeriod}</p>
        </div>

        <div className="p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray">
            CONCENTRAÇÃO DE PORTFÓLIO (CR3 / CR5)
          </p>
          <p className="font-mono text-xl font-bold text-ink mt-1">
            {formatPercent(analysis.concentration_top3_pct)}{' '}
            <span className="text-xs font-normal text-warmgray">
              / {formatPercent(analysis.concentration_top5_pct)}
            </span>
          </p>
          <p className="text-xs text-warmgray mt-1">Share acumulado dos 3 e 5 maiores produtos</p>
        </div>

        <div className="p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray">
            MUDANÇA NO TICKET MÉDIO
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-xl font-bold text-ink">
              {formatCurrency(kpis.average_ticket)}
            </span>
            <DeltaBadge value={kpis.ticket_growth_pct} />
          </div>
          <p className="text-xs text-warmgray mt-1">Valor médio líquido por pedido único</p>
        </div>

        <div className="p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray">
            BENCHMARK MÉDIO DA EQUIPE
          </p>
          <p className="font-mono text-xl font-bold text-ink mt-1">
            {formatCurrency(analysis.team_average_revenue)}
          </p>
          <p className="text-xs text-warmgray mt-1">Receita líquida média por vendedor ativo</p>
        </div>
      </div>

      {/* Methodological Principle Callout */}
      <div className="bg-cream-warm border-l-4 border-l-burnt border border-sand rounded-r-lg px-5 py-3.5 flex items-start gap-3">
        <Scale className="w-4 h-4 text-burnt shrink-0 mt-0.5" />
        <p className="text-xs text-ink leading-relaxed">
          <strong className="font-display font-bold">Rigor Analítico (Correlação vs. Causalidade):</strong> Todos os
          insights abaixo são fundamentados em regras estatísticas verificáveis sobre os registros importados. O sistema
          expõe o fato matemático observado e formula hipóteses estruturadas para investigação, sem jamais atribuir
          causas externas não comprovadas nos dados.
        </p>
      </div>

      {/* 3. Editorial Commercial Insights Feed (5 Explicit Elements per Insight) */}
      <section className="space-y-5">
        <EditorialSubheader
          rubric="DOSSIÊ DE EVIDÊNCIAS E DIAGNÓSTICOS"
          title="Análises Estruturadas em 5 Dimensões"
          description="Cada apontamento apresenta: (1) O que foi observado, (2) Dado de sustentação, (3) Período analisado, (4) Por que merece atenção e (5) Sugestão de investigação"
        />

        {filteredAlerts.map((alert, idx) => {
          const leftRule =
            alert.severity === 'alta'
              ? 'border-l-4 border-l-crimson'
              : alert.severity === 'media'
              ? 'border-l-4 border-l-burnt'
              : 'border-l-4 border-l-sage';

          return (
            <Card key={alert.id} className={`${leftRule} overflow-hidden`}>
              <CardHeader className="bg-cream-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-cream-warm text-ink border border-sand">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  {alert.severity === 'alta' ? (
                    <AlertOctagon className="w-5 h-5 text-crimson shrink-0" />
                  ) : alert.severity === 'media' ? (
                    <AlertTriangle className="w-5 h-5 text-burnt shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-sage shrink-0" />
                  )}
                  <div>
                    <CardTitle className="text-base">{alert.title}</CardTitle>
                    <p className="font-mono text-[11px] text-warmgray mt-0.5">
                      Escopo: <strong className="text-ink">{alert.affected_entity}</strong> • Período:{' '}
                      <span>{periodAnalyzed}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={
                      alert.severity === 'alta'
                        ? 'crimson'
                        : alert.severity === 'media'
                        ? 'burnt'
                        : 'sage'
                    }
                  >
                    {alert.metric_label}: <strong className="font-mono ml-1">{alert.metric_value}</strong>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 5-Part Editorial Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. O que foi observado */}
                  <div className="p-4 rounded bg-cream-soft border border-sand">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-burnt mb-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>1. O Que Foi Observado</span>
                    </div>
                    <p className="text-xs text-ink leading-relaxed">{alert.observed_fact}</p>
                  </div>

                  {/* 2. Qual dado sustenta a observação */}
                  <div className="p-4 rounded bg-cream-soft border border-sand">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-sage mb-1.5">
                      <Sigma className="w-3.5 h-3.5" />
                      <span>2. Dado que Sustenta a Observação</span>
                    </div>
                    <p className="text-xs text-ink leading-relaxed">{alert.statistical_justification}</p>
                  </div>

                  {/* 3. Qual período foi analisado */}
                  <div className="p-4 rounded bg-cream-soft border border-sand">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-1.5">
                      <Calendar className="w-3.5 h-3.5 text-burnt" />
                      <span>3. Período Analisado</span>
                    </div>
                    <p className="font-mono text-xs font-semibold text-ink">{periodAnalyzed}</p>
                    <p className="text-xs text-warmgray mt-1">
                      Confrontado com a janela de referência ({comparisonPeriod}) sob os filtros ativos.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 4. Por que merece atenção */}
                  <div className="p-4 rounded bg-surface border border-sand">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink mb-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-coral" />
                      <span>4. Por Que Merece Atenção</span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">{alert.possible_explanation}</p>
                  </div>

                  {/* 5. Sugestão de investigação */}
                  <div className="p-4 rounded bg-burnt-light/50 border border-burnt/30">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-burnt mb-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      <span>5. Sugestão de Investigação (Hipótese)</span>
                    </div>
                    <p className="text-xs text-ink leading-relaxed">{alert.investigation_hypothesis}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
};
