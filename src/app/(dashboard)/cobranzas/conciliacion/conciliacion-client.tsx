"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Search, RotateCcw, Loader2, CheckCircle, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BenefitTypeBadge } from "@/components/ui/badge";
import { SensitiveValue, SensitiveText } from "@/components/privacy/sensitive-value";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import {
  UNCOLLECTED_REASONS,
  type UncollectedReason,
} from "@/lib/validations/installment.schema";
import type { AutoPaidInstallmentRow } from "@/lib/services/installments.service";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Props {
  rows: AutoPaidInstallmentRow[];
  month: number;
  year: number;
  search: string;
}

export function ConciliacionClient({ rows, month, year, search }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchText, setSearchText] = useState(search);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState<UncollectedReason>("error_municipal");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;

  const selectedTotal = useMemo(() => {
    return rows
      .filter((r) => selected.has(r.id))
      .reduce((acc, r) => acc + Number(r.amount), 0);
  }, [rows, selected]);

  function pushFilters(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    setSelected(new Set());
    router.push(`/cobranzas/conciliacion?${params.toString()}`);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (rows.every((r) => prev.has(r.id))) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/installments/bulk-unpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: [...selected],
            reason,
            note: note.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? "No se pudo registrar la conciliación");
          return;
        }
        const { reverted, skipped } = json.data as { reverted: number; skipped: number };
        toast.success(
          `${reverted} cuota${reverted !== 1 ? "s" : ""} marcada${reverted !== 1 ? "s" : ""} como no cobrada${reverted !== 1 ? "s" : ""}` +
            (skipped > 0 ? ` · ${skipped} omitida${skipped !== 1 ? "s" : ""}` : "")
        );
        setSelected(new Set());
        setNote("");
        setDialogOpen(false);
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              pushFilters({ search: searchText.trim() });
            }}
            className="relative flex-1 min-w-[220px] max-w-sm"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por nombre, DNI o legajo…"
              className="pl-9 h-9 text-sm"
            />
          </form>

          <select
            value={month}
            onChange={(e) => pushFilters({ month: e.target.value, year: String(year) })}
            className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium h-9"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => pushFilters({ month: String(month), year: e.target.value })}
            className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium h-9"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Barra de acción cuando hay selección */}
        {someSelected && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-orange-50 border-b border-orange-200 px-4 py-2.5">
            <p className="text-sm font-medium text-orange-800">
              {selected.size} seleccionada{selected.size !== 1 ? "s" : ""} ·{" "}
              <SensitiveValue value={formatCurrencyARS(selectedTotal)} />
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Limpiar selección
              </Button>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => setDialogOpen(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Marcar como no cobradas
              </Button>
            </div>
          </div>
        )}

        {/* Tabla */}
        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm font-medium">No hay cuotas auto-cobradas en este período.</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Probá con otro mes o quitá la búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  <th className="py-2.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Seleccionar todas"
                      className="h-4 w-4 cursor-pointer accent-orange-600"
                    />
                  </th>
                  <th className="text-left py-2.5 px-3 font-semibold">Afiliado</th>
                  <th className="text-left py-2.5 px-3 font-semibold hidden md:table-cell">DNI</th>
                  <th className="text-left py-2.5 px-3 font-semibold hidden lg:table-cell">Tipo</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Cuota</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Vencimiento</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Monto</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const isChecked = selected.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${isChecked ? "bg-orange-50/60" : "hover:bg-[hsl(var(--accent))]/40"}`}
                    >
                      <td className="py-2.5 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(row.id)}
                          aria-label={`Seleccionar cuota de ${row.affiliateName}`}
                          className="h-4 w-4 cursor-pointer accent-orange-600"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Link href={`/afiliados/${row.affiliateId}`} className="font-medium hover:underline">
                          {row.affiliateName}
                        </Link>
                        {row.affiliateArea && (
                          <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                            {row.affiliateArea}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))] hidden md:table-cell">
                        <SensitiveText value={row.affiliateDni} type="dni" />
                      </td>
                      <td className="py-2.5 px-3 hidden lg:table-cell">
                        <BenefitTypeBadge type={row.benefitType as "ayuda_economica" | "supermercado" | "otro"} />
                      </td>
                      <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))]">
                        {row.installmentNumber}/{row.totalInstallments}
                      </td>
                      <td className="py-2.5 px-3">{formatDate(row.dueDate)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        <SensitiveValue value={formatCurrencyARS(row.amount)} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          href={`/beneficios/${row.benefitId}`}
                          className="text-xs text-[hsl(var(--primary))] hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Diálogo de confirmación con motivo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-orange-600" />
              Registrar cuotas no cobradas
            </DialogTitle>
            <DialogDescription>
              Vas a revertir <strong>{selected.size}</strong> cuota{selected.size !== 1 ? "s" : ""} por un total de{" "}
              <strong><SensitiveValue value={formatCurrencyARS(selectedTotal)} /></strong>. Volverán a quedar
              pendientes o vencidas y aparecerán en Cobranzas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Motivo</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as UncollectedReason)}
                className="w-full rounded-md border border-[hsl(var(--input))] bg-white px-3 py-2 text-sm"
              >
                {Object.entries(UNCOLLECTED_REASONS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Detalle <span className="text-[hsl(var(--muted-foreground))] font-normal">(opcional)</span>
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Aclaración o número de expediente…"
                maxLength={500}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isPending} className="bg-orange-600 hover:bg-orange-700">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando…
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Confirmar no cobradas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
