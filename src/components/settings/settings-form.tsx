"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, Mail, MessageCircle, Save } from "lucide-react";
import type { AppSettings } from "@/lib/services/settings.service";

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const router = useRouter();
  const [template, setTemplate] = useState(initial.whatsappBirthdayTemplate);
  const [digestEmail, setDigestEmail] = useState(initial.weeklyDigestEmail);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      setError(null);
      setSaved(false);
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            whatsappBirthdayTemplate: template.trim(),
            weeklyDigestEmail: digestEmail.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? "No se pudo guardar la configuración");
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  const preview = template
    .replaceAll("{nombre}", "María")
    .replaceAll("{nombre_completo}", "María López");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-green-600" />
          Saludos y avisos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="birthday-template">Saludo de cumpleaños por WhatsApp</Label>
          <Textarea
            id="birthday-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={4}
            maxLength={1000}
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Escribí <code className="rounded bg-[hsl(var(--muted))] px-1">{"{nombre}"}</code> donde
            va el nombre de pila del afiliado (como el padrón se carga
            &quot;Apellido Nombre&quot;, se usa la segunda palabra: GARCIA JUAN → Juan), o{" "}
            <code className="rounded bg-[hsl(var(--muted))] px-1">{"{nombre_completo}"}</code> para
            el nombre completo. El botón &quot;Saludar&quot; del Inicio abre WhatsApp con este
            texto listo para enviar desde el número del sindicato.
          </p>
          <div className="rounded-lg border bg-[hsl(var(--muted))]/30 px-3 py-2">
            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Vista previa</p>
            <p className="mt-1 whitespace-pre-line text-sm">{preview || "—"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="digest-email" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Resumen semanal por email
          </Label>
          <Input
            id="digest-email"
            type="email"
            value={digestEmail}
            onChange={(e) => setDigestEmail(e.target.value)}
            placeholder="secretaria@sindicato.org"
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Todos los lunes se envía un resumen del padrón (altas, documentación, cumpleaños) a
            esta dirección. Dejalo vacío para no enviar nada.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {saved && !error && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Configuración guardada.
          </p>
        )}

        <Button onClick={save} disabled={isPending || template.trim().length < 5}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
}
