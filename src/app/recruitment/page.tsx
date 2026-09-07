import type { Metadata } from "next";

import { vi } from "@/lib/i18n/dictionaries/vi";
import { RecruitmentEntryGate } from "@/components/recruitment-entry-gate";
import { listRecruitmentManagers } from "@/server/user-actions";

// The public application form is always in Vietnamese, regardless of the
// site-wide language preference used by the authenticated admin/AD pages.
const dict = vi;

export const metadata: Metadata = {
  title: dict.pages.recruitmentPublic.title,
};

export default async function RecruitmentPage() {
  const result = await listRecruitmentManagers();
  const managers = result.ok ? result.data : { sd: [], sh: [], direct: [] };

  return (
    <div className="relative min-h-svh overflow-hidden">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat [background-image:url('/brand/images-webp/bg.webp')]" />
      <div className="fixed inset-0 bg-[oklch(0.283_0.121_260.9)]/55" />
      <div className="fixed inset-x-0 top-0 h-40 bg-gradient-to-b from-[oklch(0.283_0.121_260.9)]/80 to-transparent" />

      <main className="relative mx-auto max-w-3xl px-6 pb-10">
        <RecruitmentEntryGate managers={managers} />
      </main>
    </div>
  );
}
