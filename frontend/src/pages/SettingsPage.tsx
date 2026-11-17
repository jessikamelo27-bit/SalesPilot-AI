import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Database,
  KeyRound,
  Save,
  ShieldCheck,
  Sparkles,
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
      setSavedNotice('Configurações salvas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTimeout(() => setSavedNotice(null), 4000);
    },
  });

  const loadDemoMutation = useMutation({
    mutationFn: api.loadDemoData,
    onSuccess: () => {
      setSavedNotice('Base sintética de demonstração carregada!');
      queryClient.invalidateQueries();
    },
  });

  const clearDemoMutation = useMutation({
    mutationFn: api.clearDemoData,
    onSuccess: () => {
      setSavedNotice('Dados de demonstração removidos (dados reais preservados).');
      queryClient.invalidateQueries();
    },
  });

  const clearRealMutation = useMutation({
    mutationFn: api.clearRealData,
    onSuccess: () => {
      setSavedNotice('Registros importados pelo usuário foram limpos.');
      queryClient.invalidateQueries();
    },
  });

  if (isLoading || !settings) {
    return <LoadingState message="Carregando configurações da plataforma..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-white">Configurações da Plataforma</h1>
          <Badge variant="electric">Segurança & Provedores IA</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure o motor de inteligência artificial opcional (OpenAI ou Google Gemini) e gerencie as bases de dados.
        </p>
      </div>

      {savedNotice && (
        <Card className="p-4 border-emerald-500/40 bg-emerald-950/20 text-emerald-200 flex items-center gap-2.5 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{savedNotice}</span>
        </Card>
      )}

      {/* AI Provider Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <span>Camada de Inteligência Artificial (Opcional)</span>
          </CardTitle>
          <CardDescription>
            O SalesPilot AI funciona 100% em modo determinístico sem necessidade de chave de API. Caso configure OpenAI
            ou Gemini, o modelo interpretará exclusivamente os resultados pré-calculados em Python.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Modo de Operação do Assistente</label>
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
                  desc: `Status: ${settings.openai_configured ? settings.openai_key_masked : 'Sem chave'}`,
                },
                {
                  id: 'gemini',
                  title: 'Google Gemini',
                  desc: `Status: ${settings.gemini_configured ? settings.gemini_key_masked : 'Sem chave'}`,
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setAiProvider(opt.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    aiProvider === opt.id
                      ? 'bg-purple-950/30 border-purple-500 text-white'
                      : 'bg-navy-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">{opt.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Configuração OpenAI</span>
                <Badge variant={settings.openai_configured ? 'positive' : 'neutral'}>
                  {settings.openai_key_masked}
                </Badge>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nova Chave OpenAI API Key (opcional)</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Modelo OpenAI</label>
                <input
                  type="text"
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Configuração Google Gemini</span>
                <Badge variant={settings.gemini_configured ? 'positive' : 'neutral'}>
                  {settings.gemini_key_masked}
                </Badge>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nova Chave Gemini API Key (opcional)</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Modelo Gemini</label>
                <input
                  type="text"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-navy-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>As chaves nunca são exibidas em texto aberto nem registradas em logs.</span>
            </div>
            <Button variant="ai" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações de IA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Database & Demo Dataset Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span>Gestão de Dados de Demonstração e Dados Reais</span>
          </CardTitle>
          <CardDescription>
            Controle independente entre os dados sintéticos de demonstração e as planilhas reais importadas pela sua
            empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Total de Registros no Banco</p>
              <p className="text-xl font-bold text-white mt-1">{settings.total_records}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Registros de Demonstração (Sintéticos)</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{settings.demo_records}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
              <p className="text-xs text-slate-400">Registros Reais do Usuário</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{settings.real_records}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => loadDemoMutation.mutate()}
              disabled={loadDemoMutation.isPending}
            >
              <Sparkles className="w-4 h-4" />
              Carregar / Restaurar Base de Demonstração (12 Meses)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => clearDemoMutation.mutate()}
              disabled={clearDemoMutation.isPending || settings.demo_records === 0}
            >
              <Trash2 className="w-4 h-4 text-amber-400" />
              Limpar Apenas Dados de Demonstração
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => clearRealMutation.mutate()}
              disabled={clearRealMutation.isPending || settings.real_records === 0}
            >
              <Trash2 className="w-4 h-4" />
              Limpar Apenas Dados Reais Importados
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
