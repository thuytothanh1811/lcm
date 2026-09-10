"use client";

import { useMemo, useState } from "react";

import {
  Award,
  CircleCheck,
  CircleX,
  HeartPulse,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  NumberField,
  ResultRow,
  SwitchField,
} from "@/components/income/calculator-fields";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
import {
  computeFa,
  computeMonthlyBonus,
  computeQuarterlyBonus,
  convertMidQuarterFyc,
  getMdrtBonus,
  getRycRate,
  isHealthInsuranceEligible,
} from "@/lib/income/calculations";
import { formatMillion, formatPercent } from "@/lib/income/format";

export function IncomeCalculatorView() {
  const dict = useDictionary();
  const t = dict.incomeCalculator;

  const [isFullTime, setIsFullTime] = useState(true);
  const [isFirstYear, setIsFirstYear] = useState(false);
  const [hasK2Unknown, setHasK2Unknown] = useState(false);
  const [achievedMdrtLastYear, setAchievedMdrtLastYear] = useState(false);

  const [fycMonth, setFycMonth] = useState(20);
  const [contractsMonth, setContractsMonth] = useState(2);
  const [referredLp, setReferredLp] = useState(0);
  const [k2Percent, setK2Percent] = useState(70);
  const [oneUpPercent, setOneUpPercent] = useState(0);
  const [daysWorked, setDaysWorked] = useState(20);
  const [workingDaysInMonth, setWorkingDaysInMonth] = useState(22);

  const [fycQuarter, setFycQuarter] = useState(60);
  const [joinedMidQuarter, setJoinedMidQuarter] = useState(false);
  const [monthsWorkedInQuarter, setMonthsWorkedInQuarter] = useState(3);
  const [activeMonthsInQuarter, setActiveMonthsInQuarter] = useState(2);
  const [k2AverageQuarter, setK2AverageQuarter] = useState(70);

  const [consecutiveMdrt, setConsecutiveMdrt] = useState(1);
  const [avgK2Year, setAvgK2Year] = useState(70);
  const [activeMonths12, setActiveMonths12] = useState(10);

  const effectiveK2Month = hasK2Unknown ? null : k2Percent;
  const effectiveAvgK2Year = hasK2Unknown ? null : avgK2Year;

  const faResult = useMemo(
    () =>
      computeFa({
        fycMonth,
        referredLpCount: referredLp,
        k2Percent: effectiveK2Month,
        achievedMdrtLastYear,
        contractsInMonth: contractsMonth,
        daysWorked,
        workingDaysInMonth,
      }),
    [
      fycMonth,
      referredLp,
      effectiveK2Month,
      achievedMdrtLastYear,
      contractsMonth,
      daysWorked,
      workingDaysInMonth,
    ]
  );

  const monthlyBonusResult = useMemo(
    () =>
      computeMonthlyBonus({
        fyc: fycMonth,
        isEstablished: !isFirstYear,
        k2Percent: effectiveK2Month,
        oneUpPercent,
        attendanceDays: daysWorked,
      }),
    [fycMonth, isFirstYear, effectiveK2Month, oneUpPercent, daysWorked]
  );

  const convertedFyc = joinedMidQuarter
    ? convertMidQuarterFyc(fycQuarter, monthsWorkedInQuarter)
    : fycQuarter;

  const quarterlyBonusRateResult = useMemo(
    () =>
      computeQuarterlyBonus({
        fyc: convertedFyc,
        isEstablished: !isFirstYear,
        k2Percent: effectiveK2Month,
        oneUpPercent,
        attendanceDays: daysWorked,
      }),
    [convertedFyc, isFirstYear, effectiveK2Month, oneUpPercent, daysWorked]
  );

  const quarterlyBonusResult = {
    ...quarterlyBonusRateResult,
    bonusAmount: joinedMidQuarter
      ? (fycQuarter * quarterlyBonusRateResult.rate) / 100
      : quarterlyBonusRateResult.bonusAmount,
  };

  const rycResult = useMemo(
    () => getRycRate(activeMonthsInQuarter, k2AverageQuarter),
    [activeMonthsInQuarter, k2AverageQuarter]
  );

  const mdrtResult = useMemo(
    () => getMdrtBonus(consecutiveMdrt, !isFullTime, effectiveAvgK2Year),
    [consecutiveMdrt, isFullTime, effectiveAvgK2Year]
  );

  const healthEligible = isHealthInsuranceEligible(activeMonths12);

  const qualityColumnLabel = quarterlyBonusRateResult.qualityColumn
    ? t.results.qualityColumnLabels[quarterlyBonusRateResult.qualityColumn]
    : null;
  const monthlyQualityColumnLabel = monthlyBonusResult.qualityColumn
    ? t.results.qualityColumnLabels[monthlyBonusResult.qualityColumn]
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.inputsCard.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="work-model">{t.inputsCard.workModel}</Label>
            <Select
              value={isFullTime ? "full_time" : "part_time"}
              onValueChange={value => setIsFullTime(value === "full_time")}
            >
              <SelectTrigger id="work-model" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">
                  {t.inputsCard.fullTime}
                </SelectItem>
                <SelectItem value="part_time">
                  {t.inputsCard.partTime}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SwitchField
            id="is-first-year"
            label={t.inputsCard.isFirstYear}
            checked={isFirstYear}
            onChange={setIsFirstYear}
          />
          <SwitchField
            id="has-k2-unknown"
            label={t.inputsCard.hasK2Unknown}
            checked={hasK2Unknown}
            onChange={setHasK2Unknown}
          />
          <SwitchField
            id="achieved-mdrt-last-year"
            label={t.inputsCard.achievedMdrtLastYear}
            checked={achievedMdrtLastYear}
            onChange={setAchievedMdrtLastYear}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">{t.tabs.monthly}</TabsTrigger>
          <TabsTrigger value="quarterly">{t.tabs.quarterly}</TabsTrigger>
          <TabsTrigger value="milestones">{t.tabs.milestones}</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.inputsCard.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                id="fyc-month"
                label={t.fields.fycMonth}
                value={fycMonth}
                onChange={setFycMonth}
                suffix={dict.incomePolicy.units.million}
              />
              <NumberField
                id="contracts-month"
                label={t.fields.contractsMonth}
                value={contractsMonth}
                onChange={setContractsMonth}
                step={0.5}
              />
              <NumberField
                id="referred-lp"
                label={t.fields.referredLp}
                value={referredLp}
                onChange={setReferredLp}
              />
              <NumberField
                id="one-up-percent"
                label={t.fields.oneUpPercent}
                value={oneUpPercent}
                onChange={setOneUpPercent}
                suffix={dict.incomePolicy.units.percent}
              />
              {!hasK2Unknown && (
                <NumberField
                  id="k2-percent"
                  label={t.fields.k2Percent}
                  value={k2Percent}
                  onChange={setK2Percent}
                  suffix={dict.incomePolicy.units.percent}
                />
              )}
              <NumberField
                id="days-worked"
                label={t.fields.daysWorked}
                value={daysWorked}
                onChange={setDaysWorked}
              />
              <NumberField
                id="working-days-in-month"
                label={t.fields.workingDaysInMonth}
                value={workingDaysInMonth}
                onChange={setWorkingDaysInMonth}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="size-4" />
                  {t.results.faTitle}
                </CardTitle>
                <CardDescription>{t.results.faFormula}</CardDescription>
              </CardHeader>
              <CardContent>
                {!isFullTime && (
                  <p className="mb-2 text-sm text-muted-foreground">
                    {t.results.fullTimeOnlyNotice}
                  </p>
                )}
                <ResultRow
                  label={t.results.attendanceRate}
                  value={formatPercent(faResult.attendanceRate)}
                  muted
                />
                <ResultRow
                  label={t.results.workdayCoefficient}
                  value={String(faResult.workdayCoefficient)}
                  muted
                />
                <ResultRow
                  label={t.results.allowancePerWorkday}
                  value={formatMillion(
                    faResult.allowancePerWorkday,
                    dict.incomePolicy.units.million
                  )}
                  muted
                />
                <ResultRow
                  label={t.results.k2Coefficient}
                  value={formatPercent(faResult.k2Coefficient)}
                  muted
                />
                <ResultRow
                  label={t.results.mdrtCoefficient}
                  value={formatPercent(faResult.mdrtCoefficient)}
                  muted
                />
                <ResultRow
                  label={t.results.contractCoefficient}
                  value={formatPercent(faResult.contractCoefficient)}
                  muted
                />
                <div className="mt-2 border-t pt-2">
                  <ResultRow
                    label={t.results.total}
                    value={formatMillion(
                      isFullTime ? faResult.total : 0,
                      dict.incomePolicy.units.million
                    )}
                    strong
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4" />
                  {t.results.monthlyBonusTitle}
                </CardTitle>
                <CardDescription>
                  {dict.incomePolicy.salesBonus.formula}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EligibilityBanner
                  eligible={monthlyBonusResult.eligible}
                  eligibleLabel={t.results.eligible}
                  ineligibleLabel={t.results.ineligible}
                  reason={
                    monthlyBonusResult.ineligibleReason
                      ? t.results.reasons[monthlyBonusResult.ineligibleReason]
                      : undefined
                  }
                />
                {monthlyQualityColumnLabel && (
                  <ResultRow
                    label={t.results.qualityColumn}
                    value={monthlyQualityColumnLabel}
                    muted
                  />
                )}
                <ResultRow
                  label={t.results.qualifiedRate}
                  value={formatPercent(monthlyBonusResult.rate)}
                  muted
                />
                <div className="mt-2 border-t pt-2">
                  <ResultRow
                    label={t.results.bonusAmount}
                    value={formatMillion(
                      monthlyBonusResult.bonusAmount,
                      dict.incomePolicy.units.million
                    )}
                    strong
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quarterly" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.inputsCard.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                id="fyc-quarter"
                label={t.fields.fycQuarter}
                value={fycQuarter}
                onChange={setFycQuarter}
                suffix={dict.incomePolicy.units.million}
              />
              <NumberField
                id="active-months-in-quarter"
                label={t.fields.activeMonthsInQuarter}
                value={activeMonthsInQuarter}
                onChange={setActiveMonthsInQuarter}
              />
              <NumberField
                id="k2-average-quarter"
                label={t.fields.k2AverageQuarter}
                value={k2AverageQuarter}
                onChange={setK2AverageQuarter}
                suffix={dict.incomePolicy.units.percent}
              />
              <SwitchField
                id="joined-mid-quarter"
                label={t.fields.joinedMidQuarter}
                checked={joinedMidQuarter}
                onChange={setJoinedMidQuarter}
              />
              {joinedMidQuarter && (
                <NumberField
                  id="months-worked-in-quarter"
                  label={t.fields.monthsWorkedInQuarter}
                  value={monthsWorkedInQuarter}
                  onChange={setMonthsWorkedInQuarter}
                  step={1}
                />
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4" />
                  {t.results.quarterlyBonusTitle}
                </CardTitle>
                <CardDescription>
                  {dict.incomePolicy.salesBonus.formula}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EligibilityBanner
                  eligible={quarterlyBonusResult.eligible}
                  eligibleLabel={t.results.eligible}
                  ineligibleLabel={t.results.ineligible}
                  reason={
                    quarterlyBonusResult.ineligibleReason
                      ? t.results.reasons[quarterlyBonusResult.ineligibleReason]
                      : undefined
                  }
                />
                {joinedMidQuarter && (
                  <ResultRow
                    label={t.results.convertedFyc}
                    value={formatMillion(
                      convertedFyc,
                      dict.incomePolicy.units.million
                    )}
                    muted
                  />
                )}
                {qualityColumnLabel && (
                  <ResultRow
                    label={t.results.qualityColumn}
                    value={qualityColumnLabel}
                    muted
                  />
                )}
                <ResultRow
                  label={t.results.qualifiedRate}
                  value={formatPercent(quarterlyBonusResult.rate)}
                  muted
                />
                <div className="mt-2 border-t pt-2">
                  <ResultRow
                    label={t.results.bonusAmount}
                    value={formatMillion(
                      quarterlyBonusResult.bonusAmount,
                      dict.incomePolicy.units.million
                    )}
                    strong
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="size-4" />
                  {t.results.rycTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EligibilityBanner
                  eligible={rycResult.eligible}
                  eligibleLabel={t.results.eligible}
                  ineligibleLabel={t.results.ineligible}
                />
                <div className="mt-2 border-t pt-2">
                  <ResultRow
                    label={t.results.qualifiedRate}
                    value={formatPercent(rycResult.rate)}
                    strong
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.inputsCard.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                id="consecutive-mdrt"
                label={t.fields.consecutiveMdrt}
                value={consecutiveMdrt}
                onChange={setConsecutiveMdrt}
              />
              {!hasK2Unknown && (
                <NumberField
                  id="avg-k2-year"
                  label={t.fields.avgK2Year}
                  value={avgK2Year}
                  onChange={setAvgK2Year}
                  suffix={dict.incomePolicy.units.percent}
                />
              )}
              <NumberField
                id="active-months-12"
                label={t.fields.activeMonths12}
                value={activeMonths12}
                onChange={setActiveMonths12}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="size-4" />
                  {t.results.mdrtTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EligibilityBanner
                  eligible={mdrtResult.eligible}
                  eligibleLabel={t.results.eligible}
                  ineligibleLabel={t.results.ineligible}
                  reason={
                    mdrtResult.ineligibleReason
                      ? t.results.reasons[mdrtResult.ineligibleReason]
                      : undefined
                  }
                />
                <div className="mt-2 border-t pt-2">
                  <ResultRow
                    label={t.results.bonusAmount}
                    value={formatMillion(
                      mdrtResult.bonus,
                      dict.incomePolicy.units.million
                    )}
                    strong
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeartPulse className="size-4" />
                  {t.results.healthTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EligibilityBanner
                  eligible={healthEligible}
                  eligibleLabel={t.results.healthEligible}
                  ineligibleLabel={t.results.healthIneligible}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">{t.disclaimer}</p>
    </div>
  );
}

function EligibilityBanner({
  eligible,
  eligibleLabel,
  ineligibleLabel,
  reason,
}: {
  eligible: boolean;
  eligibleLabel: string;
  ineligibleLabel: string;
  reason?: string;
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-start gap-2 rounded-lg border p-2.5 text-sm",
        eligible
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      )}
    >
      {eligible ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CircleX className="mt-0.5 size-4 shrink-0" />
      )}
      <div>
        <p className="font-medium">
          {eligible ? eligibleLabel : ineligibleLabel}
        </p>
        {!eligible && reason && <p className="text-xs opacity-90">{reason}</p>}
      </div>
    </div>
  );
}
