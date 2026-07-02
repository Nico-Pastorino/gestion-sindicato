"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstallmentStatusBadge } from "@/components/ui/badge";
import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { PayInstallmentButton } from "@/components/benefits/pay-installment-button";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";
import {
  ArrowDown, ArrowUp, ArrowUpDown, CircleDollarSign,
  FileSpreadsheet, Printer, Search,
} from "lucide-react";
import type { InstallmentStatus } from "@/types";

export interface CollectionRow {
  id: string;
  benefitId: string;
  affiliateId: string;
  affiliateName: string;
  affiliateDni: string;
  affiliateLegajo: string | null;
  affiliateArea: string | null;
  commerce: string | null;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  paidDate: string | null;
  amount: string;
  status: InstallmentStatus;
}

type SortKey = "affiliateName" | "dueDate" | "amount" | "status";
type SortDir = "asc" | "desc";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", overdue: "Vencida", paid: "Cobrada", cancelled: "Cancelada",
};

export function CollectionsTable({ rows }: { rows: CollectionRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) =>
          [r.affiliateName, r.affiliateDni, r.commerce, r.affiliateArea]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : rows;

    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "amount") return (Number(a.amount) - Number(b.amount)) * dir;
      return String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "es", { numeric: true }) * dir;
    });
  }, [rows, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function exportExcel() {
    void (async () => {
      const XLSX = await import("xlsx");
      const out = data.map((r) => ({
        Afiliado: r.affiliateName,
        DNI: r.affiliateDni,
        Área: r.affiliateArea ?? "",
        Vencimiento: formatDate(r.dueDate),
        Cuota: `${r.installmentNumber}/${r.totalInstallments}`,
        Comercio: r.commerce ?? "",
        Monto: Number(r.amount),
        Estado: STATUS_LABEL[r.status] ?? r.status,
        Cobro: r.paidDate ? formatDate(r.paidDate) : "",
      }));
      const ws = XLSX.utils.json_to_sheet(out);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cobranza");
      XLSX.writeFile(wb, `cobranza-${new Date().toISOString().slice(0, 10)}.xlsx`);
    })();
  }

  return (
    <div>
      {/* ── Barra de herramientas ── */}
      <div className="flex flex-col gap-2 border-b p-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar en esta página…" className="h-9 pl-9 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-[hsl(var(--muted-foreground))] sm:inline">
            {data.length} fila{data.length !== 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={data.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={data.length === 0}>
            <Printer className="h-4 w-4" />PDF
          </Button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-16 text-center">
          <CircleDollarSign className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-3 text-sm font-medium">Sin cuotas para el filtro seleccionado</p>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Probá con otro mes, estado o área.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile: tarjetas ── */}
          <div className="grid gap-3 p-3 md:hidden">
            {data.map((row) => (
              <div key={row.id} className="rounded-lg border bg-[hsl(var(--card))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/afiliados/${row.affiliateId}`} className="truncate font-semibold hover:text-[hsl(var(--primary))]">
                      {row.affiliateName}
                    </Link>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Cuota {row.installmentNumber}/{row.totalInstallments} · vence {formatDate(row.dueDate)}
                    </p>
                  </div>
                  <InstallmentStatusBadge status={row.status} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-bold"><SensitiveValue value={formatCurrency(row.amount)} /></p>
                  {(row.status === "pending" || row.status === "overdue") && (
                    <PayInstallmentButton
                      installmentId={row.id}
                      installmentNumber={row.installmentNumber}
                      totalInstallments={row.totalInstallments}
                      amount={row.amount}
                      dueDate={row.dueDate}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop: tabla ── */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Afiliado" col="affiliateName" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHead label="Vencimiento" col="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden md:table-cell" />
                  <TableHead>Cuota</TableHead>
                  <TableHead className="hidden lg:table-cell">Comercio</TableHead>
                  <SortableHead label="Monto" col="amount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
                  <SortableHead label="Estado" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <TableHead className="hidden md:table-cell">Cobro</TableHead>
                  <TableHead className="text-right">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/afiliados/${row.affiliateId}`} className="font-medium hover:text-[hsl(var(--primary))]">
                        {row.affiliateName}
                      </Link>
                      <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        <SensitiveText value={row.affiliateDni} type="dni" prefix="DNI " />
                        {row.affiliateArea ? ` · ${row.affiliateArea}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{formatDate(row.dueDate)}</TableCell>
                    <TableCell className="text-sm">{row.installmentNumber}/{row.totalInstallments}</TableCell>
                    <TableCell className="hidden text-sm text-[hsl(var(--muted-foreground))] lg:table-cell">{row.commerce ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm font-semibold"><SensitiveValue value={formatCurrency(row.amount)} /></TableCell>
                    <TableCell><InstallmentStatusBadge status={row.status} /></TableCell>
                    <TableCell className="hidden text-sm text-[hsl(var(--muted-foreground))] md:table-cell">{row.paidDate ? formatDate(row.paidDate) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(row.status === "pending" || row.status === "overdue") && (
                          <PayInstallmentButton
                            installmentId={row.id}
                            installmentNumber={row.installmentNumber}
                            totalInstallments={row.totalInstallments}
                            amount={row.amount}
                            dueDate={row.dueDate}
                          />
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/beneficios/${row.benefitId}`}>Detalle</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function SortableHead({
  label, col, sortKey, sortDir, onSort, className,
}: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void; className?: string;
}) {
  const active = sortKey === col;
  return (
    <TableHead className={className}>
      <button type="button" onClick={() => onSort(col)} className="inline-flex items-center gap-1 transition-colors hover:text-[hsl(var(--foreground))]">
        {label}
        {active ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
      </button>
    </TableHead>
  );
}
