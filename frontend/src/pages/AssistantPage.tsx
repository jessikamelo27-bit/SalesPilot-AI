import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  BookOpen,
  Calculator,
  Compass,
  Filter,
  Scale,
  Send,
  ShieldCheck,
  Table as TableIcon,
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
  EditorialSectionTitle,
} from '../components/ui/Primitives';

const EDITORIAL_SUGGESTIONS = [
  'Qual categoria mais contribuiu para o faturamento?',
  'Quais produtos tiveram queda?',
  'Qual vendedor apresentou melhor desempenho?',
  'Como foi o resultado deste mês em relação ao anterior?',
  'Onde estão as principais oportunidades de melhoria?',
  'Qual foi o ticket médio?',
  'Quais produtos possuem margem de lucro mais baixa?',
  'Qual produto vendeu mais?',
  'Por que meu faturamento caiu?',
];

export const AssistantPage: React.FC = () => {
  const { filters } = useFilters();
  const [questionInput, setQuestionInput] = useState('');
  const [history, setHistory] = useState<AssistantQueryResponse[]>([]);
  const [initialized, setInitialized] = useState(false);

  const queryMutation = useMutation({
    mutationFn: (q: string) => api.askAssistant(q, filters),
    onSuccess: (res) => {
      setHistory((prev) => [res, ...prev]);
      setQuestionInput('');
    },
  });

  React.useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      queryMutation.mutate('Qual categoria mais contribuiu para o faturamento?');
    }
  }, [initialized]);

  const handleAsk = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || queryMutation.isPending) return;
    queryMutation.mutate(trimmed);
  };

  return (
    <div className="space-y-10">
      {/* 1. Editorial Header */}
      <EditorialSectionTitle
        index="03"
        kicker="MESA CONVERSACIONAL DE INTELIGÊNCIA COMERCIAL"
        title="Consultor Analítico Baseado em Dados"
        subtitle="Interrogue a base comercial em linguagem natural. Todos os indicadores, somas e comparações são executados deterministicamente em Python/SQL antes da redação do parecer."
      />

      {/* 2. Analytical Query Console (Not a generic chatbot) */}
      <Card className="border-sand-strong bg-surface">
        <CardHeader className="bg-cream-soft">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-burnt" />
                <span>Formular Consulta Comercial</span>
              </CardTitle>
              <CardDescription>
                As consultas respeitam automaticamente o recorte temporal e os filtros selecionados na barra superior.
              </CardDescription>
            </div>
            <Badge variant="sage">
              <ShieldCheck className="w-3.5 h-3.5" />
              Cálculo Determinístico Garantido
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(questionInput);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Digite uma questão analítica (ex: Qual categoria mais contribuiu para o faturamento?)"
              className="flex-1 bg-cream-soft border border-sand-strong rounded-md px-4 py-2.5 text-sm text-ink placeholder:text-warmgray focus:outline-none focus:border-burnt"
            />
            <Button type="submit" variant="primary" disabled={queryMutation.isPending || !questionInput.trim()}>
              <Send className="w-4 h-4" />
              {queryMutation.isPending ? 'Processando Dados...' : 'Emitir Parecer'}
            </Button>
          </form>

          {/* Suggested Analytical Prompts */}
          <div className="pt-2 border-t border-sand">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-warmgray mb-2.5">
              PAUTAS ANALÍTICAS RECOMENDADAS (CLIQUE PARA EXECUTAR):
            </p>
            <div className="flex flex-wrap gap-2">
              {EDITORIAL_SUGGESTIONS.map((q, idx) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAsk(q)}
                  disabled={queryMutation.isPending}
                  className="group inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-cream-soft hover:bg-burnt-light text-ink hover:text-burnt border border-sand hover:border-burnt/40 transition-colors text-left"
                >
                  <span className="font-mono text-[10px] font-semibold text-burnt">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Analytical Dossiers / Responses */}
      {history.length === 0 ? (
        <div className="border border-dashed border-sand-strong rounded-lg p-12 text-center bg-cream-soft">
          <p className="font-mono text-[11px] uppercase tracking-widest text-burnt font-semibold">
            Aguardando Pauta Analítica
          </p>
          <h3 className="font-display text-lg font-bold text-ink mt-1">
            Selecione uma pergunta acima ou formule sua questão comercial
          </h3>
          <p className="text-xs text-warmgray mt-1.5 max-w-xl mx-auto leading-relaxed">
            Cada resposta apresentará os indicadores exatos calculados em Python, a referência explícita aos filtros
            aplicados, a tabela de sustentação e a distinção entre fato calculado e hipótese de investigação.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {history.map((item, index) => (
            <Card key={index} className="border-sand-strong overflow-hidden">
              {/* Dossier Masthead */}
              <div className="bg-ink text-cream px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-terracotta block">
                    PARECER ANALÍTICO #{String(history.length - index).padStart(2, '0')} // INTENÇÃO: {item.intent}
                  </span>
                  <h3 className="font-display text-base font-bold text-white mt-0.5">“{item.question}”</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-white/10 text-terracotta border border-terracotta/30">
                    Motor: {item.mode}
                  </span>
                </div>
              </div>

              <CardContent className="space-y-6">
                {/* Explicit Distinction: Calculated Data vs Hypothesis */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-8 p-5 rounded-md bg-cream-soft border-l-4 border-l-sage border border-sand">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-sage">
                        <ShieldCheck className="w-4 h-4" />
                        SÍNTESE FUNDAMENTADA EM DADOS CALCULADOS
                      </span>
                      <Badge variant="sage">Evidência Determinística</Badge>
                    </div>
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{item.answer}</p>
                    <div className="mt-4 pt-3 border-t border-sand text-[11px] text-warmgray font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        <strong className="text-ink">Fórmula / Metodologia:</strong> {item.methodology_note}
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-ink">Provedor:</strong> {item.provider_status}
                      </span>
                    </div>
                  </div>

                  {/* Hypothesis vs Fact Guidance Box */}
                  <div className="lg:col-span-4 p-5 rounded-md bg-burnt-light/40 border-l-4 border-l-burnt border border-burnt/25 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-burnt">
                          <Compass className="w-4 h-4" />
                          FATO VS. HIPÓTESE
                        </span>
                        <Badge variant="burnt">Nota Metodológica</Badge>
                      </div>
                      <p className="text-xs text-ink leading-relaxed">
                        Os números e variações percentuais ao lado são <strong>fatos determinísticos</strong> extraídos
                        da base carregada. Qualquer inferência sobre causas de mercado, comportamento de clientes ou
                        ações futuras deve ser tratada como <strong>hipótese para investigação comercial</strong>.
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-burnt/20 flex items-center gap-1.5 text-[11px] text-burnt font-mono">
                      <Scale className="w-3.5 h-3.5 shrink-0" />
                      <span>Correlação estatística ≠ causalidade direta</span>
                    </div>
                  </div>
                </div>

                {/* Calculated Indicators & Applied Filters Reference */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Calculated Indicators Block */}
                  <div className="lg:col-span-8 p-5 rounded-md bg-surface border border-sand">
                    <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-burnt mb-3.5 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" />
                      Indicadores, Valores e Comparações Calculadas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(item.calculated_indicators).map(([k, v]) => (
                        <div key={k} className="p-3 rounded bg-cream-soft border border-sand">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">{k}</p>
                          <p className="font-mono text-sm font-bold text-ink mt-1">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Applied Filters Block */}
                  <div className="lg:col-span-4 p-5 rounded-md bg-cream-soft border border-sand">
                    <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink mb-3.5 flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-burnt" />
                      Referência aos Filtros Aplicados
                    </h4>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-sand/70">
                        <span className="text-warmgray">Data Inicial:</span>
                        <span className="text-ink font-semibold">{item.applied_filters.start_date}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-sand/70">
                        <span className="text-warmgray">Data Final:</span>
                        <span className="text-ink font-semibold">{item.applied_filters.end_date}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-sand/70">
                        <span className="text-warmgray">Categoria:</span>
                        <span className="text-ink font-semibold">{item.applied_filters.category}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-sand/70">
                        <span className="text-warmgray">Vendedor:</span>
                        <span className="text-ink font-semibold">{item.applied_filters.salesperson}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-warmgray">Região:</span>
                        <span className="text-ink font-semibold">{item.applied_filters.region}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supporting Table */}
                {item.supporting_table.length > 0 && (
                  <div>
                    <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-warmgray mb-2.5 flex items-center gap-1.5">
                      <TableIcon className="w-3.5 h-3.5 text-burnt" />
                      Demonstrativo Tabular de Sustentação
                    </h4>
                    <div className="overflow-x-auto border border-sand rounded-md">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-cream-warm text-warmgray font-mono text-[10px] uppercase tracking-wider border-b border-sand">
                          <tr>
                            {Object.keys(item.supporting_table[0]).map((col) => (
                              <th key={col} className="py-2.5 px-3.5">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sand bg-surface">
                          {item.supporting_table.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-cream-soft">
                              {Object.values(row).map((val, cIdx) => (
                                <td key={cIdx} className="py-2.5 px-3.5 font-mono text-ink">
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
