"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Loader2, Megaphone, Plus, Trash2 } from "lucide-react";
import type { Announcement } from "@/types";

// Novedades internas: se muestran como carteles en el Inicio mientras estén activas.

export function AnnouncementsManager({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    if (title.trim().length < 2) return;
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), body: body.trim() || null }),
        });
        if (!res.ok) {
          const json = await res.json();
          setError(json.error?.message ?? "No se pudo crear la novedad");
          return;
        }
        setTitle("");
        setBody("");
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  function toggleActive(a: Announcement) {
    startTransition(async () => {
      await fetch(`/api/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !a.active }),
      });
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4 text-blue-600" />
          Novedades del Inicio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border p-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (ej: Asamblea general el viernes 18 hs)"
            maxLength={200}
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Detalle opcional"
            rows={2}
            maxLength={2000}
          />
          <Button size="sm" onClick={create} disabled={isPending || title.trim().length < 2}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Publicar novedad
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {announcements.length === 0 ? (
          <p className="py-3 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No hay novedades cargadas.
          </p>
        ) : (
          <ul className="space-y-2">
            {announcements.map((a) => (
              <li
                key={a.id}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${a.active ? "" : "opacity-60"}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">{a.body}</p>
                  )}
                  <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                    {a.active ? "Visible en el Inicio" : "Oculta"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(a)}
                  disabled={isPending}
                  title={a.active ? "Ocultar del Inicio" : "Mostrar en el Inicio"}
                  className="mt-0.5 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                >
                  {a.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={isPending}
                  title="Eliminar"
                  className="mt-0.5 text-[hsl(var(--muted-foreground))] transition-colors hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
