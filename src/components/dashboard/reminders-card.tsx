"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ListTodo, Loader2, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import type { Reminder } from "@/types";

// Recordatorios del equipo: alta y resolución rápidas desde el Inicio.

export function RemindersCard({ reminders }: { reminders: Reminder[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  function submit() {
    if (title.trim().length < 2) return;
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), dueDate: dueDate || null }),
        });
        if (!res.ok) {
          const json = await res.json();
          setError(json.error?.message ?? "No se pudo crear el recordatorio");
          return;
        }
        setTitle("");
        setDueDate("");
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  function complete(id: string) {
    startTransition(async () => {
      await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-4 w-4" />
          Recordatorios del equipo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ej: reclamar ficha firmada de Juan"
            className="h-9 text-sm"
            maxLength={300}
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 w-[9.5rem] text-sm"
            />
            <Button size="sm" onClick={submit} disabled={isPending || title.trim().length < 2}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Agregar
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {reminders.length === 0 ? (
          <p className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Sin recordatorios pendientes.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {reminders.map((r) => {
              const overdue = r.dueDate != null && r.dueDate < today;
              return (
                <li
                  key={r.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${overdue ? "border-red-200 bg-red-50/50" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => complete(r.id)}
                    disabled={isPending}
                    title="Marcar como hecho"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--border))] text-transparent transition-colors hover:border-green-500 hover:text-green-600"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.title}</p>
                    {r.dueDate && (
                      <p className={`text-xs ${overdue ? "font-medium text-red-700" : "text-[hsl(var(--muted-foreground))]"}`}>
                        {overdue ? "Venció el " : "Para el "}
                        {formatDate(r.dueDate)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    disabled={isPending}
                    title="Eliminar"
                    className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
