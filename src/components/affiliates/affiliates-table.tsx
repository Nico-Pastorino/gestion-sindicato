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
import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrency } from "@/lib/utils/credit";
import { Eye, FileCheck2, Mail, Pencil, Phone } from "lucide-react";
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
          <TableHead className="hidden lg:table-cell">Área / Sector</TableHead>
          <TableHead className="hidden xl:table-cell">Contacto</TableHead>
          <TableHead className="hidden xl:table-cell">Salario Bruto</TableHead>
          <TableHead>Disponible</TableHead>
          <TableHead className="hidden sm:table-cell">Control</TableHead>
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
                  <SensitiveText value={affiliate.dni} type="dni" prefix="DNI " />
                </p>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm">
              <SensitiveText value={affiliate.dni} type="dni" />
            </TableCell>
            <TableCell className="hidden lg:table-cell text-sm">
              {affiliate.legajo ?? "-"}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-sm text-[hsl(var(--muted-foreground))]">
              <div>
                <p>{affiliate.area ?? "-"}</p>
                {affiliate.sector && <p className="text-xs">{affiliate.sector}</p>}
              </div>
            </TableCell>
            <TableCell className="hidden xl:table-cell text-sm text-[hsl(var(--muted-foreground))]">
              <div className="space-y-1">
                {affiliate.phone && (
                  <p className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <SensitiveText value={affiliate.phone} type="phone" />
                  </p>
                )}
                {affiliate.email && (
                  <p className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <SensitiveText value={affiliate.email} type="email" />
                  </p>
                )}
                {!affiliate.phone && !affiliate.email && "—"}
              </div>
            </TableCell>
            <TableCell className="hidden xl:table-cell text-sm">
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
                    <p className="text-xs font-medium mt-1">
                      <SensitiveValue value={formatCurrency(affiliate.availableAmount ?? "0")} />
                    </p>
                  </>
                ) : (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Sin salario</span>
                )}
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <div className="space-y-1">
                <AffiliateStatusBadge status={affiliate.status} />
                {affiliate.documentationStatus && (
                  <p className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <FileCheck2 className="h-3 w-3" />
                    {getDocumentationLabel(affiliate.documentationStatus)}
                  </p>
                )}
              </div>
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

function getDocumentationLabel(status: NonNullable<AffiliateCreditSummary["documentationStatus"]>) {
  const labels = {
    complete: "Doc. completa",
    pending: "Doc. pendiente",
    missing: "Doc. faltante",
  };
  return labels[status];
}
