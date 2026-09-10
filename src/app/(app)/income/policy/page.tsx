import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/firebase/session";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { canAccessIncome } from "@/lib/permissions";
import { IncomePolicyView } from "@/components/income/income-policy-view";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.pages.incomePolicy.title };
}

export default async function IncomePolicyPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !canAccessIncome(sessionUser.role)) {
    redirect("/dashboard");
  }

  const dict = await getDictionary();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {dict.pages.incomePolicy.heading}
        </h1>
        <p className="text-sm text-muted-foreground">
          {dict.incomePolicy.description}
        </p>
      </div>
      <IncomePolicyView />
    </div>
  );
}
