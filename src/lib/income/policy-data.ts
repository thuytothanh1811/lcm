/**
 * Constants transcribed from "ALLAD2608 – 001 Chính sách thu nhập Life
 * Planner - Final" (effective 01/10/2026). All FYC/FYP amounts are in
 * triệu đồng (VND millions); all rates are percentages (e.g. 120 = 120%).
 */

export const DEFAULT_WORKING_DAYS_PER_MONTH = 22;

// I.2 — Renewal commission (RYC) quarterly eligibility, by active months
// in the quarter and %K2, checked top-down (first match wins).
export const RYC_TIERS = [
  { minActiveMonths: 2, minK2: 80, rate: 120 },
  { minActiveMonths: 1, minK2: 60, rate: 100 },
  { minActiveMonths: 1, minK2: 0, rate: 80 },
] as const;

// II.A — Allowance/workday (triệu đồng), achieved via Option 1 (FYC only)
// or Option 2 (lower FYC bar + at least 1 referred LP in the month). The
// LP is granted the highest tier they qualify for across both options.
export const FA_ALLOWANCE_OPTION_1 = [
  { minFyc: 25, allowancePerWorkday: 0.5 },
  { minFyc: 15, allowancePerWorkday: 0.3 },
  { minFyc: 0, allowancePerWorkday: 0.2 },
] as const;

export const FA_ALLOWANCE_OPTION_2 = [
  { minFyc: 25, minReferredLp: 1, allowancePerWorkday: 0.7 },
  { minFyc: 15, minReferredLp: 1, allowancePerWorkday: 0.5 },
  { minFyc: 0, minReferredLp: 1, allowancePerWorkday: 0.3 },
] as const;

// II.B — %K2 coefficient used in the FA formula.
export const FA_K2_COEFFICIENT_TIERS = [
  { minK2: 80, coefficient: 120 },
  { minK2: 70, coefficient: 110 },
  { minK2: 60, coefficient: 100 }, // also applies when K2 is N/A
  { minK2: 0, coefficient: 50 },
] as const;

// II.C — %MDRT coefficient used in the FA formula.
export const FA_MDRT_COEFFICIENT = { achieved: 120, notAchieved: 100 };

// II.D — %Contract coefficient used in the FA formula.
export const FA_CONTRACT_COEFFICIENT_TIERS = [
  { minContracts: 2, coefficient: 100 },
  { minContracts: 1, coefficient: 70 },
  { minContracts: 0.5, coefficient: 50 },
  { minContracts: 0, coefficient: 0 },
] as const;

export const FA_NEW_LP_GUARANTEE = {
  allowancePerWorkday: 0.3,
  windowMonths: 2,
  minContracts: 1,
};

export const FA_QUARTERLY_GUARANTEE = {
  allowancePerWorkday: 0.15,
  minContracts: 6,
  minFyc: 24,
};

// III/IV — Monthly & quarterly sales bonus. "Established" = LP/UM+ that
// already has a K2 track record or ≥15% 1Up; "firstYear" = still in the
// first year with 1Up < 15% or no K2 (N/A) yet.
export const MONTHLY_BONUS_ESTABLISHED_TIERS = [
  { minFyc: 25, rate80: 50, rate70: 40, rate60: 30, rate50: 20 },
  { minFyc: 15, rate80: 35, rate70: 30, rate60: 25, rate50: 15 },
  { minFyc: 10, rate80: 25, rate70: 20, rate60: 15, rate50: 8 },
  { minFyc: 5, rate80: 15, rate70: 10, rate60: 5, rate50: 3 },
] as const;

export const MONTHLY_BONUS_FIRST_YEAR_TIERS = [
  { minFyc: 25, rate: 30 },
  { minFyc: 15, rate: 25 },
  { minFyc: 10, rate: 15 },
  { minFyc: 5, rate: 5 },
] as const;

export const QUARTERLY_BONUS_ESTABLISHED_TIERS = [
  { minFyc: 90, rate80: 50, rate70: 40, rate60: 30, rate50: 20 },
  { minFyc: 60, rate80: 35, rate70: 30, rate60: 20, rate50: 15 },
  { minFyc: 40, rate80: 25, rate70: 20, rate60: 10, rate50: 8 },
  { minFyc: 30, rate80: 20, rate70: 15, rate60: 5, rate50: 3 },
] as const;

export const QUARTERLY_BONUS_FIRST_YEAR_TIERS = [
  { minFyc: 90, rate: 30 },
  { minFyc: 60, rate: 20 },
  { minFyc: 40, rate: 10 },
  { minFyc: 30, rate: 5 },
] as const;

export const SALES_BONUS_ELIGIBILITY = {
  minK2: 50,
  monthlyMinAttendanceDays: 4,
  quarterlyMinAttendanceDays: 4,
};

// V — MDRT title bonus, by number of consecutive MDRT achievements.
export const MDRT_BONUS_TIERS = [
  { consecutiveTimes: 1, bonus: 20, partTimeOrUmOnly: true },
  { consecutiveTimes: 2, bonus: 50, partTimeOrUmOnly: false },
  { consecutiveTimes: 5, bonus: 500, partTimeOrUmOnly: false },
  { consecutiveTimes: 8, bonus: 1000, partTimeOrUmOnly: false },
] as const;

export const MDRT_BONUS_MIN_AVG_K2 = 70;

// VI — Health insurance package eligibility.
export const HEALTH_INSURANCE = {
  minActiveMonths: 10,
  windowMonths: 12,
};

// B — Promotion to Trưởng Phòng Kinh Doanh (UM).
export const UM_PROMOTION_CRITERIA = {
  minTenureMonths: 18,
  resultsWindowMonths: 6,
  minPersonalFyc: 90,
  minReferredLpFyc: 160,
  minReferredLpCount: 4,
  minPersonalAttendance: 50,
};

// C — Contract maintenance (LP position).
export const CONTRACT_MAINTENANCE_CRITERIA = {
  minTenureMonths: 3,
  resultsWindowMonths: 3,
  minPersonalNetFyc: 12,
  minAttendanceFullTime: 50,
  seGraceMonths: 3,
  seReactivationMinContracts: 1,
  seReactivationMinFyc: 4,
};

// D.i — "Active month" definition.
export const ACTIVE_MONTH = { minContracts: 1, minFyc: 4 };
