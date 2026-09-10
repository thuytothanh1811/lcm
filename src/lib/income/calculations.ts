import {
  ACTIVE_MONTH,
  CONTRACT_MAINTENANCE_CRITERIA,
  DEFAULT_WORKING_DAYS_PER_MONTH,
  FA_ALLOWANCE_OPTION_1,
  FA_ALLOWANCE_OPTION_2,
  FA_CONTRACT_COEFFICIENT_TIERS,
  FA_K2_COEFFICIENT_TIERS,
  FA_MDRT_COEFFICIENT,
  HEALTH_INSURANCE,
  MDRT_BONUS_MIN_AVG_K2,
  MDRT_BONUS_TIERS,
  MONTHLY_BONUS_ESTABLISHED_TIERS,
  MONTHLY_BONUS_FIRST_YEAR_TIERS,
  QUARTERLY_BONUS_ESTABLISHED_TIERS,
  QUARTERLY_BONUS_FIRST_YEAR_TIERS,
  RYC_TIERS,
  SALES_BONUS_ELIGIBILITY,
  UM_PROMOTION_CRITERIA,
} from "@/lib/income/policy-data";

export function roundTo1Decimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** %attendance = (days worked + 1) / working days in the period, capped at 100%. */
export function computeAttendanceRate(
  daysWorked: number,
  workingDaysInPeriod: number
): number {
  if (workingDaysInPeriod <= 0) return 0;
  const rate = ((daysWorked + 1) / workingDaysInPeriod) * 100;
  return roundTo1Decimal(Math.min(100, Math.max(0, rate)));
}

/** Hệ số ngày làm việc = %attendance × 22. */
export function computeWorkdayCoefficient(
  attendanceRatePercent: number
): number {
  return roundTo1Decimal(
    (attendanceRatePercent / 100) * DEFAULT_WORKING_DAYS_PER_MONTH
  );
}

export interface FaAllowanceResult {
  allowancePerWorkday: number;
  viaOption1: number;
  viaOption2: number;
}

/** II.A — best Allowance/workday tier reached via Option 1 or Option 2. */
export function getFaAllowancePerWorkday(
  fycMonth: number,
  referredLpCount: number
): FaAllowanceResult {
  const viaOption1 =
    FA_ALLOWANCE_OPTION_1.find(tier => fycMonth >= tier.minFyc)
      ?.allowancePerWorkday ?? 0;

  const viaOption2 =
    referredLpCount >= 1
      ? (FA_ALLOWANCE_OPTION_2.find(tier => fycMonth >= tier.minFyc)
          ?.allowancePerWorkday ?? 0)
      : 0;

  return {
    allowancePerWorkday: Math.max(viaOption1, viaOption2),
    viaOption1,
    viaOption2,
  };
}

/** II.B — %K2 coefficient; pass null for "N/A" (no K2 history yet). */
export function getFaK2Coefficient(k2Percent: number | null): number {
  if (k2Percent === null) return 100;
  return (
    FA_K2_COEFFICIENT_TIERS.find(tier => k2Percent >= tier.minK2)
      ?.coefficient ?? 50
  );
}

/** II.C — %MDRT coefficient. */
export function getFaMdrtCoefficient(achievedMdrtLastYear: boolean): number {
  return achievedMdrtLastYear
    ? FA_MDRT_COEFFICIENT.achieved
    : FA_MDRT_COEFFICIENT.notAchieved;
}

/** II.D — %Contract coefficient. */
export function getFaContractCoefficient(contractsInMonth: number): number {
  return (
    FA_CONTRACT_COEFFICIENT_TIERS.find(
      tier => contractsInMonth >= tier.minContracts
    )?.coefficient ?? 0
  );
}

export interface FaCalculationInput {
  fycMonth: number;
  referredLpCount: number;
  k2Percent: number | null;
  achievedMdrtLastYear: boolean;
  contractsInMonth: number;
  daysWorked: number;
  workingDaysInMonth: number;
}

export interface FaCalculationResult {
  attendanceRate: number;
  workdayCoefficient: number;
  allowancePerWorkday: number;
  k2Coefficient: number;
  mdrtCoefficient: number;
  contractCoefficient: number;
  total: number;
}

/** II — Phụ cấp cố định hàng tháng (FA), full-time LP only. */
export function computeFa(input: FaCalculationInput): FaCalculationResult {
  const attendanceRate = computeAttendanceRate(
    input.daysWorked,
    input.workingDaysInMonth
  );
  const workdayCoefficient = computeWorkdayCoefficient(attendanceRate);
  const allowancePerWorkday = getFaAllowancePerWorkday(
    input.fycMonth,
    input.referredLpCount
  ).allowancePerWorkday;
  const k2Coefficient = getFaK2Coefficient(input.k2Percent);
  const mdrtCoefficient = getFaMdrtCoefficient(input.achievedMdrtLastYear);
  const contractCoefficient = getFaContractCoefficient(input.contractsInMonth);

  const total =
    allowancePerWorkday *
    workdayCoefficient *
    (k2Coefficient / 100) *
    (mdrtCoefficient / 100) *
    (contractCoefficient / 100);

  return {
    attendanceRate,
    workdayCoefficient,
    allowancePerWorkday,
    k2Coefficient,
    mdrtCoefficient,
    contractCoefficient,
    total,
  };
}

