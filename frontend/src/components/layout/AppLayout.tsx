import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { FilterBar } from './FilterBar';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard Executivo', icon: LayoutDashboard, isAi: false },
  { to: '/importacao', label: 'Importação de Dados', icon: FileSpreadsheet, isAi: false },
  { to: '/analise', label: 'Análise de Vendas', icon: BarChart3, isAi: true },
  { to: '/produtos', label: 'Produtos', icon: Package, isAi: false },
  { to: '/vendedores', label: 'Vendedores', icon: Users, isAi: false },
  { to: '/assistente', label: 'Assistente IA', icon: Bot, isAi: true },
  { to: '/relatorios', label: 'Relatórios', icon: FileText, isAi: false },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, isAi: false },
];

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Hide global filter bar only on Settings page where it isn't needed
  const hideFilterBar = location.pathname === '/configuracoes';

  return (
    <div className="min-h-screen bg-navy-900 text-slate-100 flex">
      {/* Desktop Sidebar (Almost-black blue #030610) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-navy-950 border-r border-slate-800/90 shrink-0 select-none">
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">SalesPilot</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Commercial Intelligence SaaS</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? item.isAi
                        ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40'
                        : 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${item.isAi ? 'text-purple-400' : ''}`} />
                  <span>{item.label}</span>
                </div>
                {item.isAi && (
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    IA
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 m-3 rounded-xl bg-navy-900 border border-slate-800/90">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Motor Determinístico</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Todos os indicadores financeiros são calculados em Python/SQL com validação auditável.
          </p>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-64 bg-navy-950 border-r border-slate-800 flex flex-col z-10">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white">SalesPilot AI</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                        isActive ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-navy-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-white">SalesPilot AI</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg bg-navy-850 border border-slate-800 text-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {!hideFilterBar && <FilterBar />}

        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
