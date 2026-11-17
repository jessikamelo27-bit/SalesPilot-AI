import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  BookOpen,
  Bot,
  Database,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { FilterBar } from './FilterBar';

const NAV_ITEMS = [
  { to: '/', index: '01', label: 'Visão Executiva', icon: LayoutDashboard },
  { to: '/analise', index: '02', label: 'Inteligência Comercial', icon: BarChart3 },
  { to: '/assistente', index: '03', label: 'Mesa Analítica IA', icon: Bot },
  { to: '/produtos', index: '04', label: 'Portfólio & SKUs', icon: Package },
  { to: '/vendedores', index: '05', label: 'Força de Vendas', icon: Users },
  { to: '/importacao', index: '06', label: 'Ingestão de Dados', icon: FileSpreadsheet },
  { to: '/relatorios', index: '07', label: 'Dossiê & Relatórios', icon: FileText },
  { to: '/configuracoes', index: '08', label: 'Parâmetros', icon: Settings },
];

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: options } = useQuery({
    queryKey: ['filter-options'],
    queryFn: api.getFilterOptions,
  });

  const loadDemoMutation = useMutation({
    mutationFn: api.loadDemoData,
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const clearDemoMutation = useMutation({
    mutationFn: api.clearDemoData,
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const hasDemo = (options?.demo_records ?? 0) > 0;
  const hasReal = (options?.real_records ?? 0) > 0;
  const hideFilterBar = location.pathname === '/configuracoes';

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      {/* Top Editorial Publication Strip (#252722) */}
      <div className="bg-ink text-cream border-b border-ink-muted">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-terracotta font-semibold">
              SALESPILOT AI // EDITORIAL DATA INTELLIGENCE
            </span>
            <span className="hidden md:inline text-warmgray-light">|</span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-cream/85">
              <ShieldCheck className="w-3.5 h-3.5 text-terracotta" />
              Motor Determinístico Python & SQL Auditável
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasDemo && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-burnt/25 text-terracotta border border-terracotta/30">
                Série Sintética: {options?.demo_records} reg.
              </span>
            )}
            {hasReal && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-sage/30 text-cream border border-sage">
                Dados Reais: {options?.real_records} reg.
              </span>
            )}

            <button
              type="button"
              onClick={() => loadDemoMutation.mutate()}
              disabled={loadDemoMutation.isPending}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded bg-burnt hover:bg-burnt-hover text-white transition-colors disabled:opacity-50"
              title="Carrega 12 meses de vendas sintéticas preservando dados reais"
            >
              <RefreshCw className={`w-3 h-3 ${loadDemoMutation.isPending ? 'animate-spin' : ''}`} />
              <span>{hasDemo ? 'Restaurar Série Demo' : 'Carregar Série Demo'}</span>
            </button>

            {hasDemo && (
              <button
                type="button"
                onClick={() => clearDemoMutation.mutate()}
                disabled={clearDemoMutation.isPending}
                className="inline-flex items-center gap-1 font-mono text-[11px] px-2.5 py-1 rounded bg-transparent hover:bg-white/10 text-terracotta border border-terracotta/40 transition-colors disabled:opacity-50"
                title="Remove apenas a série sintética de demonstração"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpar Demo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Editorial Header & Horizontal Section Navigation */}
      <header className="bg-surface border-b border-sand sticky top-0 z-30">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-8">
          <div className="py-4 flex items-center justify-between gap-4 border-b border-sand/60">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded bg-burnt flex items-center justify-center text-white shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold text-xl tracking-tight text-ink">
                    SalesPilot AI
                  </span>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 bg-cream-warm text-burnt border border-sand-strong rounded">
                    Commercial Analytics
                  </span>
                </div>
                <p className="text-xs text-warmgray hidden sm:block">
                  Plataforma de Inteligência Comercial, Diagnóstico Estatístico e Decisão Orientada por Dados
                </p>
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-6">
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">Cobertura Temporal da Base</p>
                <p className="font-mono text-xs font-semibold text-ink">
                  {options?.min_date && options?.max_date
                    ? `${options.min_date} — ${options.max_date}`
                    : 'Aguardando ingestão de dados'}
                </p>
              </div>
              <div className="h-7 w-px bg-sand" />
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">Volume Auditado</p>
                <p className="font-mono text-xs font-semibold text-ink flex items-center justify-end gap-1">
                  <Database className="w-3.5 h-3.5 text-burnt" />
                  {options?.total_records ?? 0} transações
                </p>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded border border-sand text-ink hover:bg-cream-warm"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Desktop Editorial Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `group flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-burnt text-ink font-semibold bg-cream/60'
                      : 'border-transparent text-warmgray hover:text-ink hover:border-sand-strong'
                  }`
                }
              >
                <span className="font-mono text-[10px] text-burnt font-semibold">{item.index}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden bg-surface border-b border-sand px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium ${
                      isActive ? 'bg-burnt-light text-burnt font-semibold' : 'text-ink hover:bg-cream-warm'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-burnt font-semibold">{item.index}</span>
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        )}
      </header>

      {/* Analytical Filter Ribbon */}
      {!hideFilterBar && <FilterBar />}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1480px] w-full mx-auto px-4 sm:px-8 py-8">
        <Outlet />
      </main>

      {/* Editorial Colophon / Footer */}
      <footer className="border-t border-sand bg-cream-warm/60 mt-12">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-warmgray">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-ink">SalesPilot AI</span>
            <span>—</span>
            <span>Inteligência Comercial & Análise Determinística de Vendas</span>
          </div>
          <div className="font-mono text-[11px]">
            Cálculos verificados em Python/Pandas • Dados sintéticos identificados • Recomendações auxiliares
          </div>
        </div>
      </footer>
    </div>
  );
};