export type QualityColumn = "rate80" | "rate70" | "rate60" | "rate50";

/** Highest quality column an LP/UM+ qualifies for from %K2 or %1Up. */
export function getQualityColumn(
  k2Percent: number | null,
  oneUpPercent: number
): QualityColumn {
  const k2 = k2Percent ?? 0;
  if (k2 >= 80 || oneUpPercent >= 25) return "rate80";
  if (k2 >= 70 || oneUpPercent >= 15) return "rate70";
  if (k2 >= 60) return "rate60";
  return "rate50";
}

export interface SalesBonusInput {
  fyc: number;
  isEstablished: boolean; // has K2 track record or ≥15% 1Up
  k2Percent: number | null;
  oneUpPercent: number;
  attendanceDays: number;
  minAttendanceDays: number;
}

export interface SalesBonusResult {
  eligible: boolean;
  ineligibleReason?: "minK2" | "minAttendance" | "belowMinFyc";
  qualityColumn: QualityColumn | null;
  rate: number;
  bonusAmount: number;
}

function computeSalesBonus(
  input: SalesBonusInput,
  establishedTiers: readonly {
    minFyc: number;
    rate80: number;
    rate70: number;
    rate60: number;
    rate50: number;
  }[],
  firstYearTiers: readonly { minFyc: number; rate: number }[]
): SalesBonusResult {
  if (input.attendanceDays < input.minAttendanceDays) {
    return {
      eligible: false,
      ineligibleReason: "minAttendance",
      qualityColumn: null,
      rate: 0,
      bonusAmount: 0,
    };
  }
  if (
    input.k2Percent !== null &&
    input.k2Percent < SALES_BONUS_ELIGIBILITY.minK2
  ) {
    return {
      eligible: false,
      ineligibleReason: "minK2",
      qualityColumn: null,
      rate: 0,
      bonusAmount: 0,
    };
  }

  if (input.isEstablished) {
    const column = getQualityColumn(input.k2Percent, input.oneUpPercent);
    const tier = establishedTiers.find(t => input.fyc >= t.minFyc);
    if (!tier) {
      return {
        eligible: false,
        ineligibleReason: "belowMinFyc",
        qualityColumn: column,
        rate: 0,
        bonusAmount: 0,
      };
    }
    const rate = tier[column];
    return {
      eligible: true,
      qualityColumn: column,
      rate,
      bonusAmount: (input.fyc * rate) / 100,
    };
  }

  const tier = firstYearTiers.find(t => input.fyc >= t.minFyc);
  if (!tier) {
    return {
      eligible: false,
      ineligibleReason: "belowMinFyc",
      qualityColumn: null,
      rate: 0,
      bonusAmount: 0,
    };
  }
  return {
    eligible: true,
    qualityColumn: null,
    rate: tier.rate,
    bonusAmount: (input.fyc * tier.rate) / 100,
  };
}

/** III — Thưởng doanh số hàng tháng. */
export function computeMonthlyBonus(
  input: Omit<SalesBonusInput, "minAttendanceDays">
): SalesBonusResult {
  return computeSalesBonus(
    {
      ...input,
      minAttendanceDays: SALES_BONUS_ELIGIBILITY.monthlyMinAttendanceDays,
    },
    MONTHLY_BONUS_ESTABLISHED_TIERS,
    MONTHLY_BONUS_FIRST_YEAR_TIERS
  );
}

/** IV — Thưởng doanh số hàng quý. */
export function computeQuarterlyBonus(
  input: Omit<SalesBonusInput, "minAttendanceDays">
): SalesBonusResult {
  return computeSalesBonus(
    {
      ...input,
      minAttendanceDays: SALES_BONUS_ELIGIBILITY.quarterlyMinAttendanceDays,
    },
    QUARTERLY_BONUS_ESTABLISHED_TIERS,
    QUARTERLY_BONUS_FIRST_YEAR_TIERS
  );
}

/** FYC quy đổi cho LP/UM+ gia nhập giữa quý = FYC thực tế ÷ (tháng làm việc/3). */
export function convertMidQuarterFyc(
  actualFyc: number,
  monthsWorkedInQuarter: number
): number {
  if (monthsWorkedInQuarter <= 0) return 0;
  return actualFyc / (monthsWorkedInQuarter / 3);
}

export interface RycResult {
  eligible: boolean;
  rate: number;
}

