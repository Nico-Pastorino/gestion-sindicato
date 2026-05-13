"use client";

import { useState, useTransition } from "react";
import {
  Download, Send, Eye, EyeOff, RefreshCw, FileSpreadsheet,
  CheckCircle2, XCircle, Clock, AlertTriangle, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { MunicipalityPreviewSummary } from "@/lib/services/exports.service";
import type { ExportLog } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  ayuda_economica: "Ayuda Económica",
  supermercado: "Comercio",
  otro: "Otro",
};

interface ExportClientProps {
  initialMonth: number;
  initialYear: number;
  initialPreview: MunicipalityPreviewSummary;
  initialLogs: ExportLog[];
  periodLabel: string;
}

export function ExportClient({
  initialMonth,
  initialYear,
  initialPreview,
  initialLogs,
  periodLabel,
}: ExportClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [preview, setPreview] = useState(initialPreview);
  const [logs, setLogs] = useState(initialLogs);
  const [showPreviewTable, setShowPreviewTable] = useState(false);
  const [isLoadingPreview, startPreviewTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const months = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  function notify(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  }

  function refreshPreview(m: number, y: number) {
    startPreviewTransition(async () => {
      const res = await fetch(`/api/exports/municipality/preview?month=${m}&year=${y}`);
      const json = await res.json();
      if (json.ok) setPreview(json.data);
    });
  }

  function handleMonthChange(m: number) {
    setMonth(m);
    setShowPreviewTable(false);
    refreshPreview(m, year);
  }

  function handleYearChange(y: number) {
    setYear(y);
    setShowPreviewTable(false);
    refreshPreview(month, y);
  }

  function handleDownload() {
    window.open(`/api/exports/municipality?month=${month}&year=${year}`, "_blank");
    setTimeout(() => refreshLogs(), 2000);
  }

  function refreshLogs() {
    fetch("/api/exports/logs?limit=10")
      .then((r) => r.json())
      .then((j) => { if (j.ok) setLogs(j.data); })
      .catch(() => {});
  }

  function handleSendEmail() {
    startSendTransition(async () => {
      setNotification(null);
      const res = await fetch("/api/exports/municipality/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const json = await res.json();
      if (json.ok) {
        notify("success", json.message ?? "Liquidación enviada correctamente.");
        refreshLogs();
      } else {
        notify("error", json.message ?? "Error al enviar.");
      }
    });
  }

  // Calcular etiqueta del período seleccionado
  const selectedPeriodLabel = (() => {
    const end = new Date(year, month - 1, 19);
    const start = new Date(year, month - 2, 20);
    return `${formatDate(start.toISOString().split("T")[0])} al ${formatDate(end.toISOString().split("T")[0])}`;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          Exportaciones
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Generá y enviá liquidaciones municipales.
        </p>
      </div>

      {/* Notificación */}
      {notification && (
        <Alert variant={notification.type === "error" ? "destructive" : "success"}>
          {notification.type === "success"
            ? <CheckCircle2 className="h-4 w-4" />
            : <XCircle className="h-4 w-4" />}
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* Selector de período */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Período de liquidación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">Mes</label>
              <select
                value={month}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="block rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-sm"
              >
                {months.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">Año</label>
              <select
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="block rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {isLoadingPreview && (
              <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] self-end pb-1.5">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Actualizando...
              </div>
            )}
          </div>

          <div className="rounded-lg bg-[hsl(var(--muted))]/40 px-4 py-3 text-sm">
            <span className="text-[hsl(var(--muted-foreground))]">Período: </span>
            <span className="font-semibold">{selectedPeriodLabel}</span>
            <span className="ml-3 text-xs text-[hsl(var(--muted-foreground))]">
              (día 20 del mes anterior → día 19 del mes seleccionado)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Resumen del período */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Resumen — Liquidación Municipal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preview.recordsCount === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800">
                No hay beneficios otorgados en el período <strong>{selectedPeriodLabel}</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryItem label="Beneficios incluidos" value={String(preview.benefitsCount)} />
              <SummaryItem label="Cuotas incluidas" value={String(preview.recordsCount)} />
              <SummaryItem label="Capital otorgado" value={formatCurrencyARS(preview.totalPrincipal)} accent="blue" />
              <SummaryItem label="Total a descontar" value={formatCurrencyARS(preview.totalInstallment)} accent="green" />
              <SummaryItem label="Interés total" value={formatCurrencyARS(preview.totalInterest)} accent="orange" />
            </div>
          )}

          {/* Acciones */}
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewTable((v) => !v)}
              disabled={preview.recordsCount === 0}
            >
              {showPreviewTable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreviewTable ? "Ocultar vista previa" : "Vista previa"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={preview.recordsCount === 0}
            >
              <Download className="h-4 w-4" />
              Descargar Excel
            </Button>

            <Button
              size="sm"
              onClick={handleSendEmail}
              disabled={isSending || preview.recordsCount === 0}
            >
              {isSending
                ? <><RefreshCw className="h-4 w-4 animate-spin" />Enviando...</>
                : <><Send className="h-4 w-4" />Enviar por correo</>}
            </Button>
          </div>

          {!process.env.NEXT_PUBLIC_EXPORT_EMAIL_CONFIGURED && (
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
              Para enviar por correo configurá <code className="font-mono">RESEND_API_KEY</code> y{" "}
              <code className="font-mono">EXPORT_EMAIL_TO</code> en tus variables de entorno.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Vista previa de filas */}
      {showPreviewTable && preview.rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Vista previa — {preview.recordsCount} cuota{preview.recordsCount !== 1 ? "s" : ""} de {preview.benefitsCount} beneficio{preview.benefitsCount !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">N°</TableHead>
                  <TableHead>Apellido y Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">DNI</TableHead>
                  <TableHead className="hidden lg:table-cell">Legajo</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">F. Otorgamiento</TableHead>
                  <TableHead className="hidden sm:table-cell">Cuotas</TableHead>
                  <TableHead>Cuota N°</TableHead>
                  <TableHead>Monto a Descontar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs text-[hsl(var(--muted-foreground))]">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-sm">{row.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{row.dni}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{row.legajo ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{TYPE_LABELS[row.type] ?? row.type}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{formatDate(row.grantDate)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-[hsl(var(--muted-foreground))]">
                      {row.installmentsCount}
                    </TableCell>
                    <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">
                      {row.installmentNumber}/{row.totalInstallments}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-green-700">
                      {formatCurrencyARS(row.installmentAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Historial de exportaciones */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Historial de exportaciones</CardTitle>
            <Button variant="ghost" size="sm" onClick={refreshLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-8">
              No hay exportaciones generadas aún.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="hidden sm:table-cell">Registros</TableHead>
                  <TableHead className="hidden md:table-cell">Capital</TableHead>
                  <TableHead className="hidden md:table-cell">Total desc.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">Enviado a</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDate(log.createdAt.toString().split("T")[0])}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(log.periodStart)} al {formatDate(log.periodEnd)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {log.benefitsCount} benef. · {log.recordsCount} cuotas
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {formatCurrencyARS(log.totalPrincipal)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-medium">
                      {formatCurrencyARS(log.totalInstallment)}
                    </TableCell>
                    <TableCell>
                      <ExportStatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-[hsl(var(--muted-foreground))] max-w-[180px] truncate">
                      {log.emailTo ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.periodEnd && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const [y, m] = log.periodEnd.split("-");
                            window.open(`/api/exports/municipality?month=${Number(m)}&year=${Number(y)}`, "_blank");
                          }}
                          title="Descargar Excel de este período"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Configuración rápida */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[hsl(var(--muted-foreground))]">
            Envío automático — Cron día 19
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
          <p>
            Configurá en Vercel Cron Jobs (o similar) para ejecutar automáticamente el día 19 de cada mes:
          </p>
          <code className="block rounded bg-[hsl(var(--muted))] px-3 py-2 text-xs font-mono">
            POST /api/cron/send-municipality-export
          </code>
          <p>
            Schedule: <code className="font-mono">0 8 19 * *</code> · Authorization: Bearer CRON_SECRET
          </p>
          <p className="mt-1">
            Variables de entorno necesarias:{" "}
            <code className="font-mono">RESEND_API_KEY</code>{" · "}
            <code className="font-mono">EXPORT_EMAIL_TO</code>{" · "}
            <code className="font-mono">EXPORT_EMAIL_CC</code> (opcional){" · "}
            <code className="font-mono">EMAIL_FROM</code>{" · "}
            <code className="font-mono">CRON_SECRET</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryItem({
  label, value, accent,
}: { label: string; value: string; accent?: "blue" | "green" | "orange" }) {
  const colors = { blue: "text-blue-700", green: "text-green-700", orange: "text-orange-600" };
  return (
    <div className="rounded-lg bg-[hsl(var(--muted))]/40 p-3 text-center">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${accent ? colors[accent] : ""}`}>{value}</p>
    </div>
  );
}

function ExportStatusBadge({ status }: { status: string }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" /> Enviado
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" /> Fallido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      <Clock className="h-3 w-3" /> Generado
    </span>
  );
}
