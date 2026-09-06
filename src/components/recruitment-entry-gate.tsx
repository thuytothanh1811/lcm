"use client";

import { useState } from "react";

import { IconSearch, IconUserPlus } from "@tabler/icons-react";

import { RecruitmentForm } from "@/components/recruitment-form";
import { vi as dict } from "@/lib/i18n/dictionaries/vi";
import type { TManagerOption } from "@/server/user-actions";

type TMode = "landing" | "form";

export function RecruitmentEntryGate({
  managers,
}: {
  managers: TManagerOption[];
}) {
  const [mode, setMode] = useState<TMode>("landing");

  if (mode === "form") {
    return <RecruitmentForm managers={managers} />;
  }

  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => setMode("form")}
        className="border-white/30 bg-white/10 hover:bg-white/20 flex flex-col items-center gap-3 rounded-xl border py-10 text-white transition-colors"
      >
        <IconUserPlus className="size-8" />
        <span className="text-lg font-semibold">
          {dict.pages.recruitmentPublic.newEntryButton}
        </span>
      </button>
      <button
        type="button"
        className="border-white/30 bg-white/10 hover:bg-white/20 flex flex-col items-center gap-3 rounded-xl border py-10 text-white transition-colors"
      >
        <IconSearch className="size-8" />
        <span className="text-lg font-semibold">
          {dict.pages.recruitmentPublic.searchButton}
        </span>
      </button>
    </div>
  );
}
