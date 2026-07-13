"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  BriefcaseBusiness,
  FileCheck2,
  HeartHandshake,
  Loader2,
  Mail,
  MapPinned,
  Save,
  Shield,
  User,
} from "lucide-react";
import type { Affiliate } from "@/types";

interface AffiliateFormProps {
  affiliate?: Affiliate;
  areas?: string[];
  mode: "create" | "edit";
}

interface FormErrors {
  [key: string]: string;
}

export function AffiliateForm({ affiliate, areas = [], mode }: AffiliateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: affiliate?.fullName ?? "",
    dni: affiliate?.dni ?? "",
    legajo: affiliate?.legajo ?? "",
    area: affiliate?.area ?? "",
    sex: affiliate?.sex ?? "",
    sector: affiliate?.sector ?? "",
    position: affiliate?.position ?? "",
    employmentType: affiliate?.employmentType ?? "",
    workShift: affiliate?.workShift ?? "",
    hireDate: affiliate?.hireDate ?? "",
    affiliationDate: affiliate?.affiliationDate ?? "",
    phone: affiliate?.phone ?? "",
    alternatePhone: affiliate?.alternatePhone ?? "",
    email: affiliate?.email ?? "",
    cuil: affiliate?.cuil ?? "",
    birthDate: affiliate?.birthDate ?? "",
    maritalStatus: affiliate?.maritalStatus ?? "",
    streetAddress: affiliate?.streetAddress ?? "",
    addressNumber: affiliate?.addressNumber ?? "",
    neighborhood: affiliate?.neighborhood ?? "",
    city: affiliate?.city ?? "",
    province: affiliate?.province ?? "",
    postalCode: affiliate?.postalCode ?? "",
    emergencyContactName: affiliate?.emergencyContactName ?? "",
    emergencyContactRelation: affiliate?.emergencyContactRelation ?? "",
    emergencyContactPhone: affiliate?.emergencyContactPhone ?? "",
    documentationStatus: affiliate?.documentationStatus ?? "pending",
    privateNotes: affiliate?.privateNotes ?? "",
    status: affiliate?.status ?? "active",
    inactiveReason: affiliate?.inactiveReason ?? "",
    inactiveDate: affiliate?.inactiveDate ?? "",
  });

  function set(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = "El nombre es obligatorio";
    if (form.fullName.trim().length < 2) newErrors.fullName = "Mínimo 2 caracteres";
    if (!form.dni.trim()) newErrors.dni = "El DNI es obligatorio";
    if (!/^\d{7,15}$/.test(form.dni.trim())) newErrors.dni = "DNI inválido (solo números, 7-15 dígitos)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      setServerError(null);
      try {
        const payload = {
          fullName: form.fullName.trim(),
          dni: form.dni.trim(),
          legajo: form.legajo.trim() || null,
          area: form.area.trim() || null,
          sex: form.sex || null,
          sector: form.sector.trim() || null,
          position: form.position.trim() || null,
          employmentType: form.employmentType || null,
          workShift: form.workShift.trim() || null,
          hireDate: form.hireDate || null,
          affiliationDate: form.affiliationDate || null,
          phone: form.phone.trim() || null,
          alternatePhone: form.alternatePhone.trim() || null,
          email: form.email.trim() || null,
          cuil: form.cuil.trim() || null,
          birthDate: form.birthDate || null,
          maritalStatus: form.maritalStatus.trim() || null,
          streetAddress: form.streetAddress.trim() || null,
          addressNumber: form.addressNumber.trim() || null,
          neighborhood: form.neighborhood.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
          postalCode: form.postalCode.trim() || null,
          emergencyContactName: form.emergencyContactName.trim() || null,
          emergencyContactRelation: form.emergencyContactRelation.trim() || null,
          emergencyContactPhone: form.emergencyContactPhone.trim() || null,
          documentationStatus: form.documentationStatus,
          privateNotes: form.privateNotes.trim() || null,
          status: form.status,
          // El motivo de baja solo aplica a afiliados inactivos
          inactiveReason: form.status === "inactive" ? form.inactiveReason || null : null,
          inactiveDate: form.status === "inactive" ? form.inactiveDate || null : null,
        };

        const url =
          mode === "create"
            ? "/api/affiliates"
            : `/api/affiliates/${affiliate!.id}`;
        const method = mode === "create" ? "POST" : "PATCH";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok) {
          if (json.error?.code === "VALIDATION_ERROR") {
            const fieldErrors: FormErrors = {};
            for (const issue of json.error.details ?? []) {
              const field = issue.path?.[0];
              if (field) fieldErrors[field] = issue.message;
            }
            setErrors(fieldErrors);
          } else if (json.error?.code === "DUPLICATE_ERROR") {
            setServerError("Ya existe un afiliado con ese DNI o legajo.");
          } else {
            setServerError(json.error?.message ?? "Error al guardar");
          }
          return;
        }

        const id = json.data?.id ?? affiliate?.id;
        router.push(`/afiliados/${id}`);
        router.refresh();
      } catch {
        setServerError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {/* Datos personales */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Datos personales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Nombre */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="fullName">
                Apellido y Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="Ej: García, Juan Carlos"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                className={errors.fullName ? "border-red-400" : ""}
              />
              {errors.fullName && (
                <p className="text-xs text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* DNI */}
            <div className="space-y-1.5">
              <Label htmlFor="dni">
                DNI <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dni"
                placeholder="Ej: 28456789"
                value={form.dni}
                onChange={(e) => set("dni", e.target.value.replace(/\D/g, ""))}
                maxLength={15}
                className={errors.dni ? "border-red-400" : ""}
              />
              {errors.dni && (
                <p className="text-xs text-red-600">{errors.dni}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cuil">CUIL/CUIT</Label>
              <Input
                id="cuil"
                placeholder="Ej: 20-28456789-3"
                value={form.cuil}
                onChange={(e) => set("cuil", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
              />
            </div>

            {/* Legajo */}
            <div className="space-y-1.5">
              <Label htmlFor="legajo">Legajo</Label>
              <Input
                id="legajo"
                placeholder="Ej: 1234"
                value={form.legajo}
                onChange={(e) => set("legajo", e.target.value)}
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="Ej: 2616123456"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alternatePhone">Teléfono alternativo</Label>
              <Input
                id="alternatePhone"
                placeholder="Ej: 2615123456"
                value={form.alternatePhone}
                onChange={(e) => set("alternatePhone", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={`pl-9 ${errors.email ? "border-red-400" : ""}`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maritalStatus">Estado civil</Label>
              <Input
                id="maritalStatus"
                placeholder="Ej: Soltero/a, Casado/a"
                value={form.maritalStatus}
                onChange={(e) => set("maritalStatus", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sex">Sexo</Label>
              <Select value={form.sex || "none"} onValueChange={(v) => set("sex", v === "none" ? "" : v)}>
                <SelectTrigger id="sex">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                  <SelectItem value="prefiero_no_responder">Prefiero no responder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Motivo de baja (solo al pasar a Inactivo) */}
          {form.status === "inactive" && (
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inactiveReason">Motivo de la baja</Label>
                <Select
                  value={form.inactiveReason || "none"}
                  onValueChange={(v) => set("inactiveReason", v === "none" ? "" : v)}
                >
                  <SelectTrigger id="inactiveReason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    <SelectItem value="renuncia">Renuncia</SelectItem>
                    <SelectItem value="jubilacion">Jubilación</SelectItem>
                    <SelectItem value="fallecimiento">Fallecimiento</SelectItem>
                    <SelectItem value="traslado">Traslado</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inactiveDate">Fecha de la baja</Label>
                <Input
                  id="inactiveDate"
                  type="date"
                  value={form.inactiveDate}
                  onChange={(e) => set("inactiveDate", e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Domicilio */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPinned className="h-4 w-4" />
            Domicilio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="space-y-1.5 sm:col-span-4">
              <Label htmlFor="streetAddress">Calle</Label>
              <Input id="streetAddress" value={form.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="addressNumber">Número</Label>
              <Input id="addressNumber" value={form.addressNumber} onChange={(e) => set("addressNumber", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="neighborhood">Barrio</Label>
              <Input id="neighborhood" value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="city">Localidad</Label>
              <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="province">Provincia</Label>
              <Input id="province" value={form.province} onChange={(e) => set("province", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="postalCode">Código postal</Label>
              <Input id="postalCode" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos laborales */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4" />
            Datos laborales y afiliación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="employmentType">Situación de revista</Label>
              <Select
                value={form.employmentType || "none"}
                onValueChange={(v) => set("employmentType", v === "none" ? "" : v)}
              >
                <SelectTrigger id="employmentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  <SelectItem value="planta_permanente">Planta Permanente</SelectItem>
                  <SelectItem value="planta_temporaria">Planta Temporaria</SelectItem>
                  <SelectItem value="jubilado">Jubilado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hireDate">Fecha de ingreso</Label>
              <Input
                id="hireDate"
                type="date"
                value={form.hireDate}
                onChange={(e) => set("hireDate", e.target.value)}
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {form.hireDate ? `Antigüedad: ${calculateSeniority(form.hireDate)}` : "Se calcula automáticamente al cargar la fecha."}
              </p>
            </div>

            {/* Área */}
            <div className="space-y-1.5">
              <Label htmlFor="area">Área Municipal</Label>
              <Input
                id="area"
                list="areas-list"
                placeholder="Ej: Hacienda, Obras Públicas..."
                value={form.area}
                onChange={(e) => set("area", e.target.value)}
                autoComplete="off"
              />
              {areas.length > 0 && (
                <datalist id="areas-list">
                  {areas.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              )}
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Escribí libremente o elegí una existente.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sector">Sector</Label>
              <Input
                id="sector"
                placeholder="Ej: Compras, Mantenimiento"
                value={form.sector}
                onChange={(e) => set("sector", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                placeholder="Ej: Administrativo, Operario"
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="workShift">Turno</Label>
              <Input
                id="workShift"
                placeholder="Ej: Mañana, Tarde, Rotativo"
                value={form.workShift}
                onChange={(e) => set("workShift", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="affiliationDate">Afiliado desde</Label>
              <Input
                id="affiliationDate"
                type="date"
                value={form.affiliationDate}
                onChange={(e) => set("affiliationDate", e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            El sueldo bruto y el tope de crédito (30%) se cargan y editan desde{" "}
            <span className="font-medium">Beneficios</span> al otorgar un beneficio.
          </p>
        </CardContent>
      </Card>

      {/* Control interno */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Control interno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="documentationStatus" className="flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5" />
                Documentación
              </Label>
              <Select value={form.documentationStatus} onValueChange={(v) => set("documentationStatus", v)}>
                <SelectTrigger id="documentationStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complete">Completa</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="missing">Faltante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactName" className="flex items-center gap-1.5">
                <HeartHandshake className="h-3.5 w-3.5" />
                Contacto de emergencia
              </Label>
              <Input
                id="emergencyContactName"
                placeholder="Nombre y apellido"
                value={form.emergencyContactName}
                onChange={(e) => set("emergencyContactName", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactRelation">Vínculo</Label>
              <Input
                id="emergencyContactRelation"
                placeholder="Ej: Cónyuge, hijo/a"
                value={form.emergencyContactRelation}
                onChange={(e) => set("emergencyContactRelation", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactPhone">Teléfono de emergencia</Label>
              <Input
                id="emergencyContactPhone"
                placeholder="Ej: 2616123456"
                value={form.emergencyContactPhone}
                onChange={(e) => set("emergencyContactPhone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="privateNotes">Observaciones privadas</Label>
            <Textarea
              id="privateNotes"
              placeholder="Notas internas, documentación pendiente, situaciones especiales..."
              value={form.privateNotes}
              onChange={(e) => set("privateNotes", e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create" ? "Crear afiliado" : "Guardar cambios"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function calculateSeniority(hireDate: string) {
  const start = new Date(`${hireDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return "sin dato";

  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();

  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) return "menos de 1 mes";
  if (years <= 0) return `${months} mes${months !== 1 ? "es" : ""}`;
  if (months <= 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} año${years !== 1 ? "s" : ""} y ${months} mes${months !== 1 ? "es" : ""}`;
}