/** I.2 — Tỷ lệ chi trả hoa hồng tái tục (RYC), theo quý. */
export function getRycRate(
  activeMonthsInQuarter: number,
  k2AveragePercent: number
): RycResult {
  const tier = RYC_TIERS.find(
    t =>
      activeMonthsInQuarter >= t.minActiveMonths && k2AveragePercent >= t.minK2
  );
  return tier
    ? { eligible: true, rate: tier.rate }
    : { eligible: false, rate: 0 };
}

export interface MdrtBonusResult {
  eligible: boolean;
  ineligibleReason?: "minAvgK2" | "partTimeOrUmOnlyForOneTime" | "noTier";
  bonus: number;
}

/** V — Thưởng danh hiệu MDRT. */
export function getMdrtBonus(
  consecutiveTimes: number,
  isPartTimeOrUm: boolean,
  avgK2Percent: number | null
): MdrtBonusResult {
  if (avgK2Percent !== null && avgK2Percent < MDRT_BONUS_MIN_AVG_K2) {
    return { eligible: false, ineligibleReason: "minAvgK2", bonus: 0 };
  }

  const tier = [...MDRT_BONUS_TIERS]
    .reverse()
    .find(t => consecutiveTimes >= t.consecutiveTimes);
  if (!tier) return { eligible: false, ineligibleReason: "noTier", bonus: 0 };

  if (tier.consecutiveTimes === 1 && tier.partTimeOrUmOnly && !isPartTimeOrUm) {
    return {
      eligible: false,
      ineligibleReason: "partTimeOrUmOnlyForOneTime",
      bonus: 0,
    };
  }

  return { eligible: true, bonus: tier.bonus };
}

/** VI — Điều kiện gói bảo hiểm sức khỏe. */
export function isHealthInsuranceEligible(
  activeMonthsInLast12: number
): boolean {
  return activeMonthsInLast12 >= HEALTH_INSURANCE.minActiveMonths;
}

/** D.i — Tháng hoạt động. */
export function isActiveMonth(contracts: number, fyc: number): boolean {
  return contracts >= ACTIVE_MONTH.minContracts && fyc >= ACTIVE_MONTH.minFyc;
}

export interface UmPromotionInput {
  tenureMonths: number;
  personalFyc6m: number;
  referredLpFyc6m: number;
  referredLpCount: number;
  personalAttendance: number;
}

export interface UmPromotionCriterionCheck {
  key: keyof typeof UM_PROMOTION_CRITERIA;
  met: boolean;
}

/** B — Điều kiện thăng tiến lên UM (mỗi tiêu chí, đánh giá độc lập). */
export function checkUmPromotion(input: UmPromotionInput): {
  eligible: boolean;
  checks: UmPromotionCriterionCheck[];
} {
  const checks: UmPromotionCriterionCheck[] = [
    {
      key: "minTenureMonths",
      met: input.tenureMonths >= UM_PROMOTION_CRITERIA.minTenureMonths,
    },
    {
      key: "minPersonalFyc",
      met: input.personalFyc6m >= UM_PROMOTION_CRITERIA.minPersonalFyc,
    },
    {
      key: "minReferredLpFyc",
      met: input.referredLpFyc6m >= UM_PROMOTION_CRITERIA.minReferredLpFyc,
    },
    {
      key: "minReferredLpCount",
      met: input.referredLpCount >= UM_PROMOTION_CRITERIA.minReferredLpCount,
    },
    {
      key: "minPersonalAttendance",
      met:
        input.personalAttendance >= UM_PROMOTION_CRITERIA.minPersonalAttendance,
    },
  ];
  return { eligible: checks.every(c => c.met), checks };
}

export interface ContractMaintenanceInput {
  tenureMonths: number;
  personalNetFyc3m: number;
  isFullTime: boolean;
  attendance3m: number;
}

export interface ContractMaintenanceCriterionCheck {
  key: keyof typeof CONTRACT_MAINTENANCE_CRITERIA;
  met: boolean;
  applicable: boolean;
}

/** C — Điều kiện duy trì hợp đồng (vị trí LP). */
export function checkContractMaintenance(input: ContractMaintenanceInput): {
  met: boolean;
  checks: ContractMaintenanceCriterionCheck[];
} {
  const checks: ContractMaintenanceCriterionCheck[] = [
    {
      key: "minTenureMonths",
      met: input.tenureMonths >= CONTRACT_MAINTENANCE_CRITERIA.minTenureMonths,
      applicable: true,
    },
    {
      key: "minPersonalNetFyc",
      met:
        input.personalNetFyc3m >=
        CONTRACT_MAINTENANCE_CRITERIA.minPersonalNetFyc,
      applicable: true,
    },
    {
      key: "minAttendanceFullTime",
      met:
        !input.isFullTime ||
        input.attendance3m >=
          CONTRACT_MAINTENANCE_CRITERIA.minAttendanceFullTime,
      applicable: input.isFullTime,
    },
  ];
  return { met: checks.every(c => c.met), checks };
}
