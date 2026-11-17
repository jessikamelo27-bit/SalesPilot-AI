import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterProvider } from './context/FilterContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { DataImportPage } from './pages/DataImportPage';
import { SalesAnalysisPage } from './pages/SalesAnalysisPage';
import { ProductsPage } from './pages/ProductsPage';
import { SalespeoplePage } from './pages/SalespeoplePage';
import { AssistantPage } from './pages/AssistantPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <FilterProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/importacao" element={<DataImportPage />} />
              <Route path="/analise" element={<SalesAnalysisPage />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/vendedores" element={<SalespeoplePage />} />
              <Route path="/assistente" element={<AssistantPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FilterProvider>
    </QueryClientProvider>
  );
};

export default App;
