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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/credit";
import { toISODate, formatDate } from "@/lib/utils/date";

interface PayInstallmentButtonProps {
  installmentId: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: string;
  dueDate: string;
}

export function PayInstallmentButton({
  installmentId,
  installmentNumber,
  totalInstallments,
  amount,
  dueDate,
}: PayInstallmentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(toISODate());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/installments/${installmentId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paidDate }),
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json.error?.message ?? "Error al registrar el pago");
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
        <Button size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Marcar pagada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Registrar pago de cuota
          </DialogTitle>
          <DialogDescription>
            Cuota {installmentNumber}/{totalInstallments} — Vencimiento:{" "}
            {formatDate(dueDate)} — Monto: <strong><SensitiveValue value={formatCurrency(amount)} /></strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label>Fecha de pago</Label>
            <Input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handlePay} disabled={isPending} className="bg-green-600 hover:bg-green-700">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar pago
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
