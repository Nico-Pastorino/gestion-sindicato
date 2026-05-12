"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Loader2, Save, User } from "lucide-react";
import { calculateCreditLimit, formatCurrency } from "@/lib/utils/credit";
import { CurrencyInput } from "@/components/ui/currency-input";
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
    grossSalary: affiliate ? Number(affiliate.grossSalary) : 0,
    phone: affiliate?.phone ?? "",
    status: affiliate?.status ?? "active",
  });

  const creditLimit = calculateCreditLimit(form.grossSalary);

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
    if (form.grossSalary <= 0) newErrors.grossSalary = "El salario debe ser mayor a 0";
    if (form.grossSalary < 0) newErrors.grossSalary = "El salario no puede ser negativo";
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
          grossSalary: form.grossSalary,
          phone: form.phone.trim() || null,
          status: form.status,
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
        </CardContent>
      </Card>

      {/* Datos laborales */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Datos laborales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Área */}
            <div className="space-y-1.5">
              <Label htmlFor="area">Área Municipal</Label>
              {areas.length > 0 ? (
                <Select
                  value={form.area}
                  onValueChange={(v) => set("area", v === "_none" ? "" : v)}
                >
                  <SelectTrigger id="area">
                    <SelectValue placeholder="Seleccionar área..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin área</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="area"
                  placeholder="Ej: Secretaría de Hacienda"
                  value={form.area}
                  onChange={(e) => set("area", e.target.value)}
                />
              )}
            </div>

            {/* Salario bruto */}
            <div className="space-y-1.5">
              <Label htmlFor="grossSalary">
                Salario Bruto Mensual <span className="text-red-500">*</span>
              </Label>
              <CurrencyInput
                id="grossSalary"
                value={form.grossSalary}
                onChange={(v) => set("grossSalary", v)}
                placeholder="654.361,66"
                hasError={!!errors.grossSalary}
              />
              {errors.grossSalary && (
                <p className="text-xs text-red-600">{errors.grossSalary}</p>
              )}
            </div>
          </div>

          {/* Preview del tope 30% */}
          {form.grossSalary > 0 && (
            <>
              <Separator />
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 font-medium">
                    Tope disponible (30%)
                  </span>
                  <span className="text-blue-800 font-bold text-base">
                    {formatCurrency(creditLimit)}
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Este es el monto máximo de cuotas mensuales que puede tener el afiliado.
                </p>
              </div>
            </>
          )}
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
