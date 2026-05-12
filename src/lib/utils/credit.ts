// Utilidades para el cálculo del límite crediticio del 30%.
// La fuente de verdad es la vista SQL affiliate_credit_summary.
// Estas funciones se usan solo para cálculos previos al guardado (UI/validación).

export { formatCurrencyARS as formatCurrency, parseCurrencyInput as parseCurrency, roundMoney } from "./currency";

export const CREDIT_LIMIT_PERCENTAGE = 0.30;

export function calculateCreditLimit(grossSalary: number): number {
  return Math.round(grossSalary * CREDIT_LIMIT_PERCENTAGE * 100) / 100;
}

export function calculateAvailable(grossSalary: number, activeDiscounts: number): number {
  const limit = calculateCreditLimit(grossSalary);
  return Math.max(0, Math.round((limit - activeDiscounts) * 100) / 100);
}

// Solo calcula el base sin interés; el monto real por cuota lo ingresa el operador.
export function calculateBaseInstallment(totalAmount: number, installmentsCount: number): number {
  return Math.round((totalAmount / installmentsCount) * 100) / 100;
}

export function calculateTotalRepayment(installmentAmount: number, installmentsCount: number): number {
  return Math.round(installmentAmount * installmentsCount * 100) / 100;
}

export function calculateInterest(totalAmount: number, totalRepayment: number): number {
  return Math.max(0, Math.round((totalRepayment - totalAmount) * 100) / 100);
}

export function calculateInterestRate(totalAmount: number, interestAmount: number): number {
  if (totalAmount <= 0) return 0;
  return Math.round((interestAmount / totalAmount) * 10000) / 100;
}
