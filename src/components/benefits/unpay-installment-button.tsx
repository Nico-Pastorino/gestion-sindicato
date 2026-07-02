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
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { Loader2, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";

interface UnpayInstallmentButtonProps {
  installmentId: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: string;
  dueDate: string;
}

export function UnpayInstallmentButton({
  installmentId,
  installmentNumber,
  totalInstallments,
  amount,
  dueDate,
}: UnpayInstallmentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUnpay() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/installments/${installmentId}/unpay`, {
          method: "POST",
        });
        const json = await res.json();

        if (!res.ok) {
          setError(json.error?.message ?? "Error al registrar no cobrado");
          return;
        }

        setOpen(false);
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-orange-700 border-orange-200 hover:bg-orange-50">
          <RotateCcw className="h-3.5 w-3.5" />
          No cobrado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-600" />
            Registrar cuota no cobrada
          </DialogTitle>
          <DialogDescription>
            Cuota {installmentNumber}/{totalInstallments} - Vencimiento:{" "}
            {formatDate(dueDate)} - Monto: <strong><SensitiveValue value={formatCurrency(amount)} /></strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            La cuota dejará de figurar como pagada, se descontará de lo cobrado y volverá a quedar
            pendiente o vencida según su fecha. El cambio queda asentado en auditoría.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleUnpay} disabled={isPending} className="bg-orange-600 hover:bg-orange-700">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Confirmar no cobrado
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
