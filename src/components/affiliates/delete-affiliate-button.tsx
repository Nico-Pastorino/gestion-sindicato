"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteAffiliateButtonProps {
  affiliateId: string;
  affiliateName: string;
  /** Si se pasa, navega ahí después de borrar (ej. la ficha vuelve al listado). */
  redirectTo?: string;
  /** Botón solo ícono (para usar como acción de fila en una tabla). */
  iconOnly?: boolean;
}

export function DeleteAffiliateButton({
  affiliateId,
  affiliateName,
  redirectTo,
  iconOnly = false,
}: DeleteAffiliateButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/affiliates/${affiliateId}`, { method: "DELETE" });
        const json = await res.json();

        if (!res.ok) {
          setError(json.error?.message ?? "Error al eliminar el afiliado");
          return;
        }

        setOpen(false);
        if (redirectTo) {
          router.push(redirectTo);
        }
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => e.stopPropagation()}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Eliminar</span>
          </Button>
        ) : (
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Eliminar afiliado
          </DialogTitle>
          <DialogDescription>
            Vas a eliminar definitivamente a <strong>{affiliateName}</strong>. Esta acción no se
            puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Si el afiliado ya tiene beneficios o cuotas cargadas, no se va a poder eliminar — en
            ese caso marcalo como Inactivo desde su ficha en lugar de borrarlo.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Confirmar eliminación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
