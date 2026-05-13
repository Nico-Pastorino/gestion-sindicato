import { roundMoney } from "./currency";

export interface BenefitFinancials {
  principalAmount: number;
  totalRepaymentAmount: number;
  interestAmount: number;
  interestRate: number;
  installmentsCount: number;
  paidInstallmentsCount: number;
  pendingInstallmentsCount: number;
  cancelledInstallmentsCount: number;
  paidAmount: number;
  pendingAmount: number;
  interestPerInstallment: number;
  earnedInterestAmount: number;
  pendingInterestAmount: number;
}

interface BenefitLike {
  totalAmount: string | number;
  totalRepaymentAmount: string | number;
  interestAmount: string | number;
  interestRate: string | number;
  installmentsCount: number;
}

interface InstallmentLike {
  amount: string | number;
  status: string;
}

export function calculateBenefitFinancials(
  benefit: BenefitLike,
  installments: InstallmentLike[]
): BenefitFinancials {
  const principalAmount = roundMoney(Number(benefit.totalAmount));
  const totalRepaymentAmount = roundMoney(Number(benefit.totalRepaymentAmount));
  const interestAmount = roundMoney(Number(benefit.interestAmount));
  const interestRate = roundMoney(Number(benefit.interestRate));
  const installmentsCount = benefit.installmentsCount;

  const paidList = installments.filter((i) => i.status === "paid");
  const pendingList = installments.filter(
    (i) => i.status === "pending" || i.status === "overdue"
  );
  const cancelledList = installments.filter((i) => i.status === "cancelled");

  const paidAmount = roundMoney(
    paidList.reduce((s, i) => s + Number(i.amount), 0)
  );
  const pendingAmount = roundMoney(
    pendingList.reduce((s, i) => s + Number(i.amount), 0)
  );

  const activeCount = installmentsCount - cancelledList.length;
  const interestPerInstallment =
    activeCount > 0 ? roundMoney(interestAmount / activeCount) : 0;

  const earnedInterestAmount = roundMoney(
    paidList.length * interestPerInstallment
  );
  const pendingInterestAmount = roundMoney(
    interestAmount - earnedInterestAmount
  );

  return {
    principalAmount,
    totalRepaymentAmount,
    interestAmount,
    interestRate,
    installmentsCount,
    paidInstallmentsCount: paidList.length,
    pendingInstallmentsCount: pendingList.length,
    cancelledInstallmentsCount: cancelledList.length,
    paidAmount,
    pendingAmount,
    interestPerInstallment,
    earnedInterestAmount,
    pendingInterestAmount,
  };
}

/**
 * Agrega los financials de múltiples beneficios de un afiliado.
 */
export function aggregateBenefitFinancials(
  items: BenefitFinancials[]
): Omit<BenefitFinancials, "interestRate" | "interestPerInstallment" | "installmentsCount"> & {
  activeBenefitsCount: number;
} {
  const sum = (key: keyof BenefitFinancials) =>
    roundMoney(items.reduce((s, f) => s + (f[key] as number), 0));

  return {
    principalAmount: sum("principalAmount"),
    totalRepaymentAmount: sum("totalRepaymentAmount"),
    interestAmount: sum("interestAmount"),
    paidInstallmentsCount: sum("paidInstallmentsCount"),
    pendingInstallmentsCount: sum("pendingInstallmentsCount"),
    cancelledInstallmentsCount: sum("cancelledInstallmentsCount"),
    paidAmount: sum("paidAmount"),
    pendingAmount: sum("pendingAmount"),
    earnedInterestAmount: sum("earnedInterestAmount"),
    pendingInterestAmount: sum("pendingInterestAmount"),
    activeBenefitsCount: items.length,
  };
}
