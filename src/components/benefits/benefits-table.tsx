"use client";

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
import { BenefitStatusBadge, BenefitTypeBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";
import { Eye } from "lucide-react";

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

export function BenefitsTable({ benefits, showAffiliate = true }: BenefitsTableProps) {
  if (benefits.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          No se encontraron beneficios.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showAffiliate && <TableHead>Afiliado</TableHead>}
          <TableHead className="hidden md:table-cell">Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="hidden sm:table-cell">Comercio</TableHead>
          <TableHead className="hidden lg:table-cell">Monto Total</TableHead>
          <TableHead>Cuota Mensual</TableHead>
          <TableHead className="hidden md:table-cell">Cuotas</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Ver</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {benefits.map((b) => (
          <TableRow key={b.id}>
            {showAffiliate && (
              <TableCell>
                <Link
                  href={`/afiliados/${b.affiliate.id}`}
                  className="font-medium hover:text-[hsl(var(--primary))] transition-colors"
                >
                  {b.affiliate.fullName}
                </Link>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  DNI {b.affiliate.dni}
                  {b.affiliate.area ? ` · ${b.affiliate.area}` : ""}
                </p>
              </TableCell>
            )}
            <TableCell className="hidden md:table-cell text-sm">
              {formatDate(b.date)}
            </TableCell>
            <TableCell>
              <BenefitTypeBadge type={b.type as "ayuda_economica" | "supermercado" | "otro"} />
            </TableCell>
            <TableCell className="hidden sm:table-cell text-sm text-[hsl(var(--muted-foreground))]">
              {b.commerce ?? "—"}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-sm">
              {formatCurrency(b.totalAmount)}
            </TableCell>
            <TableCell className="text-sm font-semibold">
              {formatCurrency(b.installmentAmount)}
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-[hsl(var(--muted-foreground))]">
              {b.installmentsCount}
            </TableCell>
            <TableCell>
              <BenefitStatusBadge status={b.status as "active" | "cancelled" | "finished"} />
            </TableCell>
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
  );
}
