"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  CONTRACT_MAINTENANCE_CRITERIA,
  FA_CONTRACT_COEFFICIENT_TIERS,
  FA_K2_COEFFICIENT_TIERS,
  FA_MDRT_COEFFICIENT,
  HEALTH_INSURANCE,
  MDRT_BONUS_TIERS,
  MONTHLY_BONUS_ESTABLISHED_TIERS,
  MONTHLY_BONUS_FIRST_YEAR_TIERS,
  QUARTERLY_BONUS_ESTABLISHED_TIERS,
  QUARTERLY_BONUS_FIRST_YEAR_TIERS,
  RYC_TIERS,
  UM_PROMOTION_CRITERIA,
} from "@/lib/income/policy-data";

const FA_ALLOWANCE_ROWS = [
  { allowance: 0.2, option1: "< 15", option2Fyc: "—", option2Referred: "—" },
  { allowance: 0.3, option1: "≥ 15", option2Fyc: "< 15", option2Referred: "1" },
  { allowance: 0.5, option1: "≥ 25", option2Fyc: "≥ 15", option2Referred: "1" },
  { allowance: 0.7, option1: "—", option2Fyc: "≥ 25", option2Referred: "1" },
];

export function IncomePolicyView() {
  const dict = useDictionary();
  const t = dict.incomePolicy;
  const units = t.units;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t.effectiveNotice}</p>

      <Tabs defaultValue="commission">
        <TabsList className="flex-wrap">
          <TabsTrigger value="commission">{t.tabs.commission}</TabsTrigger>
          <TabsTrigger value="fa">{t.tabs.fa}</TabsTrigger>
          <TabsTrigger value="monthlyBonus">{t.tabs.monthlyBonus}</TabsTrigger>
          <TabsTrigger value="quarterlyBonus">
            {t.tabs.quarterlyBonus}
          </TabsTrigger>
          <TabsTrigger value="mdrtHealth">{t.tabs.mdrtHealth}</TabsTrigger>
          <TabsTrigger value="promotionMaintenance">
            {t.tabs.promotionMaintenance}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commission" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.commission.fycTitle}
              </CardTitle>
              <CardDescription>{t.commission.fycDescription}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.commission.rycTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.commission.colActiveMonths}</TableHead>
                    <TableHead>{t.commission.colK2}</TableHead>
                    <TableHead>{t.commission.colRate}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RYC_TIERS.map(tier => (
                    <TableRow key={`${tier.minActiveMonths}-${tier.minK2}`}>
                      <TableCell>≥ {tier.minActiveMonths}</TableCell>
                      <TableCell>≥ {tier.minK2}%</TableCell>
                      <TableCell className="font-medium">
                        {tier.rate}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                {t.commission.activeMonthNote}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fa" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.fa.title}</CardTitle>
              <CardDescription>{t.fa.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                {t.fa.formula}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.fa.allowanceTitle}</CardTitle>
              <CardDescription>{t.fa.allowanceNote}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.fa.colAllowance}</TableHead>
                    <TableHead>{t.fa.colOption1}</TableHead>
                    <TableHead>{t.fa.colOption2Fyc}</TableHead>
                    <TableHead>{t.fa.colOption2Referred}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FA_ALLOWANCE_ROWS.map(row => (
                    <TableRow key={row.allowance}>
                      <TableCell className="font-medium">
                        {row.allowance} {units.million}
                      </TableCell>
                      <TableCell>{row.option1}</TableCell>
                      <TableCell>{row.option2Fyc}</TableCell>
                      <TableCell>{row.option2Referred}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.fa.k2Title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.fa.colK2}</TableHead>
                      <TableHead>{t.fa.colCoefficient}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {FA_K2_COEFFICIENT_TIERS.map(tier => (
                      <TableRow key={tier.minK2}>
                        <TableCell>≥ {tier.minK2}%</TableCell>
                        <TableCell className="font-medium">
                          {tier.coefficient}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.fa.mdrtTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>{t.fa.mdrtAchieved}</TableCell>
                      <TableCell className="font-medium">
                        {FA_MDRT_COEFFICIENT.achieved}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t.fa.mdrtNotAchieved}</TableCell>
                      <TableCell className="font-medium">
                        {FA_MDRT_COEFFICIENT.notAchieved}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t.fa.contractTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.fa.colContracts}</TableHead>
                      <TableHead>{t.fa.colContractCoefficient}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {FA_CONTRACT_COEFFICIENT_TIERS.map(tier => (
                      <TableRow key={tier.minContracts}>
                        <TableCell>≥ {tier.minContracts}</TableCell>
                        <TableCell className="font-medium">
                          {tier.coefficient}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.fa.workdayTitle}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p className="rounded-lg bg-muted px-3 py-2 font-mono">
                  {t.fa.workdayFormula}
                </p>
                <p className="rounded-lg bg-muted px-3 py-2 font-mono">
                  {t.fa.attendanceFormula}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.fa.newLpGuaranteeTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p>{t.fa.newLpGuarantee}</p>
              <p className="font-medium text-foreground">
                {t.fa.quarterlyGuaranteeTitle}
              </p>
              <p>{t.fa.quarterlyGuarantee}</p>
              <p>{t.fa.seNotice}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.fa.exampleTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t.fa.exampleText}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthlyBonus" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.salesBonus.monthlyTitle}
              </CardTitle>
              <CardDescription>{t.salesBonus.monthlySubtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                {t.salesBonus.formula}
              </p>

              <p className="mb-2 text-sm font-medium">
                {t.salesBonus.establishedTitle}
              </p>
              <QualityBonusTable
                rows={MONTHLY_BONUS_ESTABLISHED_TIERS}
                fycColumnLabel={t.salesBonus.colFycMonth}
                unit={units.million}
              />

              <p className="mt-6 mb-2 text-sm font-medium">
                {t.salesBonus.firstYearTitle}
              </p>
              <SimpleRateTable
                rows={MONTHLY_BONUS_FIRST_YEAR_TIERS}
                fycColumnLabel={t.salesBonus.colFycMonth}
                rateColumnLabel={t.salesBonus.colRate}
                unit={units.million}
              />

              <p className="mt-4 text-xs text-muted-foreground">
                {t.salesBonus.eligibilityNote}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quarterlyBonus" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.salesBonus.quarterlyTitle}
              </CardTitle>
              <CardDescription>
                {t.salesBonus.quarterlySubtitle}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                {t.salesBonus.formula}
              </p>

              <p className="mb-2 text-sm font-medium">
                {t.salesBonus.establishedTitle}
              </p>
              <QualityBonusTable
                rows={QUARTERLY_BONUS_ESTABLISHED_TIERS}
                fycColumnLabel={t.salesBonus.colFycQuarter}
                unit={units.million}
              />

              <p className="mt-6 mb-2 text-sm font-medium">
                {t.salesBonus.firstYearTitle}
              </p>
              <SimpleRateTable
                rows={QUARTERLY_BONUS_FIRST_YEAR_TIERS}
                fycColumnLabel={t.salesBonus.colFycQuarter}
                rateColumnLabel={t.salesBonus.colRate}
                unit={units.million}
              />

              <p className="mt-4 text-xs text-muted-foreground">
                {t.salesBonus.eligibilityNote}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.salesBonus.midQuarterNote}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mdrtHealth" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.mdrt.title}</CardTitle>
              <CardDescription>{t.mdrt.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.mdrt.colTimes}</TableHead>
                    <TableHead>{t.mdrt.colBonus}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MDRT_BONUS_TIERS.map(tier => (
                    <TableRow key={tier.consecutiveTimes}>
                      <TableCell>
                        {tier.consecutiveTimes}
                        {tier.partTimeOrUmOnly && " (*)"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {tier.bonus.toLocaleString("vi-VN")} {units.million}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                <p>{t.mdrt.onceNote}</p>
                <p>{t.mdrt.minK2Note}</p>
                <p>{t.mdrt.consecutiveNote}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.health.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                {t.health.condition} ({HEALTH_INSURANCE.minActiveMonths}/
                {HEALTH_INSURANCE.windowMonths} {units.months})
              </p>
              <p>{t.health.review}</p>
              <p>{t.health.note}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="promotionMaintenance"
          className="flex flex-col gap-4"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.promotion.title}</CardTitle>
              <CardDescription>{t.promotion.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.promotion.colCriterion}</TableHead>
                    <TableHead>{t.promotion.colRequirement}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{t.promotion.tenure}</TableCell>
                    <TableCell className="font-medium">
                      ≥ {UM_PROMOTION_CRITERIA.minTenureMonths} {units.months}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t.promotion.resultsWindow}</TableCell>
                    <TableCell className="font-medium">
                      {UM_PROMOTION_CRITERIA.resultsWindowMonths} {units.months}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t.promotion.personalFyc}</TableCell>
                    <TableCell className="font-medium">
                      ≥ {UM_PROMOTION_CRITERIA.minPersonalFyc}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t.promotion.referredLpFyc}</TableCell>
                    <TableCell className="font-medium">
                      ≥ {UM_PROMOTION_CRITERIA.minReferredLpFyc}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t.promotion.referredLpCount}</TableCell>
                    <TableCell className="font-medium">
                      ≥ {UM_PROMOTION_CRITERIA.minReferredLpCount}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t.promotion.attendance}</TableCell>
                    <TableCell className="font-medium">
                      ≥ {UM_PROMOTION_CRITERIA.minPersonalAttendance}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                {t.promotion.note}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.maintenance.title}</CardTitle>
              <CardDescription>{t.maintenance.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.promotion.colCriterion}</TableHead>
                    <TableHead>{t.promotion.colRequirement}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{t.maintenance.tenure}</TableCell>
                    <TableCell className="font-medium">
                      ≥ {CONTRACT_MAINTENANCE_CRITERIA.minTenureMonths}{" "}
                      {units.months}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t.maintenance.resultsWindow}</TableCell>
                    <TableCell className="font-medium">
                      {CONTRACT_MAINTENANCE_CRITERIA.resultsWindowMonths}{" "}
                      {units.months}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t.maintenance.personalFyc}</TableCell>
                    <TableCell className="font-medium">
                      ≥ {CONTRACT_MAINTENANCE_CRITERIA.minPersonalNetFyc}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t.maintenance.attendance}</TableCell>
                    <TableCell className="font-medium">
                      ≥ {CONTRACT_MAINTENANCE_CRITERIA.minAttendanceFullTime}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                <p>{t.maintenance.seNote}</p>
                <p>{t.maintenance.maternityNote}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QualityBonusTable({
  rows,
  fycColumnLabel,
  unit,
}: {
  rows: readonly {
    minFyc: number;
    rate80: number;
    rate70: number;
    rate60: number;
    rate50: number;
  }[];
  fycColumnLabel: string;
  unit: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{fycColumnLabel}</TableHead>
          <TableHead>≥80% K2 / ≥25% 1Up</TableHead>
          <TableHead>≥70% K2 / ≥15% 1Up</TableHead>
          <TableHead>≥60% K2</TableHead>
          <TableHead>≥50% K2</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.minFyc}>
            <TableCell>
              ≥ {row.minFyc} {unit}
            </TableCell>
            <TableCell className="font-medium">{row.rate80}%</TableCell>
            <TableCell className="font-medium">{row.rate70}%</TableCell>
            <TableCell className="font-medium">{row.rate60}%</TableCell>
            <TableCell className="font-medium">{row.rate50}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SimpleRateTable({
  rows,
  fycColumnLabel,
  rateColumnLabel,
  unit,
}: {
  rows: readonly { minFyc: number; rate: number }[];
  fycColumnLabel: string;
  rateColumnLabel: string;
  unit: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{fycColumnLabel}</TableHead>
          <TableHead>{rateColumnLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.minFyc}>
            <TableCell>
              ≥ {row.minFyc} {unit}
            </TableCell>
            <TableCell className="font-medium">{row.rate}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
