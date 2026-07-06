"use client";

import { useState, useTransition, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  Search,
  User,
  TrendingUp,
  XCircle,
  CalendarDays,
} from "lucide-react";
import {
  calculateTotalRepayment,
  calculateInterest,
  calculateInterestRate,
} from "@/lib/utils/credit";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { toISODate, formatDate, generateInstallmentDueDates } from "@/lib/utils/date";
import type { AffiliateCreditSummary, CreditProjectionResult } from "@/types";

interface BenefitFormProps {
  preselectedAffiliate?: {
    id: string;
    fullName: string;
    dni: string;
    creditSummary?: AffiliateCreditSummary | null;
  };
}

const MAX_INSTALLMENTS: Record<string, number> = {
  ayuda_economica: 3,
  supermercado: 1,
  otro: 3,
};

export function BenefitForm({ preselectedAffiliate }: BenefitFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // ─── Afiliado ─────────────────────────────────────────────────────────────
  const [affiliate, setAffiliate] = useState(preselectedAffiliate);
  const [affiliateSearch, setAffiliateSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AffiliateCreditSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [creditSummary, setCreditSummary] = useState<AffiliateCreditSummary | null>(
    preselectedAffiliate?.creditSummary ?? null
  );

  // ─── Formulario ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    type: "ayuda_economica",
    date: toISODate(),
    commerce: "",
    totalAmount: 0,
    installmentsCount: 1,
    installmentAmount: 0,
    commerceRetentionRate: 0,
    observations: "",
  });

  // ─── Fechas automáticas (regla día 20) ───────────────────────────────────
  // El operador NO carga manualmente la fecha de cada cuota.
  // El sistema las genera automáticamente según la fecha de otorgamiento.
  const dueDates = useMemo(() => {
    if (!form.date || form.installmentsCount < 1) return [];
    try {
      return generateInstallmentDueDates(form.date, form.installmentsCount);
    } catch {
      return [];
    }
  }, [form.date, form.installmentsCount]);

  const firstDueDate = dueDates[0] ?? "";

  // ─── Proyección mensual ───────────────────────────────────────────────────
  const [projection, setProjection] = useState<CreditProjectionResult | null>(null);
  const [isProjecting, setIsProjecting] = useState(false);
  const projectionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ─── Campos calculados ────────────────────────────────────────────────────
  const totalRepayment = calculateTotalRepayment(form.installmentAmount, form.installmentsCount);
  const interestAmount = calculateInterest(form.totalAmount, totalRepayment);
  const interestRate = calculateInterestRate(form.totalAmount, interestAmount);
  const commerceRetentionAmount = form.type === "supermercado"
    ? Math.round(form.totalAmount * (form.commerceRetentionRate / 100) * 100) / 100
    : 0;
  const unionProfit = Math.round((interestAmount + commerceRetentionAmount) * 100) / 100;
  // ─── Búsqueda de afiliado ─────────────────────────────────────────────────
  const searchAffiliate = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/affiliates?search=${encodeURIComponent(q)}&limit=8`);
      if (!res.ok) return;
      const json = await res.json();
      setSearchResults(json.data ?? []);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchAffiliate(affiliateSearch), 350);
    return () => clearTimeout(t);
  }, [affiliateSearch, searchAffiliate]);

  function selectAffiliate(a: AffiliateCreditSummary) {
    setSearchResults([]);
    setAffiliateSearch("");
    setAffiliate({ id: a.affiliateId, fullName: a.fullName, dni: a.dni });
    setCreditSummary(a);
    setErrors((p) => ({ ...p, affiliateId: "" }));
    setProjection(null);
  }

  // ─── Proyección mensual (auto-debounce 600ms) ─────────────────────────────
  useEffect(() => {
    clearTimeout(projectionTimer.current);
    if (!affiliate || form.installmentAmount <= 0 || !firstDueDate) {
      return;
    }

    projectionTimer.current = setTimeout(async () => {
      if (!affiliate) return;
      setIsProjecting(true);
      try {
        const params = new URLSearchParams({
          installmentAmount: String(form.installmentAmount),
          installmentsCount: String(form.installmentsCount),
          firstDueDate,
        });
        const res = await fetch(`/api/affiliates/${affiliate.id}/credit-projection?${params}`);
        if (!res.ok) return;
        const json = await res.json();
        setProjection(json.data ?? null);
      } finally {
        setIsProjecting(false);
      }
    }, 600);

    return () => clearTimeout(projectionTimer.current);
  }, [affiliate, affiliate?.id, form.installmentAmount, form.installmentsCount, firstDueDate]);

  // ─── Actualización del form ───────────────────────────────────────────────
  function set(field: string, value: string | number) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "type") {
        if (value === "supermercado") next.installmentsCount = 1;
        if (next.installmentsCount > (MAX_INSTALLMENTS[String(value)] ?? 3)) {
          next.installmentsCount = MAX_INSTALLMENTS[String(value)] ?? 3;
        }
      }
      return next;
    });
    if (["date", "installmentAmount", "installmentsCount"].includes(field)) {
      setProjection(null);
    }
    setErrors((p) => ({ ...p, [field]: "" }));
  }

  // ─── Validación ───────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!affiliate) e.affiliateId = "Seleccioná un afiliado";
    if (!form.date) e.date = "La fecha de otorgamiento es obligatoria";
    if (form.totalAmount <= 0) e.totalAmount = "El monto otorgado debe ser mayor a 0";
    if (form.installmentAmount <= 0) e.installmentAmount = "La cuota mensual debe ser mayor a 0";
    if (form.installmentsCount < 1) e.installmentsCount = "Mínimo 1 cuota";
    if (form.type === "supermercado" && form.installmentsCount !== 1)
      e.installmentsCount = "Comercio: solo 1 cuota";
    if (form.type === "supermercado" && !form.commerce.trim())
      e.commerce = "Ingresá el comercio adherido";
    if (form.type === "supermercado" && form.commerceRetentionRate <= 0)
      e.commerceRetentionRate = "La retención debe ser mayor a 0%";

    // Bloquear si la proyección todavía se está cargando o si tiene conflictos
    if (isProjecting) {
      e.installmentAmount = "Verificando disponibilidad mensual, esperá un momento...";
    } else if (projection && !projection.valid) {
      e.installmentAmount = "La cuota supera el tope mensual del 30% en uno o más meses";
    } else if (
      !projection &&
      affiliate &&
      form.installmentAmount > 0 &&
      form.installmentsCount >= 1 &&
      form.date
    ) {
      // Todos los campos están completos pero la proyección no se cargó aún
      e.installmentAmount = "Esperando verificación de disponibilidad...";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      setServerError(null);
      try {
        const res = await fetch("/api/benefits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            affiliateId: affiliate!.id,
            date: form.date,
            // firstDueDate NO se envía: el backend lo calcula automáticamente
            type: form.type,
            commerce: form.commerce.trim() || null,
            totalAmount: form.totalAmount,
            installmentsCount: form.installmentsCount,
            installmentAmount: form.installmentAmount,
            commerceRetentionRate: form.commerceRetentionRate,
            observations: form.observations.trim() || null,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          if (json.details?.conflicts) {
            setProjection((prev) =>
              prev ? { ...prev, valid: false, conflicts: json.details.conflicts } : null
            );
          }
          setServerError(json.message ?? "Error al guardar el beneficio");
          return;
        }

        router.push(`/beneficios/${json.benefit.id}`);
        router.refresh();
      } catch {
        setServerError("Error de conexión. Verificá tu conexión e intentá de nuevo.");
      }
    });
  }

  const maxInstallments = MAX_INSTALLMENTS[form.type] ?? 3;
  const hasConflicts = projection !== null && !projection.valid;
  const projectionRequired = affiliate !== null &&
    form.installmentAmount > 0 &&
    form.installmentsCount >= 1 &&
    !!form.date;
  const canSubmit =
    !isPending &&
    !isProjecting &&
    !hasConflicts &&
    (!projectionRequired || projection !== null);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{serverError}</AlertDescription>
        </Alert>
      )}

      {/* ─── Afiliado ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Afiliado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {affiliate ? (
            <div className="flex items-center justify-between rounded-lg border bg-[hsl(var(--muted))]/40 px-4 py-3">
              <div>
                <p className="font-medium">{affiliate.fullName}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  <SensitiveText value={affiliate.dni} type="dni" prefix="DNI " />
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setAffiliate(undefined); setCreditSummary(null); setProjection(null); }}
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Buscar afiliado <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <Input
                  placeholder="Nombre, DNI o legajo..."
                  value={affiliateSearch}
                  onChange={(e) => setAffiliateSearch(e.target.value)}
                  className={`pl-9 ${errors.affiliateId ? "border-red-400" : ""}`}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
              {errors.affiliateId && <p className="text-xs text-red-600">{errors.affiliateId}</p>}
              {searchResults.length > 0 && (
                <div className="rounded-md border bg-white shadow-md">
                  {searchResults.map((a) => (
                    <button
                      key={a.affiliateId}
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-[hsl(var(--accent))] transition-colors border-b last:border-b-0"
                      onClick={() => selectAffiliate(a)}
                    >
                      <div>
                        <p className="font-medium">{a.fullName}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          <SensitiveText value={a.dni} type="dni" prefix="DNI " />{a.legajo ? ` · Legajo ${a.legajo}` : ""}{a.area ? ` · ${a.area}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Disponible</p>
                        <p className={`text-sm font-semibold ${Number(a.availableAmount) <= 0 ? "text-red-600" : "text-green-600"}`}>
                          <SensitiveValue value={formatCurrencyARS(a.availableAmount)} />
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Panel disponible del afiliado */}
          {creditSummary && (
            <div className="rounded-lg bg-[hsl(var(--muted))]/40 p-3 space-y-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Salario Bruto</p>
                  <p className="text-sm font-semibold"><SensitiveValue value={formatCurrencyARS(creditSummary.grossSalary)} /></p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Máximo a descontar (30%)</p>
                  <p className="text-sm font-semibold text-blue-600"><SensitiveValue value={formatCurrencyARS(creditSummary.creditLimit30)} /></p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Disponible para descontar</p>
                  <p className={`text-sm font-bold ${Number(creditSummary.availableAmount) <= 0 ? "text-red-600" : "text-green-600"}`}>
                    <SensitiveValue value={formatCurrencyARS(creditSummary.availableAmount)} />
                  </p>
                </div>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
                El sistema valida que cada cuota mensual, sumada a otros descuentos del mismo mes, no supere el tope del 30%.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Datos del beneficio ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Datos del beneficio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo <span className="text-red-500">*</span></Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ayuda_economica">Ayuda Económica</SelectItem>
                  <SelectItem value="supermercado">Comercio</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Comercio / Proveedor</Label>
              <Input
                placeholder="Ej: La Anónima, Coto, etc."
                value={form.commerce}
                onChange={(e) => set("commerce", e.target.value)}
                className={errors.commerce ? "border-red-400" : ""}
              />
              {errors.commerce && <p className="text-xs text-red-600">{errors.commerce}</p>}
            </div>

            {/* Fecha de otorgamiento + info sobre corte */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                Fecha de otorgamiento <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={errors.date ? "border-red-400" : ""}
              />
              {form.date && dueDates.length > 0 && (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(form.date + "T12:00:00").getDate() <= 19
                      ? "Día ≤ 19: la primera cuota se descuenta en el mismo mes."
                      : "Día ≥ 20: la primera cuota pasa al mes siguiente."}
                  </span>
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Montos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>
                Monto otorgado / Capital <span className="text-red-500">*</span>
              </Label>
              <CurrencyInput
                value={form.totalAmount}
                onChange={(v) => set("totalAmount", v)}
                placeholder="654.361,66"
                hasError={!!errors.totalAmount}
              />
              {errors.totalAmount && (
                <p className="text-xs text-red-600">{errors.totalAmount}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Cuotas <span className="text-xs text-[hsl(var(--muted-foreground))]">(máx. {maxInstallments})</span>
              </Label>
              <Select
                value={String(form.installmentsCount)}
                onValueChange={(v) => set("installmentsCount", Number(v))}
                disabled={form.type === "supermercado"}
              >
                <SelectTrigger className={errors.installmentsCount ? "border-red-400" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "cuota" : "cuotas"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.installmentsCount && <p className="text-xs text-red-600">{errors.installmentsCount}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>
                Cuota real mensual <span className="text-red-500">*</span>
              </Label>
              <CurrencyInput
                value={form.installmentAmount}
                onChange={(v) => set("installmentAmount", v)}
                placeholder="45.000,00"
                hasError={!!errors.installmentAmount}
              />
              {errors.installmentAmount && (
                <p className="text-xs text-red-600">{errors.installmentAmount}</p>
              )}
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Incluye interés si corresponde.
              </p>
            </div>

            {form.type === "supermercado" && (
              <div className="space-y-1.5">
                <Label>
                  Retención del comercio <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.commerceRetentionRate || ""}
                    onChange={(e) => set("commerceRetentionRate", Number(e.target.value))}
                    placeholder="Ej: 8"
                    className={`pr-8 ${errors.commerceRetentionRate ? "border-red-400" : ""}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">%</span>
                </div>
                {errors.commerceRetentionRate ? (
                  <p className="text-xs text-red-600">{errors.commerceRetentionRate}</p>
                ) : (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Se calcula sobre el monto otorgado y corresponde a una única cuota.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Resumen de interés */}
          {form.totalAmount > 0 && form.installmentAmount > 0 && (
            <div className="rounded-lg bg-[hsl(var(--muted))]/40 p-3 grid grid-cols-2 gap-2 sm:grid-cols-5 text-sm">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Total a devolver</p>
                <p className="font-semibold"><SensitiveValue value={formatCurrencyARS(totalRepayment)} /></p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Interés total</p>
                <p className={`font-semibold ${interestAmount > 0 ? "text-orange-600" : ""}`}>
                  <SensitiveValue value={formatCurrencyARS(interestAmount)} />
                </p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">% Interés</p>
                <p className={`font-semibold ${interestRate > 0 ? "text-orange-600" : ""}`}>
                  {interestRate.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Base sin interés</p>
                <p className="font-medium text-[hsl(var(--muted-foreground))]">
                  {form.totalAmount > 0 && form.installmentsCount > 0
                    ? <SensitiveValue value={formatCurrencyARS(form.totalAmount / form.installmentsCount)} />
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Ganancia sindicato</p>
                <p className="font-bold text-emerald-700">{formatCurrencyARS(unionProfit)}</p>
              </div>
            </div>
          )}

          {form.type === "supermercado" && form.totalAmount > 0 && form.commerceRetentionRate > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Retención calculada automáticamente</p>
                  <p className="text-xs text-emerald-700">
                    {formatCurrencyARS(form.totalAmount)} x {form.commerceRetentionRate}% = ganancia por comercio
                  </p>
                </div>
                <p className="text-lg font-bold text-emerald-800">{formatCurrencyARS(commerceRetentionAmount)}</p>
              </div>
            </div>
          )}

          {/* Vista previa de cuotas generadas automáticamente */}
          {dueDates.length > 0 && form.installmentAmount > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Cuotas que se generarán automáticamente
              </p>
              <div className="space-y-1">
                {dueDates.map((date, i) => (
                  <div key={date} className="flex items-center justify-between text-sm">
                    <span className="text-[hsl(var(--foreground))]">
                      Cuota {i + 1}/{form.installmentsCount}
                    </span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {formatDate(date)}
                    </span>
                    <span className="font-semibold text-blue-700">
                      <SensitiveValue value={formatCurrencyARS(form.installmentAmount)} />
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Las fechas se calculan automáticamente (último día de cada mes).
              </p>
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Notas internas sobre este beneficio..."
              value={form.observations}
              onChange={(e) => set("observations", e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Proyección mensual del 30% ─────────────────────────────────── */}
      {(isProjecting || projection) && affiliate && form.installmentAmount > 0 && (
        <Card className={hasConflicts ? "border-red-200" : "border-green-200"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Proyección mensual del 30%
              {isProjecting && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projection && (
              <>
                {hasConflicts ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Supera el máximo del mes</AlertTitle>
                    <AlertDescription>
                      Supera el 30% en {projection.conflicts.length} mes{projection.conflicts.length !== 1 ? "es" : ""}. No se puede guardar.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="success" className="mb-4">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Disponible verificado</AlertTitle>
                    <AlertDescription>Todos los meses están dentro del tope del 30%.</AlertDescription>
                  </Alert>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                        <th className="text-left py-2 pr-3 font-semibold">Mes</th>
                        <th className="text-right py-2 px-3 font-semibold">Máximo (30%)</th>
                        <th className="text-right py-2 px-3 font-semibold">Ya comprometido</th>
                        <th className="text-right py-2 px-3 font-semibold">Nueva cuota</th>
                        <th className="text-right py-2 px-3 font-semibold">Total</th>
                        <th className="text-right py-2 pl-3 font-semibold">Disponible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projection.months.map((m) => (
                        <tr key={m.month} className={`border-b last:border-0 ${!m.ok ? "bg-red-50" : ""}`}>
                          <td className="py-2 pr-3 font-medium capitalize">{m.monthLabel}</td>
                          <td className="text-right py-2 px-3"><SensitiveValue value={formatCurrencyARS(m.creditLimit30)} /></td>
                          <td className="text-right py-2 px-3"><SensitiveValue value={formatCurrencyARS(m.activeDiscounts)} /></td>
                          <td className="text-right py-2 px-3 font-medium text-blue-700"><SensitiveValue value={formatCurrencyARS(m.newInstallment)} /></td>
                          <td className={`text-right py-2 px-3 font-semibold ${!m.ok ? "text-red-700" : ""}`}><SensitiveValue value={formatCurrencyARS(m.projectedTotal)} /></td>
                          <td className={`text-right py-2 pl-3 font-semibold ${m.availableAfter < 0 ? "text-red-700" : "text-green-700"}`}>
                            <SensitiveValue value={formatCurrencyARS(m.availableAfter)} />
                            {!m.ok && " ⚠"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Acciones ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
          ) : isProjecting ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Verificando...</>
          ) : (
            <><Save className="h-4 w-4" />Crear beneficio</>
          )}
        </Button>
      </div>
    </form>
  );
}
