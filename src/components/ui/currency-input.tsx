"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { parseCurrencyInput, formatNumberARS } from "@/lib/utils/currency";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
  id?: string;
  name?: string;
}

/**
 * Input de moneda con formato argentino.
 *
 * Comportamiento:
 *  - Sin foco: muestra "654.361,66" (formateado, sin $)
 *  - Con foco: edición libre — acepta "654361,66", "654.361,66", "100000", etc.
 *  - Al perder foco: parsea y normaliza el valor
 *  - El símbolo $ se muestra en un span fijo a la izquierda
 *
 * Fixes vs versión anterior:
 *  - Sin inputMode="decimal" → teclado completo en móvil, coma disponible
 *  - Sin regex estricto → acepta pegar "$654.361,66" sin bloquear
 *  - Display usa formatNumberARS (sin $) para evitar problemas con Intl spaces
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  disabled = false,
  hasError = false,
  id,
  name,
}: CurrencyInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Cuando está en edición: muestra el draft (lo que el usuario está escribiendo)
  // Cuando no: muestra el número formateado sin símbolo $ (el $ ya está en el span)
  const displayValue = editing
    ? draft
    : value > 0
    ? formatNumberARS(value)
    : "";

  function handleFocus() {
    setEditing(true);
    // Mostrar número editable con coma decimal para que el usuario pueda modificar
    // Ej: 654361.66 → "654361,66"
    const editable = value > 0 ? value.toFixed(2).replace(".", ",") : "";
    setDraft(editable);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function handleBlur() {
    setEditing(false);
    const parsed = parseCurrencyInput(draft);
    onChange(parsed);
    setDraft("");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setDraft(val);
    // Parse en tiempo real para que los cálculos dependientes se actualicen
    const parsed = parseCurrencyInput(val);
    onChange(parsed);
  }

  return (
    <div className={cn("relative", className)}>
      {/* Símbolo $ fijo a la izquierda */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))] select-none pointer-events-none z-10">
        $
      </span>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        // Sin inputMode → teclado completo en móvil (el usuario puede escribir coma)
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-white pl-7 pr-3 py-2 text-sm",
          "placeholder:text-[hsl(var(--muted-foreground))]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          hasError && "border-red-400 focus-visible:ring-red-400"
        )}
      />
    </div>
  );
}
