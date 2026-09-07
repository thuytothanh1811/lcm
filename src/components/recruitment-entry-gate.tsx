"use client";

import { useState } from "react";

import Image from "next/image";

import { IconArrowLeft, IconSearch, IconUserPlus } from "@tabler/icons-react";

import { RecruitmentForm } from "@/components/recruitment-form";
import { vi as dict } from "@/lib/i18n/dictionaries/vi";
import type { TManagerGroups } from "@/server/user-actions";

type TMode = "landing" | "form";

export function RecruitmentEntryGate({
  managers,
}: {
  managers: TManagerGroups;
}) {
  const [mode, setMode] = useState<TMode>("landing");

  return (
    <>
      <div className="flex flex-col items-center gap-6 py-16 text-center text-white">
        <div className="flex w-full items-center gap-2">
          <Image
            src="/brand/logo/ASAHI_SYMBOL.svg"
            alt={dict.pages.recruitmentPublic.logoAlt}
            width={39}
            height={33}
            className="size-6"
            priority
          />
          <span className="text-lg font-semibold">Asahi Life</span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-balance sm:text-3xl">
            {mode === "form"
              ? dict.pages.recruitmentPublic.title
              : dict.pages.recruitmentPublic.heading}
          </h1>
          <p className="mx-auto max-w-xl text-sm text-white/70">
            {dict.pages.recruitmentPublic.subtitle}
          </p>
        </div>
      </div>

      {mode === "form" ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setMode("landing")}
            className="flex w-fit items-center gap-1.5 text-sm text-white/70 hover:text-white"
          >
            <IconArrowLeft className="size-4" />
            {dict.pages.recruitmentPublic.backButton}
          </button>
          <RecruitmentForm managers={managers} />
        </div>
      ) : (
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
      )}
    </>
  );
}
