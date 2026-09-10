import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/firebase/session";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { canAccessIncome } from "@/lib/permissions";
import { IncomeCalculatorView } from "@/components/income/income-calculator-view";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.pages.income.title };
}

export default async function IncomePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !canAccessIncome(sessionUser.role)) {
    redirect("/dashboard");
  }

  const dict = await getDictionary();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{dict.pages.income.heading}</h1>
      <IncomeCalculatorView />
    </div>
  );
}
