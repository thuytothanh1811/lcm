import { dictionaries } from "@/lib/i18n/dictionaries";
import { IncomeCalculatorView } from "@/components/income/income-calculator-view";
import { IncomePolicyView } from "@/components/income/income-policy-view";

export default function IncomePreviewPage() {
  const dict = dictionaries.vi;
  return (
    <div className="flex flex-col gap-10 p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{dict.pages.income.heading}</h1>
        <IncomeCalculatorView />
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">
          {dict.pages.incomePolicy.heading}
        </h1>
        <IncomePolicyView />
      </div>
    </div>
  );
}
