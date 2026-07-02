import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Pencil,
  Phone,
  MapPin,
  CreditCard,
  Gift,
  Hash,
  AlertTriangle,
  BriefcaseBusiness,
  UserRound,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AffiliateStatusBadge } from "@/components/ui/badge";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";
import {
  formatEmploymentType,
  formatSex,
  formatDocumentationStatus,
  formatAffiliateStatus,
  isUuid,
} from "@/lib/utils/labels";
import { getAffiliateById } from "@/lib/services/affiliates.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Afiliado" };
  const data = await getAffiliateById(id);
  return { title: data ? data.fullName : "Afiliado" };
}

export default async function AffiliateDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getAffiliateById(id);

  if (!data) notFound();

  const hasSalary = data.grossSalary != null && Number(data.grossSalary) > 0;
  const activeBenefitsCount = data.benefits.filter((b) => b.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/afiliados">
              <ChevronLeft className="h-4 w-4" />
              Afiliados
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{data.fullName}</h1>
            <AffiliateStatusBadge status={data.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              DNI {data.dni}
            </span>
            {data.legajo && (
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                Legajo {data.legajo}
              </span>
            )}
            {data.area && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {data.area}
              </span>
            )}
            {data.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {data.phone}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href={`/afiliados/${data.id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Alerta sueldo pendiente (necesario para cargar beneficios) */}
      {!hasSalary && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <div className="text-sm text-yellow-800">
            <strong>Sueldo bruto pendiente de carga.</strong>{" "}
            Sin sueldo no se pueden cargar beneficios para este afiliado.{" "}
            <Link href={`/afiliados/${data.id}/editar`} className="underline font-medium">
              Completar ahora
            </Link>
          </div>
        </div>
      )}

      {/* Referencia simple de beneficios (la gestión vive en Beneficios) */}
      <Card className={activeBenefitsCount > 0 ? "border-purple-200 bg-purple-50/40" : ""}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Gift className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <p className="font-semibold">
                {activeBenefitsCount > 0
                  ? `Tiene ${activeBenefitsCount} beneficio${activeBenefitsCount !== 1 ? "s" : ""} activo${activeBenefitsCount !== 1 ? "s" : ""}`
                  : "No tiene beneficios activos"}
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Las cuotas, el tope del 30% y la carga de beneficios se manejan en el módulo Beneficios.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/beneficios/afiliado/${data.id}`}>
              Ver beneficios del afiliado
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Datos personales y laborales */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4" />
              Datos personales
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="DNI" value={data.dni} />
            <InfoItem label="CUIL" value={data.cuil ?? "Sin dato"} />
            <InfoItem label="Sexo" value={formatSex(data.sex)} />
            <InfoItem label="Fecha de nacimiento" value={data.birthDate ? formatDate(data.birthDate) : "Sin dato"} />
            <InfoItem label="Estado civil" value={data.maritalStatus ?? "Sin dato"} />
            <InfoItem label="Teléfono" value={data.phone ?? "Sin dato"} />
            <InfoItem label="Teléfono alternativo" value={data.alternatePhone ?? "Sin dato"} />
            <InfoItem label="Email" value={data.email ?? "Sin dato"} />
            <InfoItem label="Estado" value={formatAffiliateStatus(data.status)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="h-4 w-4" />
              Datos laborales
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Área" value={data.area ?? "Sin dato"} />
            <InfoItem label="Sector" value={data.sector ?? "Sin dato"} />
            <InfoItem label="Cargo" value={data.position ?? "Sin dato"} />
            <InfoItem label="Turno" value={data.workShift ?? "Sin dato"} />
            <InfoItem label="Situación de revista" value={formatEmploymentType(data.employmentType)} />
            <InfoItem label="Fecha de ingreso" value={data.hireDate ? formatDate(data.hireDate) : "Sin dato"} />
            <InfoItem label="Antigüedad" value={data.hireDate ? calculateSeniority(data.hireDate) : "Sin dato"} />
            <InfoItem label="Afiliado desde" value={data.affiliationDate ? formatDate(data.affiliationDate) : "Sin dato"} />
            <InfoItem
              label="Sueldo bruto"
              value={hasSalary ? undefined : "Pendiente de carga"}
              sensitiveValue={hasSalary ? formatCurrency(data.grossSalary!) : undefined}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Domicilio
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Calle" value={data.streetAddress ?? "Sin dato"} />
            <InfoItem label="Número" value={data.addressNumber ?? "Sin dato"} />
            <InfoItem label="Barrio" value={data.neighborhood ?? "Sin dato"} />
            <InfoItem label="Localidad" value={data.city ?? "Sin dato"} />
            <InfoItem label="Provincia" value={data.province ?? "Sin dato"} />
            <InfoItem label="Código postal" value={data.postalCode ?? "Sin dato"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4" />
              Contacto y documentación
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Contacto emergencia" value={data.emergencyContactName ?? "Sin dato"} />
            <InfoItem label="Vínculo" value={data.emergencyContactRelation ?? "Sin dato"} />
            <InfoItem label="Teléfono emergencia" value={data.emergencyContactPhone ?? "Sin dato"} />
            <InfoItem label="Documentación" value={formatDocumentationStatus(data.documentationStatus)} />
            <div className="sm:col-span-2">
              <InfoItem label="Observaciones internas" value={data.privateNotes ?? "Sin dato"} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  sensitiveValue,
}: {
  label: string;
  value?: string;
  sensitiveValue?: string;
}) {
  return (
    <div className="rounded-lg border bg-[hsl(var(--muted))]/25 px-3 py-2">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">
        {sensitiveValue != null ? <SensitiveValue value={sensitiveValue} /> : value}
      </p>
    </div>
  );
}

function calculateSeniority(hireDate: string) {
  const start = new Date(`${hireDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return "Sin dato";

  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();

  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) return "Menos de 1 mes";
  if (years <= 0) return `${months} mes${months !== 1 ? "es" : ""}`;
  if (months <= 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} año${years !== 1 ? "s" : ""} y ${months} mes${months !== 1 ? "es" : ""}`;
}
