"use client";

import { useMemo, useState } from "react";
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
import { AffiliateStatusBadge } from "@/components/ui/badge";
import { CreditBar } from "@/components/shared/credit-bar";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrency } from "@/lib/utils/credit";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  Eye,
  FileSpreadsheet,
  Gift,
  Pencil,
  Printer,
  Search,
} from "lucide-react";
import type { AffiliateCreditSummary } from "@/types";

interface AffiliatesTableProps {
  affiliates: AffiliateCreditSummary[];
}

type SortKey = "fullName" | "dni" | "legajo" | "area" | "availableAmount" | "status";
type SortDir = "asc" | "desc";

export function AffiliatesTable({ affiliates }: AffiliatesTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? affiliates.filter((a) =>
          [a.fullName, a.dni, a.legajo, a.area]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : affiliates;

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "availableAmount") {
        return (toNum(a.availableAmount) - toNum(b.availableAmount)) * dir;
      }
      return String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "es", { numeric: true }) * dir;
    });
    return sorted;
  }, [affiliates, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportExcel() {
    void (async () => {
      const XLSX = await import("xlsx");
      const data = rows.map((a) => ({
        Nombre: a.fullName,
        DNI: a.dni,
        Legajo: a.legajo ?? "",
        Área: a.area ?? "",
        Situación: formatEmploymentType(a.employmentType),
        "Salario bruto": a.grossSalary != null ? Number(a.grossSalary) : "",
        Disponible: a.availableAmount != null ? Number(a.availableAmount) : "",
        Estado: a.status === "active" ? "Activo" : "Inactivo",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Afiliados");
      XLSX.writeFile(wb, `afiliados-${new Date().toISOString().slice(0, 10)}.xlsx`);
    })();
  }

  return (
    <div>
      {/* ── Barra de herramientas ── */}
      <div className="flex flex-col gap-2 border-b p-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar en esta página…"
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-[hsl(var(--muted-foreground))] sm:inline">
            {rows.length} fila{rows.length !== 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={rows.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={rows.length === 0}>
            <Printer className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No se encontraron afiliados.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile: tarjetas ── */}
          <div className="grid gap-3 p-3 md:hidden">
            {rows.map((affiliate) => (
              <Link
                key={affiliate.affiliateId}
                href={`/afiliados/${affiliate.affiliateId}`}
                className="rounded-lg border bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--accent))]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{affiliate.fullName}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      DNI {affiliate.dni}{affiliate.legajo ? ` · Legajo ${affiliate.legajo}` : ""}
                    </p>
                  </div>
                  <AffiliateStatusBadge status={affiliate.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Situación</p>
                    <p className="font-medium">{formatEmploymentType(affiliate.employmentType)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Disponible</p>
                    <p className="font-semibold"><SensitiveValue value={formatCurrency(affiliate.availableAmount ?? "0")} /></p>
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
                  <SortableHead label="Afiliado" col="fullName" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHead label="DNI" col="dni" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden md:table-cell" />
                  <SortableHead label="Legajo" col="legajo" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                  <SortableHead label="Área" col="area" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                  <TableHead className="hidden xl:table-cell">Situación</TableHead>
                  <TableHead className="hidden xl:table-cell">Salario Bruto</TableHead>
                  <SortableHead label="Disponible" col="availableAmount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHead label="Estado" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((affiliate) => (
                  <TableRow key={affiliate.affiliateId}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/afiliados/${affiliate.affiliateId}`}
                          className="font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                        >
                          {affiliate.fullName}
                        </Link>
                        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] md:hidden">DNI {affiliate.dni}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{affiliate.dni}</TableCell>
                    <TableCell className="hidden text-sm lg:table-cell">{affiliate.legajo ?? "-"}</TableCell>
                    <TableCell className="hidden text-sm text-[hsl(var(--muted-foreground))] lg:table-cell">{affiliate.area ?? "-"}</TableCell>
                    <TableCell className="hidden text-sm xl:table-cell">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-xs font-medium">
                        <BadgeCheck className="h-3 w-3" />
                        {formatEmploymentType(affiliate.employmentType)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-sm xl:table-cell">
                      {affiliate.grossSalary != null
                        ? <SensitiveValue value={formatCurrency(affiliate.grossSalary)} />
                        : <span className="text-[hsl(var(--muted-foreground))]">Pendiente</span>}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[140px]">
                        {affiliate.creditLimit30 != null ? (
                          <>
                            <CreditBar
                              grossSalary={affiliate.grossSalary ?? "0"}
                              creditLimit30={affiliate.creditLimit30}
                              activeDiscounts={affiliate.activeDiscounts}
                              availableAmount={affiliate.availableAmount ?? "0"}
                              showLabels={false}
                            />
                            <p className="mt-1 text-xs font-medium"><SensitiveValue value={formatCurrency(affiliate.availableAmount ?? "0")} /></p>
                          </>
                        ) : (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">Sin salario</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <AffiliateStatusBadge status={affiliate.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/beneficios/nuevo?affiliateId=${affiliate.affiliateId}`}>
                            <Gift className="h-4 w-4" />
                            <span className="sr-only">Nuevo beneficio</span>
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/afiliados/${affiliate.affiliateId}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver</span>
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/afiliados/${affiliate.affiliateId}/editar`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Link>
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
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === col;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 transition-colors hover:text-[hsl(var(--foreground))]"
      >
        {label}
        {active ? (
          sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function toNum(v: string | null | undefined) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatEmploymentType(value?: string | null) {
  const labels: Record<string, string> = {
    planta_permanente: "Planta Permanente",
    planta_temporaria: "Planta Temporaria",
    jubilado: "Jubilado",
  };

  return value ? labels[value] ?? value : "Sin dato";
}
