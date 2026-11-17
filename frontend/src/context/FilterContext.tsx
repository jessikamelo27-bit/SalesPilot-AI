import React, { createContext, useContext, useState } from 'react';
import { FilterState } from '../types/api';

const INITIAL_FILTERS: FilterState = {
  start_date: '',
  end_date: '',
  category: 'all',
  product: 'all',
  salesperson: 'all',
  region: 'all',
};

interface FilterContextType {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const setFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const hasActiveFilters = Boolean(
    filters.start_date ||
      filters.end_date ||
      (filters.category && filters.category !== 'all') ||
      (filters.product && filters.product !== 'all') ||
      (filters.salesperson && filters.salesperson !== 'all') ||
      (filters.region && filters.region !== 'all')
  );

  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters, hasActiveFilters }}>
      {children}
    </FilterContext.Provider>
  );
};

export function useFilters(): FilterContextType {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilters must be used inside a FilterProvider');
  }
  return ctx;
}
