"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BenefitStatusBadge, BenefitTypeBadge } from "@/components/ui/badge";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";
import { getBenefitTypeLabel } from "@/lib/utils/benefit-types";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Check, Columns3, Eye,
  FileSpreadsheet, Printer, Search,
} from "lucide-react";

interface BenefitRow {
  id: string;
  date: string;
  type: string;
  commerce: string | null;
  totalAmount: string;
  installmentsCount: number;
  installmentAmount: string;
  status: string;
  affiliate: {
    id: string;
    fullName: string;
    dni: string;
    area: string | null;
  };
}

interface BenefitsTableProps {
  benefits: BenefitRow[];
  showAffiliate?: boolean;
}

type SortKey = "affiliate" | "date" | "type" | "commerce" | "totalAmount" | "installmentAmount" | "status";
type SortDir = "asc" | "desc";
type ColId = "date" | "commerce" | "totalAmount" | "installments";

const OPTIONAL_COLS: { id: ColId; label: string }[] = [
  { id: "date", label: "Fecha" },
  { id: "commerce", label: "Comercio" },
  { id: "totalAmount", label: "Monto total" },
  { id: "installments", label: "Cuotas" },
];

export function BenefitsTable({ benefits, showAffiliate = true }: BenefitsTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [hidden, setHidden] = useState<Set<ColId>>(new Set());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? benefits.filter((b) =>
          [b.affiliate.fullName, b.affiliate.dni, b.commerce, getBenefitTypeLabel(b.type as "ayuda_economica" | "supermercado" | "otro")]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : benefits;

    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "totalAmount") return (Number(a.totalAmount) - Number(b.totalAmount)) * dir;
      if (sortKey === "installmentAmount") return (Number(a.installmentAmount) - Number(b.installmentAmount)) * dir;
      const av = sortKey === "affiliate" ? a.affiliate.fullName : String(a[sortKey] ?? "");
      const bv = sortKey === "affiliate" ? b.affiliate.fullName : String(b[sortKey] ?? "");
      return av.localeCompare(bv, "es", { numeric: true }) * dir;
    });
  }, [benefits, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const show = (id: ColId) => !hidden.has(id);
  function toggleCol(id: ColId) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exportExcel() {
    void (async () => {
      const XLSX = await import("xlsx");
      const data = rows.map((b) => ({
        ...(showAffiliate ? { Afiliado: b.affiliate.fullName, DNI: b.affiliate.dni } : {}),
        Fecha: formatDate(b.date),
        Tipo: getBenefitTypeLabel(b.type as "ayuda_economica" | "supermercado" | "otro"),
        Comercio: b.commerce ?? "",
        "Monto total": Number(b.totalAmount),
        "Cuota mensual": Number(b.installmentAmount),
        Cuotas: b.installmentsCount,
        Estado: b.status,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Beneficios");
      XLSX.writeFile(wb, `beneficios-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
            {rows.length} fila{rows.length !== 1 ? "s" : ""}
          </span>
          <ColumnsMenu cols={OPTIONAL_COLS} hidden={hidden} onToggle={toggleCol} />
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={rows.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={rows.length === 0}>
            <Printer className="h-4 w-4" />PDF
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No se encontraron beneficios.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile: tarjetas ── */}
          <div className="grid gap-3 p-3 md:hidden">
            {rows.map((b) => (
              <Link key={b.id} href={`/beneficios/${b.id}`} className="rounded-lg border bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--accent))]/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {showAffiliate && <p className="truncate font-semibold">{b.affiliate.fullName}</p>}
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(b.date)}{b.commerce ? ` · ${b.commerce}` : ""}</p>
                  </div>
                  <BenefitStatusBadge status={b.status as "active" | "cancelled" | "finished"} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Tipo</p>
                    <BenefitTypeBadge type={b.type as "ayuda_economica" | "supermercado" | "otro"} />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Cuota mensual</p>
                    <p className="font-semibold"><SensitiveValue value={formatCurrency(b.installmentAmount)} /></p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* ── Desktop: tabla ── */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {showAffiliate && <SortableHead label="Afiliado" col="affiliate" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}
                  {show("date") && <SortableHead label="Fecha" col="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden md:table-cell" />}
                  <SortableHead label="Tipo" col="type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  {show("commerce") && <SortableHead label="Comercio" col="commerce" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />}
                  {show("totalAmount") && <SortableHead label="Monto total" col="totalAmount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />}
                  <SortableHead label="Cuota mensual" col="installmentAmount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  {show("installments") && <TableHead className="hidden md:table-cell">Cuotas</TableHead>}
                  <SortableHead label="Estado" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <TableHead className="text-right">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    {showAffiliate && (
                      <TableCell>
                        <Link href={`/afiliados/${b.affiliate.id}`} className="font-medium transition-colors hover:text-[hsl(var(--primary))]">
                          {b.affiliate.fullName}
                        </Link>
                        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                          DNI {b.affiliate.dni}{b.affiliate.area ? ` · ${b.affiliate.area}` : ""}
                        </p>
                      </TableCell>
                    )}
                    {show("date") && <TableCell className="hidden text-sm md:table-cell">{formatDate(b.date)}</TableCell>}
                    <TableCell><BenefitTypeBadge type={b.type as "ayuda_economica" | "supermercado" | "otro"} /></TableCell>
                    {show("commerce") && <TableCell className="hidden text-sm text-[hsl(var(--muted-foreground))] sm:table-cell">{b.commerce ?? "—"}</TableCell>}
                    {show("totalAmount") && <TableCell className="hidden text-sm lg:table-cell"><SensitiveValue value={formatCurrency(b.totalAmount)} /></TableCell>}
                    <TableCell className="text-sm font-semibold"><SensitiveValue value={formatCurrency(b.installmentAmount)} /></TableCell>
                    {show("installments") && <TableCell className="hidden text-sm text-[hsl(var(--muted-foreground))] md:table-cell">{b.installmentsCount}</TableCell>}
                    <TableCell><BenefitStatusBadge status={b.status as "active" | "cancelled" | "finished"} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/beneficios/${b.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver</span>
                        </Link>
                      </Button>
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

function ColumnsMenu({ cols, hidden, onToggle }: { cols: { id: ColId; label: string }[]; hidden: Set<ColId>; onToggle: (id: ColId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Columns3 className="h-4 w-4" />
        <span className="hidden sm:inline">Columnas</span>
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border bg-[hsl(var(--card))] p-1 shadow-lg">
          {cols.map((c) => {
            const visible = !hidden.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-[hsl(var(--accent))]"
              >
                {c.label}
                {visible && <Check className="h-4 w-4 text-[hsl(var(--primary))]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
