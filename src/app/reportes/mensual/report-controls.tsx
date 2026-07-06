"use client";

import { useRouter } from "next/navigation";
import { Printer, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function ReportControls({ month, year }: { month: number; year: number }) {
  const router = useRouter();
  const now = new Date();
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i);

  const selectClass =
    "h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium";

  function go(m: number, y: number) {
    router.push(`/reportes/mensual?month=${m}&year=${y}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="ghost" size="sm" onClick={() => router.push("/analisis")}>
        <ChevronLeft className="h-4 w-4" />
        Volver
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <select value={month} onChange={(e) => go(Number(e.target.value), year)} className={selectClass} aria-label="Mes">
          {MONTHS.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => go(month, Number(e.target.value))} className={selectClass} aria-label="Año">

          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>
    </div>
  );
}
