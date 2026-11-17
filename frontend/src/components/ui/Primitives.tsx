import React from 'react';
import { ArrowDownRight, ArrowUpRight, Database, Loader2, Minus } from 'lucide-react';
import { formatPercent } from '../../lib/api';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-surface border border-sand rounded-lg ${className}`}>
    {children}
  </div>
);

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`px-6 py-4 border-b border-sand ${className}`}>{children}</div>;

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <h3 className={`font-display text-base font-bold tracking-tight text-ink ${className}`}>{children}</h3>;

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <p className={`text-xs text-warmgray mt-0.5 leading-relaxed ${className}`}>{children}</p>;

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-6 ${className}`}>{children}</div>;

export const EditorialSectionTitle: React.FC<{
  index?: string;
  kicker: string;
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
}> = ({ index, kicker, title, subtitle, rightContent }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-sand">
    <div>
      <div className="flex items-center gap-2">
        {index && (
          <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 bg-burnt/10 text-burnt border border-burnt/25 rounded">
            {index}
          </span>
        )}
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-burnt">
          {kicker}
        </span>
      </div>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-1.5">
        {title}
      </h1>
      {subtitle && <p className="text-sm text-warmgray mt-1 max-w-3xl leading-relaxed">{subtitle}</p>}
    </div>
    {rightContent && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{rightContent}</div>}
  </div>
);

export const EditorialSubheader: React.FC<{
  rubric: string;
  title: string;
  description?: string;
  rightContent?: React.ReactNode;
}> = ({ rubric, title, description, rightContent }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-burnt">{rubric}</p>
      <h2 className="font-display text-lg font-bold text-ink tracking-tight">{title}</h2>
      {description && <p className="text-xs text-warmgray mt-0.5">{description}</p>}
    </div>
    {rightContent && <div>{rightContent}</div>}
  </div>
);

export type BadgeVariant =
  | 'burnt'
  | 'coral'
  | 'terracotta'
  | 'sage'
  | 'crimson'
  | 'neutral'
  | 'electric'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'ai';

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}> = ({ children, variant = 'neutral', className = '' }) => {
  const styles: Record<BadgeVariant, string> = {
    burnt: 'bg-burnt-light text-burnt border-burnt/30',
    coral: 'bg-coral-light text-burnt border-coral/40',
    terracotta: 'bg-terracotta-light text-ink border-terracotta',
    sage: 'bg-sage-light text-sage border-sage/30',
    crimson: 'bg-crimson-light text-crimson border-crimson/30',
    neutral: 'bg-cream-warm text-ink-muted border-sand-strong',
    // Mapped aliases
    electric: 'bg-burnt-light text-burnt border-burnt/30',
    positive: 'bg-sage-light text-sage border-sage/30',
    negative: 'bg-crimson-light text-crimson border-crimson/30',
    warning: 'bg-terracotta-light text-burnt border-coral/40',
    ai: 'bg-cream-warm text-ink border-burnt/40',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ai' | 'danger' | 'ghost' | 'ink';
    size?: 'sm' | 'md';
  }
> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const variants: Record<string, string> = {
    primary: 'bg-burnt hover:bg-burnt-hover text-white border border-burnt',
    ink: 'bg-ink hover:bg-ink-muted text-cream border border-ink',
    ai: 'bg-ink hover:bg-burnt text-cream border border-ink transition-colors',
    secondary: 'bg-surface hover:bg-cream-warm text-ink border border-sand-strong',
    danger: 'bg-crimson-light hover:bg-crimson/20 text-crimson border border-crimson/30',
    ghost: 'bg-transparent hover:bg-cream-warm text-warmgray hover:text-ink',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const DeltaBadge: React.FC<{ value: number | null | undefined; suffix?: string }> = ({
  value,
  suffix = '',
}) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="font-mono text-xs text-warmgray">Sem base ant.</span>;
  }
  const isPositive = value > 0;
  const isNegative = value < 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold ${
        isPositive ? 'text-sage' : isNegative ? 'text-crimson' : 'text-warmgray'
      }`}
    >
      {isPositive ? (
        <ArrowUpRight className="w-3.5 h-3.5" />
      ) : isNegative ? (
        <ArrowDownRight className="w-3.5 h-3.5" />
      ) : (
        <Minus className="w-3.5 h-3.5" />
      )}
      {formatPercent(value, true)}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Compilando indicadores e séries analíticas...',
}) => (
  <div className="flex flex-col items-center justify-center py-24 text-warmgray gap-3">
    <Loader2 className="w-7 h-7 text-burnt animate-spin" />
    <p className="font-mono text-xs uppercase tracking-wider">{message}</p>
  </div>
);

export const EmptyDataState: React.FC<{
  onLoadDemo?: () => void;
  isLoadingDemo?: boolean;
}> = ({ onLoadDemo, isLoadingDemo }) => (
  <Card className="p-12 text-center max-w-xl mx-auto my-10 bg-surface">
    <div className="w-12 h-12 rounded-full bg-burnt-light border border-burnt/30 flex items-center justify-center mx-auto text-burnt mb-4">
      <Database className="w-5 h-5" />
    </div>
    <p className="font-mono text-[11px] uppercase tracking-widest text-burnt font-semibold">Base Sem Registros Ativos</p>
    <h3 className="font-display text-xl font-bold text-ink mt-1">Nenhum dado comercial para o recorte atual</h3>
    <p className="text-sm text-warmgray mt-2 leading-relaxed">
      Importe uma planilha comercial (.CSV ou .XLSX) na seção de Ingestão de Dados, redefina os filtros aplicados ou
      carregue a série sintética de demonstração (12 meses).
    </p>
    {onLoadDemo && (
      <div className="mt-6 flex justify-center">
        <Button variant="primary" onClick={onLoadDemo} disabled={isLoadingDemo}>
          {isLoadingDemo ? 'Carregando série...' : 'Carregar Base Sintética de Demonstração (12 Meses)'}
        </Button>
      </div>
    )}
  </Card>
);
