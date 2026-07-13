"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BadgeCheck, GraduationCap, Loader2, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { FAMILY_RELATIONSHIP_LABELS, formatFamilyRelationship } from "@/lib/utils/labels";
import { formatDate } from "@/lib/utils/date";
import type { FamilyMember, FamilyRelationship } from "@/types";

// Grupo familiar del afiliado. El certificado de alumno regular habilita la
// entrega de útiles escolares al comienzo de clases.

interface FormState {
  fullName: string;
  relationship: FamilyRelationship;
  dni: string;
  birthDate: string;
  studentCertificate: boolean;
  studentCertificateDate: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  fullName: "",
  relationship: "hijo_a",
  dni: "",
  birthDate: "",
  studentCertificate: false,
  studentCertificateDate: "",
  notes: "",
};

export function FamilyMembersCard({
  affiliateId,
  members,
}: {
  affiliateId: string;
  members: FamilyMember[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(member: FamilyMember) {
    setEditing(member);
    setForm({
      fullName: member.fullName,
      relationship: member.relationship,
      dni: member.dni ?? "",
      birthDate: member.birthDate ?? "",
      studentCertificate: member.studentCertificate,
      studentCertificateDate: member.studentCertificateDate ?? "",
      notes: member.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      setError(null);
      const payload = {
        fullName: form.fullName.trim(),
        relationship: form.relationship,
        dni: form.dni.trim() || null,
        birthDate: form.birthDate || null,
        studentCertificate: form.studentCertificate,
        studentCertificateDate: form.studentCertificate ? form.studentCertificateDate || null : null,
        notes: form.notes.trim() || null,
      };
      try {
        const res = editing
          ? await fetch(`/api/family-members/${editing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/affiliates/${affiliateId}/family`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? "No se pudo guardar el familiar");
          return;
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch(`/api/family-members/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  const students = members.filter((m) => m.studentCertificate);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersRound className="h-4 w-4" />
            Grupo familiar
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" />
            Agregar familiar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {students.length > 0 && (
          <p className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-800">
            <GraduationCap className="h-4 w-4 shrink-0" />
            {students.length} con certificado de alumno regular presentado (útiles escolares).
          </p>
        )}

        {members.length === 0 ? (
          <p className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Sin familiares cargados. Agregá hijos/as y cónyuge para los beneficios sociales
            (útiles escolares, día del niño).
          </p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.fullName}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {formatFamilyRelationship(m.relationship)}
                    {m.dni ? ` · DNI ${m.dni}` : ""}
                    {m.birthDate ? ` · Nac. ${formatDate(m.birthDate)}` : ""}
                  </p>
                  {m.studentCertificate && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-green-700">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Certificado de alumno regular
                      {m.studentCertificateDate
                        ? ` presentado el ${formatDate(m.studentCertificateDate)}`
                        : " presentado"}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  disabled={isPending}
                  title="Editar"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  disabled={isPending}
                  title="Eliminar"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar familiar" : "Agregar familiar"}</DialogTitle>
            <DialogDescription>
              Datos del familiar a cargo del afiliado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fm-name">Nombre completo *</Label>
                <Input
                  id="fm-name"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vínculo</Label>
                <Select
                  value={form.relationship}
                  onValueChange={(v) => setForm((f) => ({ ...f, relationship: v as FamilyRelationship }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FAMILY_RELATIONSHIP_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-dni">DNI</Label>
                <Input
                  id="fm-dni"
                  value={form.dni}
                  onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value.replace(/\D/g, "") }))}
                  maxLength={15}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-birth">Fecha de nacimiento</Label>
                <Input
                  id="fm-birth"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-notes">Notas</Label>
                <Input
                  id="fm-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  maxLength={1000}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-[hsl(var(--muted))]/25 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.studentCertificate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, studentCertificate: e.target.checked }))
                  }
                  className="h-4 w-4 accent-green-600"
                />
                <GraduationCap className="h-4 w-4 text-green-700" />
                Presentó certificado de alumno regular
              </label>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Requisito para recibir útiles escolares al comienzo de clases.
              </p>
              {form.studentCertificate && (
                <div className="mt-2 space-y-1.5">
                  <Label htmlFor="fm-cert-date">Fecha de presentación</Label>
                  <Input
                    id="fm-cert-date"
                    type="date"
                    value={form.studentCertificateDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, studentCertificateDate: e.target.value }))
                    }
                    className="w-48"
                  />
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={isPending || form.fullName.trim().length < 2}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Agregar familiar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
