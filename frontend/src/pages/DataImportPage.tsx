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
  EditorialSectionTitle,
  EditorialSubheader,
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
        text: `Ingestão confirmada com sucesso! ${res.imported_records} registros auditados foram incorporados à base.`,
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
      setBannerMessage({ type: 'error', text: 'Lote cancelado pelo usuário. Nenhum registro foi gravado na base.' });
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
    <div className="space-y-10">
      {/* 1. Editorial Header */}
      <EditorialSectionTitle
        index="06"
        kicker="INGESTÃO, AUDITORIA & GOVERNANÇA DE DADOS"
        title="Importação de Planilhas Comerciais (.CSV e .XLSX)"
        subtitle="Inspeção estrutural de colunas, validação tipada de datas e valores, bloqueio de duplicidades via hash SHA-256 e prévia antes da gravação definitiva."
        rightContent={
          <a href={api.getTemplateUrl()} download>
            <Button variant="secondary" size="sm">
              <Download className="w-3.5 h-3.5 text-burnt" />
              Baixar Planilha Modelo (.CSV)
            </Button>
          </a>
        }
      />

      {bannerMessage && (
        <div
          className={`p-4 rounded-md border flex items-center gap-3 text-sm ${
            bannerMessage.type === 'success'
              ? 'bg-sage-light border-sage/40 text-sage'
              : 'bg-crimson-light border-crimson/40 text-crimson'
          }`}
        >
          {bannerMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="font-medium">{bannerMessage.text}</span>
        </div>
      )}

      {/* 2. Upload Dropzone & Expected Schema Spec */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader className="bg-cream-soft">
            <CardTitle>Área de Upload e Inspeção Preliminar</CardTitle>
            <CardDescription>
              Envie arquivos .CSV ou .XLSX de até 25 MB. Nenhum registro com inconsistência é excluído silenciosamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-sand-strong hover:border-burnt rounded-lg p-10 text-center cursor-pointer transition-colors bg-cream-soft/70"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-burnt-light border border-burnt/30 flex items-center justify-center mx-auto text-burnt mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="font-display text-base font-bold text-ink">
                {uploadMutation.isPending
                  ? 'Auditando colunas, tipos numéricos e duplicidades...'
                  : 'Clique para selecionar ou arraste sua planilha (.CSV / .XLSX)'}
              </p>
              <p className="font-mono text-xs text-warmgray mt-1">
                Suporte a separadores vírgula (,) ou ponto-e-vírgula (;) e codificação UTF-8 / Latin-1
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expected Schema Specification */}
        <Card className="lg:col-span-5 bg-cream-soft">
          <CardHeader>
            <CardTitle>Especificação de Colunas Reconhecidas</CardTitle>
            <CardDescription>Mapeamento automático de cabeçalhos em Português e Inglês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2 rounded bg-surface border border-sand">
                <span className="text-burnt font-semibold">Obrigatório:</span> Data da venda
              </div>
              <div className="p-2 rounded bg-surface border border-sand">
                <span className="text-burnt font-semibold">Obrigatório:</span> Número do pedido
              </div>
              <div className="p-2 rounded bg-surface border border-sand">
                <span className="text-burnt font-semibold">Obrigatório:</span> Produto
              </div>
              <div className="p-2 rounded bg-surface border border-sand">
                <span className="text-burnt font-semibold">Obrigatório:</span> Categoria
              </div>
              <div className="p-2 rounded bg-surface border border-sand">
                <span className="text-burnt font-semibold">Obrigatório:</span> Quantidade vendida
              </div>
              <div className="p-2 rounded bg-surface border border-sand">
                <span className="text-burnt font-semibold">Obrigatório:</span> Preço unitário
              </div>
              <div className="p-2 rounded bg-surface border border-sand">
                <span className="text-burnt font-semibold">Obrigatório:</span> Vendedor
              </div>
              <div className="p-2 rounded bg-surface border border-sand">
                <span className="text-burnt font-semibold">Obrigatório:</span> Região
              </div>
              <div className="p-2 rounded bg-cream-warm border border-sand">
                <span className="text-sage font-semibold">Opcional:</span> Custo do produto
              </div>
              <div className="p-2 rounded bg-cream-warm border border-sand">
                <span className="text-sage font-semibold">Opcional:</span> Desconto / Pagamento
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Staged Import Audit Report & Preview */}
      {preview && (
        <Card className="border-burnt">
          <CardHeader className="bg-burnt-light/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-burnt" />
                <CardTitle>Laudo de Qualidade e Prévia — {preview.filename}</CardTitle>
              </div>
              <CardDescription>
                Verifique o mapeamento de colunas, os apontamentos de inconsistência e a prévia antes de confirmar.
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
                Cancelar Lote
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => confirmMutation.mutate(preview.batch_id)}
                disabled={!preview.can_import || confirmMutation.isPending || cancelMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4" />
                {confirmMutation.isPending
                  ? 'Gravando...'
                  : `Confirmar Importação (${preview.records_to_import} registros)`}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {preview.is_duplicate_file && (
              <div className="p-4 rounded bg-crimson-light border border-crimson/40 text-crimson text-xs flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">Arquivo Duplicado Bloqueado</p>
                  <p className="mt-0.5 font-mono">
                    Assinatura SHA-256 ({preview.file_hash.slice(0, 20)}…) idêntica a um lote já confirmado na base.
                  </p>
                </div>
              </div>
            )}

            {/* Audit Counters Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-sand border border-sand rounded-md bg-cream-soft">
              <div className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">Linhas Lidas</p>
                <p className="font-mono text-2xl font-bold text-ink mt-1">{preview.quality.total_rows_read}</p>
              </div>
              <div className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-sage">Aptos a Importar</p>
                <p className="font-mono text-2xl font-bold text-sage mt-1">{preview.records_to_import}</p>
              </div>
              <div className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-crimson">Inconsistentes</p>
                <p className="font-mono text-2xl font-bold text-crimson mt-1">
                  {preview.quality.invalid_rows_count}
                </p>
              </div>
              <div className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-burnt">Duplicidades</p>
                <p className="font-mono text-2xl font-bold text-burnt mt-1">
                  {preview.quality.duplicate_rows_count}
                </p>
              </div>
              <div className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-warmgray">Custo Unitário</p>
                <p className="font-mono text-xs font-bold text-ink mt-2">
                  {preview.quality.has_cost_column ? 'Identificado (Lucro Ativo)' : 'Ausente (Sem Lucro)'}
                </p>
              </div>
            </div>

            {/* Column Validation */}
            <div className="p-4 rounded bg-cream-soft border border-sand text-xs">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-warmgray mb-2">
                Validação de Colunas da Planilha:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.quality.mapped_columns).map(([canon, orig]) => (
                  <Badge key={canon} variant="sage">
                    {orig} → {canon}
                  </Badge>
                ))}
                {preview.quality.missing_columns.map((m) => (
                  <Badge key={m} variant="crimson">
                    Coluna Obrigatória Ausente: {m}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Inconsistencies Found */}
            {preview.quality.issues.length > 0 && (
              <div>
                <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-crimson mb-2.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Inconsistências e Duplicidades Detectadas ({preview.quality.issues.length} apontamentos)
                </h4>
                <div className="overflow-x-auto max-h-64 border border-sand rounded-md">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-cream-warm text-warmgray font-mono text-[10px] uppercase sticky top-0 border-b border-sand">
                      <tr>
                        <th className="py-2.5 px-3">Linha</th>
                        <th className="py-2.5 px-3">Campo</th>
                        <th className="py-2.5 px-3">Regra Violada</th>
                        <th className="py-2.5 px-3">Valor Original</th>
                        <th className="py-2.5 px-3">Diagnóstico para Correção</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand bg-surface">
                      {preview.quality.issues.map((iss, idx) => (
                        <tr key={idx} className="hover:bg-cream-soft">
                          <td className="py-2 px-3 font-mono text-ink">#{iss.row_number}</td>
                          <td className="py-2 px-3 font-semibold text-ink">{iss.field}</td>
                          <td className="py-2 px-3">
                            <Badge variant={iss.severity === 'error' ? 'crimson' : 'burnt'}>
                              {iss.issue_type}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-mono text-warmgray">{iss.raw_value || 'Vazio'}</td>
                          <td className="py-2 px-3 text-ink">{iss.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Spreadsheet Preview */}
            <div>
              <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink mb-2.5">
                Prévia da Planilha ({preview.preview_rows.length} primeiras linhas)
              </h4>
              <div className="overflow-x-auto border border-sand rounded-md">
                <table className="w-full text-left text-xs">
                  <thead className="bg-cream-warm text-warmgray font-mono text-[10px] uppercase border-b border-sand">
                    <tr>
                      <th className="py-2.5 px-3">Linha</th>
                      <th className="py-2.5 px-3">Validação</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Pedido</th>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3 text-right">Qtd</th>
                      <th className="py-2.5 px-3 text-right">Preço Unit.</th>
                      <th className="py-2.5 px-3 text-right">Desconto</th>
                      <th className="py-2.5 px-3 text-right">Custo Unit.</th>
                      <th className="py-2.5 px-3">Vendedor</th>
                      <th className="py-2.5 px-3">Região</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand bg-surface">
                    {preview.preview_rows.map((row) => (
                      <tr key={row.row_number} className="hover:bg-cream-soft">
                        <td className="py-2 px-3 font-mono text-warmgray">#{row.row_number}</td>
                        <td className="py-2 px-3">
                          <Badge
                            variant={
                              row.status === 'valido'
                                ? 'sage'
                                : row.status === 'duplicado'
                                ? 'burnt'
                                : 'crimson'
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 font-mono text-ink">{row.sale_date}</td>
                        <td className="py-2 px-3 font-mono text-ink">{row.order_id}</td>
                        <td className="py-2 px-3 font-semibold text-ink">{row.product}</td>
                        <td className="py-2 px-3 text-warmgray">{row.category}</td>
                        <td className="py-2 px-3 text-right font-mono text-ink">{row.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-ink">{row.unit_price}</td>
                        <td className="py-2 px-3 text-right font-mono text-warmgray">{row.discount}</td>
                        <td className="py-2 px-3 text-right font-mono text-warmgray">{row.unit_cost ?? 'N/D'}</td>
                        <td className="py-2 px-3 text-ink">{row.salesperson}</td>
                        <td className="py-2 px-3 text-warmgray">{row.region}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Historical Batches */}
      <section>
        <EditorialSubheader
          rubric="REGISTRO DE AUDITORIA"
          title="Histórico de Lotes Processados"
          description="Rastreabilidade de planilhas do usuário e cargas sintéticas de demonstração"
        />

        <Card className="overflow-hidden">
          {!batches || batches.length === 0 ? (
            <p className="p-6 text-xs text-warmgray">Nenhum lote processado até o momento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-cream-warm text-warmgray font-mono text-[10px] uppercase border-b border-sand">
                  <tr>
                    <th className="py-3 px-4">Lote</th>
                    <th className="py-3 px-3">Arquivo</th>
                    <th className="py-3 px-3">Natureza</th>
                    <th className="py-3 px-3 text-right">Lidos</th>
                    <th className="py-3 px-3 text-right">Válidos</th>
                    <th className="py-3 px-3 text-right">Inconsistentes</th>
                    <th className="py-3 px-3 text-right">Duplicados</th>
                    <th className="py-3 px-4 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand bg-surface">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-cream-soft">
                      <td className="py-3 px-4 font-mono text-warmgray">#{b.id}</td>
                      <td className="py-3 px-3 font-semibold text-ink flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-burnt" />
                        <span>{b.filename}</span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={b.is_demo ? 'terracotta' : 'burnt'}>
                          {b.is_demo ? 'Demonstração Sintética' : 'Planilha Real'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-ink">{b.total_rows}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-sage">{b.valid_rows}</td>
                      <td className="py-3 px-3 text-right font-mono text-crimson">{b.invalid_rows}</td>
                      <td className="py-3 px-3 text-right font-mono text-burnt">{b.duplicate_rows}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            b.status === 'confirmed'
                              ? 'sage'
                              : b.status === 'cancelled'
                              ? 'crimson'
                              : 'burnt'
                          }
                        >
                          {b.status === 'confirmed'
                            ? 'Confirmado'
                            : b.status === 'cancelled'
                            ? 'Cancelado'
                            : 'Pendente'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};
