import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Compass,
  FileSearch,
  HelpCircle,
  PieChart,
  Sigma,
  Sparkles,
  TrendingUp,
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
  EmptyDataState,
  LoadingState,
} from '../components/ui/Primitives';

export const SalesAnalysisPage: React.FC = () => {
  const { filters } = useFilters();
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['analysis', filters],
    queryFn: () => api.getAnalysis(filters),
  });

  if (isLoading) {
    return <LoadingState message="Executando diagnóstico estatístico e regras de negócio..." />;
  }

  if (!data || !data.has_data) {
    return <EmptyDataState />;
  }

  const filteredAlerts =
    severityFilter === 'all'
      ? data.alerts
      : data.alerts.filter((a) => a.severity === severityFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Análise Inteligente de Vendas</h1>
            <Badge variant="ai">
              <Sparkles className="w-3 h-3" />
              Diagnóstico Verificável
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Separação rigorosa entre fato observado nos dados, justificativa estatística, possível explicação e hipótese
            para investigação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'alta', 'media', 'positiva'] as const).map((sev) => (
            <Button
              key={sev}
              variant={severityFilter === sev ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSeverityFilter(sev)}
            >
              {sev === 'all'
                ? `Todos (${data.alerts.length})`
                : sev === 'alta'
                ? `Prioridade Alta (${data.summary.high_severity})`
                : sev === 'media'
                ? `Atenção Média (${data.summary.medium_severity})`
                : `Destaques Positivos (${data.summary.positive_highlights})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Structural Concentration & Benchmark Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total de Alertas e Destaques</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{data.summary.total_alerts}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {data.summary.high_severity} críticos • {data.summary.medium_severity} moderados •{' '}
            {data.summary.positive_highlights} positivos
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Concentração Top 3 Produtos (CR3)</span>
            <PieChart className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatPercent(data.concentration_top3_pct)}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Participação acumulada dos 3 maiores SKUs na receita líquida
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Concentração Top 5 Produtos (CR5)</span>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatPercent(data.concentration_top5_pct)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Participação acumulada dos 5 maiores SKUs</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Média de Receita por Vendedor</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(data.team_average_revenue)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Benchmark interno de comparação da equipe</p>
        </Card>
      </div>

      {/* Diagnostic Cards */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => {
          const borderAccent =
            alert.severity === 'alta'
              ? 'border-l-4 border-l-rose-500'
              : alert.severity === 'media'
              ? 'border-l-4 border-l-amber-500'
              : 'border-l-4 border-l-emerald-500';

          return (
            <Card key={alert.id} className={`${borderAccent}`}>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3">
                <div className="flex items-center gap-2.5">
                  {alert.severity === 'alta' ? (
                    <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                  ) : alert.severity === 'media' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <CardTitle className="text-base">{alert.title}</CardTitle>
                    <p className="text-xs text-slate-400">Entidade analisada: {alert.affected_entity}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      alert.severity === 'alta'
                        ? 'negative'
                        : alert.severity === 'media'
                        ? 'warning'
                        : 'positive'
                    }
                  >
                    {alert.metric_label}: {alert.metric_value}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="p-3.5 rounded-lg bg-navy-900/90 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                    <FileSearch className="w-4 h-4" />
                    <span>1. Fato Observado nos Dados</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{alert.observed_fact}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-navy-900/90 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Sigma className="w-4 h-4" />
                    <span>2. Justificativa Estatística / Regra Aplicada</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{alert.statistical_justification}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-navy-900/90 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <HelpCircle className="w-4 h-4" />
                    <span>3. Possível Explicação Comercial</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{alert.possible_explanation}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-purple-950/20 border border-purple-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                    <Compass className="w-4 h-4" />
                    <span>4. Hipótese que Precisa de Investigação</span>
                  </div>
                  <p className="text-xs text-purple-100/90 leading-relaxed">{alert.investigation_hypothesis}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
