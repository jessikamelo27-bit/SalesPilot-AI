import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  ShieldAlert,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { ImportPreviewResponse } from '../types/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Primitives';

export const DataImportPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: batches } = useQuery({
    queryKey: ['import-batches'],
    queryFn: api.listImportBatches,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadSpreadsheet(file),
    onSuccess: (data) => {
      setPreview(data);
      setBannerMessage(null);
    },
    onError: (err: Error) => {
      setBannerMessage({ type: 'error', text: err.message });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (batchId: number) => api.confirmImport(batchId),
    onSuccess: (res) => {
      setBannerMessage({
        type: 'success',
        text: `Importação confirmada com sucesso! ${res.imported_records} registros validados foram incorporados à base.`,
      });
      setPreview(null);
      queryClient.invalidateQueries();
    },
    onError: (err: Error) => {
      setBannerMessage({ type: 'error', text: err.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (batchId: number) => api.cancelImport(batchId),
    onSuccess: () => {
      setBannerMessage({ type: 'error', text: 'Importação cancelada pelo usuário. Nenhum registro foi gravado.' });
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Importação e Gestão de Dados</h1>
            <Badge variant="electric">Auditoria de Qualidade</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Importe planilhas CSV ou XLSX com validação automática de colunas, datas, valores, duplicidades e custos.
          </p>
        </div>

        <a href={api.getTemplateUrl()} download>
          <Button variant="secondary" size="sm">
            <Download className="w-4 h-4 text-blue-400" />
            Baixar Planilha Modelo (.CSV)
          </Button>
        </a>
      </div>

      {bannerMessage && (
        <Card
          className={`p-4 border ${
            bannerMessage.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
              : 'border-rose-500/40 bg-rose-950/20 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
        </Card>
      )}

      {/* Upload Box */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar Planilha Comercial (.CSV ou .XLSX)</CardTitle>
          <CardDescription>
            Campos esperados: Data da venda, Número do pedido, Produto, Categoria, Quantidade vendida, Preço unitário,
            Desconto, Custo do produto (opcional), Vendedor, Região e Forma de pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500/80 rounded-xl p-10 text-center cursor-pointer transition-colors bg-navy-900/60"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">
              {uploadMutation.isPending
                ? 'Validando estrutura e auditando qualidade dos registros...'
                : 'Clique para selecionar ou arraste sua planilha CSV / XLSX aqui'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tamanho máximo: 25 MB • Nenhum registro inconsistente é excluído silenciosamente
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Staged Import Quality Report & Preview */}
      {preview && (
        <div className="space-y-6">
          <Card className="border-blue-500/40">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-blue-950/20">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                  <CardTitle>Relatório de Qualidade dos Dados — {preview.filename}</CardTitle>
                </div>
                <CardDescription>
                  Revise as inconsistências detectadas e a prévia antes de confirmar ou cancelar a gravação.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => cancelMutation.mutate(preview.batch_id)}
                  disabled={cancelMutation.isPending || confirmMutation.isPending}
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar Importação
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => confirmMutation.mutate(preview.batch_id)}
                  disabled={!preview.can_import || confirmMutation.isPending || cancelMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {confirmMutation.isPending
                    ? 'Importando...'
                    : `Confirmar Importação (${preview.records_to_import} registros)`}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {preview.is_duplicate_file && (
                <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <p className="font-semibold">Prevenção contra importação duplicada acionada</p>
                    <p className="mt-0.5">
                      Este arquivo exato (SHA-256: {preview.file_hash.slice(0, 16)}…) já foi importado anteriormente.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
                  <p className="text-[11px] text-slate-400">Total de Linhas Lidas</p>
                  <p className="text-xl font-bold text-white mt-1">{preview.quality.total_rows_read}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                  <p className="text-[11px] text-emerald-300">Registros Válidos (A Importar)</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{preview.records_to_import}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-500/30">
                  <p className="text-[11px] text-rose-300">Registros com Erros</p>
                  <p className="text-xl font-bold text-rose-400 mt-1">{preview.quality.invalid_rows_count}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/30">
                  <p className="text-[11px] text-amber-300">Duplicidades Detectadas</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">{preview.quality.duplicate_rows_count}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800">
                  <p className="text-[11px] text-slate-400">Coluna de Custo</p>
                  <p className="text-sm font-semibold text-slate-200 mt-1.5">
                    {preview.quality.has_cost_column ? 'Presente (Lucro Ativo)' : 'Ausente (Sem Lucro)'}
                  </p>
                </div>
              </div>

              {/* Column Mapping */}
              <div className="p-3.5 rounded-lg bg-navy-900 border border-slate-800 text-xs">
                <p className="font-semibold text-slate-200 mb-2">Mapeamento de Colunas Identificadas:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview.quality.mapped_columns).map(([canon, orig]) => (
                    <Badge key={canon} variant="electric">
                      {orig} → {canon}
                    </Badge>
                  ))}
                  {preview.quality.missing_columns.map((m) => (
                    <Badge key={m} variant="negative">
                      Ausente: {m}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Detailed Inconsistencies Table */}
              {preview.quality.issues.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-300 mb-2.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Inconsistências Encontradas ({preview.quality.issues.length} ocorrências — revise na planilha)
                  </h4>
                  <div className="overflow-x-auto max-h-64 border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-navy-950 text-slate-400 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Linha</th>
                          <th className="py-2.5 px-3">Campo</th>
                          <th className="py-2.5 px-3">Tipo</th>
                          <th className="py-2.5 px-3">Valor Encontrado</th>
                          <th className="py-2.5 px-3">Orientação para Correção</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {preview.quality.issues.map((iss, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="py-2 px-3 font-mono text-slate-300">#{iss.row_number}</td>
                            <td className="py-2 px-3 font-medium text-white">{iss.field}</td>
                            <td className="py-2 px-3">
                              <Badge variant={iss.severity === 'error' ? 'negative' : 'warning'}>
                                {iss.issue_type}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-400">{iss.raw_value || 'Vazio'}</td>
                            <td className="py-2 px-3 text-slate-300">{iss.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
                  Prévia dos Registros Analisados (Primeiras {preview.preview_rows.length} linhas)
                </h4>
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-navy-950 text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Linha</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Pedido</th>
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Qtd</th>
                        <th className="py-2.5 px-3">Preço Unit.</th>
                        <th className="py-2.5 px-3">Desconto</th>
                        <th className="py-2.5 px-3">Custo Unit.</th>
                        <th className="py-2.5 px-3">Vendedor</th>
                        <th className="py-2.5 px-3">Região</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {preview.preview_rows.map((row) => (
                        <tr key={row.row_number} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-mono text-slate-400">#{row.row_number}</td>
                          <td className="py-2 px-3">
                            <Badge
                              variant={
                                row.status === 'valido'
                                  ? 'positive'
                                  : row.status === 'duplicado'
                                  ? 'warning'
                                  : 'negative'
                              }
                            >
                              {row.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-slate-200">{row.sale_date}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{row.order_id}</td>
                          <td className="py-2 px-3 font-medium text-white">{row.product}</td>
                          <td className="py-2 px-3 text-slate-300">{row.category}</td>
                          <td className="py-2 px-3 text-slate-200">{row.quantity}</td>
                          <td className="py-2 px-3 text-slate-200">{row.unit_price}</td>
                          <td className="py-2 px-3 text-slate-300">{row.discount}</td>
                          <td className="py-2 px-3 text-slate-300">{row.unit_cost ?? 'N/D'}</td>
                          <td className="py-2 px-3 text-slate-200">{row.salesperson}</td>
                          <td className="py-2 px-3 text-slate-300">{row.region}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <div>
            <CardTitle>Histórico de Lotes e Importações</CardTitle>
            <CardDescription>Rastreabilidade dos arquivos processados na plataforma</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!batches || batches.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma importação registrada até o momento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Arquivo</th>
                    <th className="py-2.5 px-3">Origem</th>
                    <th className="py-2.5 px-3">Linhas Lidas</th>
                    <th className="py-2.5 px-3">Importados</th>
                    <th className="py-2.5 px-3">Inconsistentes</th>
                    <th className="py-2.5 px-3">Duplicados</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-mono text-slate-400">#{b.id}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{b.filename}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={b.is_demo ? 'warning' : 'electric'}>
                          {b.is_demo ? 'Demonstração Sintética' : 'Upload do Usuário'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{b.total_rows}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-medium">{b.valid_rows}</td>
                      <td className="py-2.5 px-3 text-rose-400">{b.invalid_rows}</td>
                      <td className="py-2.5 px-3 text-amber-400">{b.duplicate_rows}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            b.status === 'confirmed'
                              ? 'positive'
                              : b.status === 'cancelled'
                              ? 'negative'
                              : 'warning'
                          }
                        >
                          {b.status === 'confirmed'
                            ? 'Confirmado'
                            : b.status === 'cancelled'
                            ? 'Cancelado'
                            : 'Aguardando Confirmação'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
