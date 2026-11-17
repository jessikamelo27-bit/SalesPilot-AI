import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Bot,
  Calculator,
  Filter,
  Send,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
  User,
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilters } from '../context/FilterContext';
import { AssistantQueryResponse } from '../types/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Primitives';

const SUGGESTED_QUESTIONS = [
  'Qual foi o faturamento deste mês?',
  'Qual produto vendeu mais?',
  'Qual categoria apresentou maior crescimento?',
  'Quais produtos tiveram queda nas vendas?',
  'Qual vendedor apresentou melhor desempenho?',
  'Qual foi o ticket médio?',
  'Quais produtos possuem margem de lucro mais baixa?',
  'O faturamento aumentou ou diminuiu em relação ao mês anterior?',
  'Por que meu faturamento caiu?',
  'Quais pontos merecem atenção?',
];

export const AssistantPage: React.FC = () => {
  const { filters } = useFilters();
  const [questionInput, setQuestionInput] = useState('');
  const [history, setHistory] = useState<AssistantQueryResponse[]>([]);

  const queryMutation = useMutation({
    mutationFn: (q: string) => api.askAssistant(q, filters),
    onSuccess: (res) => {
      setHistory((prev) => [res, ...prev]);
      setQuestionInput('');
    },
  });

  const handleAsk = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || queryMutation.isPending) return;
    queryMutation.mutate(trimmed);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Assistente Conversacional de Vendas</h1>
            <Badge variant="ai">
              <Sparkles className="w-3 h-3" />
              IA Fundamentada em Dados
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Todos os cálculos financeiros são executados de forma determinística em Python/SQL antes da geração da
            resposta.
          </p>
        </div>
      </div>

      {/* Input & Suggested Questions */}
      <Card className="border-purple-500/40 bg-gradient-to-b from-purple-950/15 to-navy-850">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <span>Faça uma pergunta comercial sobre seus dados</span>
          </CardTitle>
          <CardDescription>
            O assistente respeita os filtros globais ativos no topo da página e apresenta os indicadores e tabelas
            utilizados em cada resposta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(questionInput);
            }}
            className="flex gap-2.5"
          >
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ex: Qual produto vendeu mais? Por que meu faturamento caiu? Qual foi o ticket médio?"
              className="flex-1 bg-navy-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
            <Button type="submit" variant="ai" disabled={queryMutation.isPending || !questionInput.trim()}>
              <Send className="w-4 h-4" />
              {queryMutation.isPending ? 'Analisando...' : 'Perguntar'}
            </Button>
          </form>

          <div>
            <p className="text-[11px] font-medium text-slate-400 mb-2">Perguntas sugeridas (clique para consultar):</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAsk(q)}
                  disabled={queryMutation.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-purple-950/40 text-slate-300 hover:text-purple-200 border border-slate-800 hover:border-purple-500/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation / Audit Responses */}
      {history.length === 0 ? (
        <Card className="p-10 text-center">
          <Bot className="w-10 h-10 text-purple-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-sm font-semibold text-white">Pronto para analisar seu desempenho comercial</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
            Selecione qualquer uma das perguntas sugeridas acima ou digite sua dúvida em linguagem natural para ver os
            cálculos auditáveis e a interpretação dos resultados.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {history.map((item, index) => (
            <Card key={index} className="border-slate-800 overflow-hidden">
              {/* User Question Header */}
              <div className="bg-navy-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>"{item.question}"</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="ai">Intenção: {item.intent}</Badge>
                  <Badge
                    variant={
                      item.mode === 'openai' || item.mode === 'gemini'
                        ? 'ai'
                        : item.mode === 'fallback_deterministic'
                        ? 'warning'
                        : 'electric'
                    }
                  >
                    Modo: {item.mode}
                  </Badge>
                </div>
              </div>

              <CardContent className="space-y-5">
                {/* Main Answer */}
                <div className="p-4 rounded-xl bg-purple-950/15 border border-purple-500/30">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 mb-2">
                    <Bot className="w-4 h-4" />
                    <span>Resposta Analítica Fundamentada</span>
                  </div>
                  <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-line">{item.answer}</p>
                  <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Status do Motor:</strong> {item.provider_status} • <strong>Metodologia:</strong>{' '}
                      {item.methodology_note}
                    </span>
                  </p>
                </div>

                {/* Calculated Indicators & Applied Filters */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 p-4 rounded-xl bg-navy-900 border border-slate-800">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" />
                      Indicadores Determinísticos Calculados (Python/SQL)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(item.calculated_indicators).map(([k, v]) => (
                        <div key={k} className="p-2.5 rounded-lg bg-navy-850 border border-slate-800/80">
                          <p className="text-[11px] text-slate-400">{k}</p>
                          <p className="text-sm font-bold text-white mt-0.5">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-navy-900 border border-slate-800">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-blue-400" />
                      Filtros Utilizados na Consulta
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Data Inicial:</span>
                        <span className="text-slate-200">{item.applied_filters.start_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Data Final:</span>
                        <span className="text-slate-200">{item.applied_filters.end_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Categoria:</span>
                        <span className="text-slate-200">{item.applied_filters.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vendedor:</span>
                        <span className="text-slate-200">{item.applied_filters.salesperson}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Região:</span>
                        <span className="text-slate-200">{item.applied_filters.region}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supporting Table */}
                {item.supporting_table.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                      <TableIcon className="w-4 h-4 text-blue-400" />
                      Tabela de Evidências Calculadas
                    </h4>
                    <div className="overflow-x-auto border border-slate-800 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-navy-950 text-slate-400">
                          <tr>
                            {Object.keys(item.supporting_table[0]).map((col) => (
                              <th key={col} className="py-2.5 px-3">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {item.supporting_table.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-900/40">
                              {Object.values(row).map((val, cIdx) => (
                                <td key={cIdx} className="py-2 px-3 text-slate-200">
                                  {String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
