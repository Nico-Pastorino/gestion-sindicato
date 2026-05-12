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
import { AffiliateStatusBadge } from "@/components/ui/badge";
import { CreditBar } from "@/components/shared/credit-bar";
import { formatCurrency } from "@/lib/utils/credit";
import { Eye, Pencil } from "lucide-react";
import type { AffiliateCreditSummary } from "@/types";

interface AffiliatesTableProps {
  affiliates: AffiliateCreditSummary[];
}

export function AffiliatesTable({ affiliates }: AffiliatesTableProps) {
  if (affiliates.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          No se encontraron afiliados.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Afiliado</TableHead>
          <TableHead className="hidden md:table-cell">DNI</TableHead>
          <TableHead className="hidden lg:table-cell">Legajo</TableHead>
          <TableHead className="hidden lg:table-cell">Área</TableHead>
          <TableHead className="hidden xl:table-cell">Salario Bruto</TableHead>
          <TableHead>Disponible</TableHead>
          <TableHead className="hidden sm:table-cell">Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {affiliates.map((affiliate) => (
          <TableRow key={affiliate.affiliateId}>
            <TableCell>
              <div>
                <Link
                  href={`/afiliados/${affiliate.affiliateId}`}
                  className="font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                >
                  {affiliate.fullName}
                </Link>
                <p className="text-xs text-[hsl(var(--muted-foreground))] md:hidden mt-0.5">
                  DNI {affiliate.dni}
                </p>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm">
              {affiliate.dni}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-sm">
              {affiliate.legajo ?? "-"}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-sm text-[hsl(var(--muted-foreground))]">
              {affiliate.area ?? "-"}
            </TableCell>
            <TableCell className="hidden xl:table-cell text-sm">
              {formatCurrency(affiliate.grossSalary)}
            </TableCell>
            <TableCell>
              <div className="min-w-[140px]">
                <CreditBar
                  grossSalary={affiliate.grossSalary}
                  creditLimit30={affiliate.creditLimit30}
                  activeDiscounts={affiliate.activeDiscounts}
                  availableAmount={affiliate.availableAmount}
                  showLabels={false}
                />
                <p className="text-xs font-medium mt-1">
                  {formatCurrency(affiliate.availableAmount)}
                </p>
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <AffiliateStatusBadge status={affiliate.status} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
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
  );
}
