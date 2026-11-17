import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Database,
  KeyRound,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EditorialSectionTitle,
  LoadingState,
} from '../components/ui/Primitives';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  });

  const [aiProvider, setAiProvider] = useState('deterministic');
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setAiProvider(settings.ai_provider);
      setOpenaiModel(settings.openai_model);
      setGeminiModel(settings.gemini_model);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateSettings({
        ai_provider: aiProvider,
        openai_api_key: openaiKey ? openaiKey : undefined,
        openai_model: openaiModel,
        gemini_api_key: geminiKey ? geminiKey : undefined,
        gemini_model: geminiModel,
      }),
    onSuccess: () => {
      setOpenaiKey('');
      setGeminiKey('');
      setSavedNotice('Parâmetros de inteligência e modelos atualizados com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTimeout(() => setSavedNotice(null), 4000);
    },
  });

  const loadDemoMutation = useMutation({
    mutationFn: api.loadDemoData,
    onSuccess: () => {
      setSavedNotice('Série sintética de demonstração (12 meses) restaurada com sucesso.');
      queryClient.invalidateQueries();
    },
  });

  const clearDemoMutation = useMutation({
    mutationFn: api.clearDemoData,
    onSuccess: () => {
      setSavedNotice('Registros sintéticos de demonstração removidos (dados reais preservados).');
      queryClient.invalidateQueries();
    },
  });

  const clearRealMutation = useMutation({
    mutationFn: api.clearRealData,
    onSuccess: () => {
      setSavedNotice('Registros reais importados pelo usuário foram removidos.');
      queryClient.invalidateQueries();
    },
  });

  if (isLoading || !settings) {
    return <LoadingState message="Carregando parâmetros de operação e credenciais mascaradas..." />;
  }

  return (
    <div className="space-y-10 max-w-5xl">
      <EditorialSectionTitle
        index="08"
        kicker="GOVERNANÇA TÉCNICA, PROVEDORES LLM & BASES"
        title="Parâmetros da Plataforma"
        subtitle="Configuração opcional de modelos de linguagem (OpenAI / Google Gemini) sobre o motor determinístico Python e controle de bases."
      />

      {savedNotice && (
        <div className="p-4 rounded-md border border-sage/40 bg-sage-light text-sage flex items-center gap-2.5 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* AI Provider Configuration */}
      <Card>
        <CardHeader className="bg-cream-soft">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-burnt" />
            <span>Camada de Síntese Conversacional (LLM Opcional)</span>
          </CardTitle>
          <CardDescription>
            O SalesPilot AI opera integralmente em modo determinístico sem chaves externas. Quando um provedor LLM é
            habilitado, ele atua apenas na redação textual sobre os indicadores já calculados pelo Python.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-2.5">
              Modo de Operação da Mesa Conversacional:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'deterministic',
                  title: 'Motor Determinístico (Padrão)',
                  desc: '100% local via Python/SQL sem chave de API',
                },
                {
                  id: 'openai',
                  title: 'OpenAI (GPT)',
                  desc: `Credencial: ${settings.openai_configured ? settings.openai_key_masked : 'Não configurada'}`,
                },
                {
                  id: 'gemini',
                  title: 'Google Gemini',
                  desc: `Credencial: ${settings.gemini_configured ? settings.gemini_key_masked : 'Não configurada'}`,
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setAiProvider(opt.id)}
                  className={`p-4 rounded-md border cursor-pointer transition-colors ${
                    aiProvider === opt.id
                      ? 'bg-burnt-light/70 border-burnt text-ink'
                      : 'bg-cream-soft border-sand text-ink hover:border-sand-strong'
                  }`}
                >
                  <p className="font-display text-sm font-bold">{opt.title}</p>
                  <p className="font-mono text-[11px] text-warmgray mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div className="p-4 rounded-md bg-cream-soft border border-sand space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold text-ink">Parâmetros OpenAI</span>
                <Badge variant={settings.openai_configured ? 'sage' : 'neutral'}>
                  {settings.openai_key_masked}
                </Badge>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-warmgray mb-1">
                  Nova Chave OpenAI API Key (opcional)
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-surface border border-sand-strong rounded px-3 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-burnt"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-warmgray mb-1">
                  Modelo OpenAI
                </label>
                <input
                  type="text"
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="w-full bg-surface border border-sand-strong rounded px-3 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-burnt"
                />
              </div>
            </div>

            <div className="p-4 rounded-md bg-cream-soft border border-sand space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold text-ink">Parâmetros Google Gemini</span>
                <Badge variant={settings.gemini_configured ? 'sage' : 'neutral'}>
                  {settings.gemini_key_masked}
                </Badge>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-warmgray mb-1">
                  Nova Chave Gemini API Key (opcional)
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-surface border border-sand-strong rounded px-3 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-burnt"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-warmgray mb-1">
                  Modelo Gemini
                </label>
                <input
                  type="text"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-surface border border-sand-strong rounded px-3 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-burnt"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-sand">
            <div className="flex items-center gap-2 text-xs text-warmgray">
              <ShieldCheck className="w-4 h-4 text-sage shrink-0" />
              <span>As credenciais são armazenadas localmente e jamais são expostas em texto aberto ou logs.</span>
            </div>
            <Button variant="primary" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Parâmetros'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Database & Demo Dataset Management */}
      <Card>
        <CardHeader className="bg-cream-soft">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-4 h-4 text-burnt" />
            <span>Governança de Dados de Demonstração e Dados Reais</span>
          </CardTitle>
          <CardDescription>
            Isolamento estrito entre a série sintética de demonstração (is_demo=True) e os registros reais importados
            pela organização (is_demo=False).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-sand border border-sand rounded-md bg-cream-soft">
            <div className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">Total de Registros</p>
              <p className="font-mono text-2xl font-bold text-ink mt-1">{settings.total_records}</p>
            </div>
            <div className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-burnt">Série Sintética (Demo)</p>
              <p className="font-mono text-2xl font-bold text-burnt mt-1">{settings.demo_records}</p>
            </div>
            <div className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sage">Registros Reais do Usuário</p>
              <p className="font-mono text-2xl font-bold text-sage mt-1">{settings.real_records}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => loadDemoMutation.mutate()}
              disabled={loadDemoMutation.isPending}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Carregar / Restaurar Série de Demonstração (12 Meses)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => clearDemoMutation.mutate()}
              disabled={clearDemoMutation.isPending || settings.demo_records === 0}
            >
              <Trash2 className="w-3.5 h-3.5 text-burnt" />
              Remover Apenas Dados de Demonstração
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => clearRealMutation.mutate()}
              disabled={clearRealMutation.isPending || settings.real_records === 0}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover Apenas Dados Reais Importados
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
