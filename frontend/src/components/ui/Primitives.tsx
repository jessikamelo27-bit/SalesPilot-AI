import React from 'react';
import { ArrowDownRight, ArrowUpRight, Database, Loader2, Minus } from 'lucide-react';
import { formatPercent } from '../../lib/api';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-navy-850 border border-slate-800/90 rounded-xl shadow-lg ${className}`}>
    {children}
  </div>
);

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`px-5 py-4 border-b border-slate-800/70 ${className}`}>{children}</div>;

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <h3 className={`text-sm font-semibold tracking-tight text-slate-100 ${className}`}>{children}</h3>;

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <p className={`text-xs text-slate-400 mt-0.5 ${className}`}>{children}</p>;

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 ${className}`}>{children}</div>;

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'electric' | 'positive' | 'negative' | 'warning' | 'ai' | 'neutral';
  className?: string;
}> = ({ children, variant = 'neutral', className = '' }) => {
  const styles: Record<string, string> = {
    electric: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    positive: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    negative: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ai: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ai' | 'danger' | 'ghost';
    size?: 'sm' | 'md';
  }
> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const variants: Record<string, string> = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 shadow-sm',
    secondary: 'bg-navy-800 hover:bg-slate-800 text-slate-200 border border-slate-700/80',
    ai: 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/50 shadow-sm',
    danger: 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-300',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  growthPct?: number | null;
  icon: React.ReactNode;
  accent?: 'electric' | 'positive' | 'negative' | 'ai';
}> = ({ title, value, subtitle, growthPct, icon, accent = 'electric' }) => {
  const accentColors: Record<string, string> = {
    electric: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    positive: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    negative: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    ai: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <Card className="p-5 flex flex-col justify-between hover:border-slate-700/90 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1.5 tracking-tight">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg border ${accentColors[accent]}`}>{icon}</div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between gap-2 text-xs">
        {growthPct !== undefined && growthPct !== null ? (
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              growthPct > 0 ? 'text-emerald-400' : growthPct < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {growthPct > 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : growthPct < 0 ? (
              <ArrowDownRight className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            {formatPercent(growthPct, true)} vs. período ant.
          </span>
        ) : (
          <span className="text-slate-500">{subtitle || 'Cálculo determinístico'}</span>
        )}
        {growthPct !== undefined && growthPct !== null && subtitle && (
          <span className="text-slate-400 truncate max-w-[140px]" title={subtitle}>
            {subtitle}
          </span>
        )}
      </div>
    </Card>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Processando indicadores comerciais...' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

export const EmptyDataState: React.FC<{
  onLoadDemo?: () => void;
  isLoadingDemo?: boolean;
}> = ({ onLoadDemo, isLoadingDemo }) => (
  <Card className="p-10 text-center max-w-xl mx-auto my-8">
    <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 mb-4">
      <Database className="w-6 h-6" />
    </div>
    <h3 className="text-lg font-semibold text-white">Nenhum registro encontrado para este recorte</h3>
    <p className="text-sm text-slate-400 mt-2">
      Importe uma planilha comercial (.CSV ou .XLSX) na área de Importação de Dados, ajuste os filtros ativos ou carregue
      a base sintética de demonstração de 12 meses.
    </p>
    {onLoadDemo && (
      <div className="mt-6 flex justify-center">
        <Button variant="primary" onClick={onLoadDemo} disabled={isLoadingDemo}>
          {isLoadingDemo ? 'Carregando base...' : 'Carregar Dados Sintéticos de Demonstração'}
        </Button>
      </div>
    )}
  </Card>
);
