/**
 * Etiquetas visibles para los tipos de beneficio.
 * El valor interno en DB sigue siendo "supermercado"; solo cambia la etiqueta mostrada.
 */
export function getBenefitTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case "ayuda_economica": return "Ayuda Económica";
    case "supermercado":
    case "supermercado_orden_compra":
    case "orden_compra":
    case "comercio":     return "Comercio";
    case "otro":         return "Otro";
    default:             return type ?? "—";
  }
}

/**
 * Devuelve true para cualquier variante del tipo Comercio.
 * Regla: solo permite 1 cuota.
 */
export function isCommerceBenefitType(type: string | null | undefined): boolean {
  return (
    type === "supermercado" ||
    type === "supermercado_orden_compra" ||
    type === "orden_compra" ||
    type === "comercio"
  );
}
