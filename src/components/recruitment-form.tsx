"use client";

import { useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { visibleChecklistRows } from "@/components/recruitment-document-checklist";
import { RecruitmentFormFields } from "@/components/recruitment-form-fields";
import { vi } from "@/lib/i18n/dictionaries/vi";
import {
  buildRecruitmentDocxBlob,
  sanitizeFilename,
} from "@/lib/recruitment-docx";
import { submitRecruitmentForm } from "@/server/recruitment-actions";
import type { TManagerGroups } from "@/server/user-actions";
import {
  buildRecruitmentSchema,
  type RecruitmentValues,
} from "@/lib/validations/recruitment";

// The public application form is always in Vietnamese, regardless of the
// site-wide language preference used by the authenticated admin/AD pages.
const t = vi;

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RecruitmentForm({ managers }: { managers: TManagerGroups }) {
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPreparingDocx, setIsPreparingDocx] = useState(false);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);
  const schema = useMemo(
    () => buildRecruitmentSchema(t.recruitmentForm.validation),
    []
  );
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RecruitmentValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dateOfBirth: "",
      idIssueDate: "",
      signDate: todayIso(),
      managerUid: "",
      managerName: "",
      secondManagerUid: "",
      secondManagerName: "",
      sdManagerUid: "",
      sdManagerName: "",
      bankName: "",
      permanentProvince: "",
      permanentWard: "",
      isCivilServant: "no",
      civilServantType: [],
      hasBasicAgentCertificate: "no",
      participatingProgram: "no",
      isRehire: "no",
      programTypes: [],
      sameAsPermanentAddress: "same",
      hasInsuranceExperience: "no",
      workHistory: [
        { fromDate: "", toDate: "", title: "", companyNameAddress: "" },
      ],
      referralChannel: [],
      familyMembers: [
        {
          name: "",
          idNumber: "",
          relationship: "",
          occupation: "",
        },
      ],
      q1Experience: [],
      q2View: [],
      q3TargetAudience: [],
      q5Training: [],
      q6Support: [],
      attachments: [],
      hasRelativeAtCompany: undefined,
      commitmentVoluntary: undefined,
      consentBasicData: undefined,
      consentSensitiveData: undefined,
      consentThirdParty: undefined,
    },
  });

  const handleDownloadDocx = async () => {
    setIsPreparingDocx(true);
    try {
      const values = getValues();
      const blob = await buildRecruitmentDocxBlob(values, t);
      const filename = `Phieu-thong-tin-tuyen-dung-${sanitizeFilename(values.fullName || "ung-vien")}.docx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toast.error(t.errors.recruitment.exportFailed);
    } finally {
      setIsPreparingDocx(false);
    }
  };

  const onSubmit = async (values: RecruitmentValues) => {
    setFormError(null);

    // Missing paperwork is worth flagging but not worth blocking on — some
    // candidates legitimately send it later. So the first press lists what
    // is missing and stops; pressing again goes through.
    const attached = new Set(
      (values.attachments ?? []).map(a => a.documentType)
    );
    const missing = visibleChecklistRows(
      values.positionApplied,
      values.participatingProgram
    ).filter(row => !attached.has(row.key));
    if (missing.length > 0 && missingDocuments.length === 0) {
      setMissingDocuments(missing.map(row => row.label));
      return;
    }
    const result = await submitRecruitmentForm(values, "vi", "new");
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-10 text-center shadow-sm">
        <h2 className="text-xl font-semibold">
          {t.recruitmentForm.thankYouTitle}
        </h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {t.recruitmentForm.thankYouBody}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <RecruitmentFormFields
        t={t}
        control={control}
        register={register}
        errors={errors}
        watch={watch}
        setValue={setValue}
        managers={managers}
        onDownloadCt1={handleDownloadDocx}
        isDownloadingCt1={isPreparingDocx}
        locale="vi"
      />

      {missingDocuments.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-medium">
            {t.recruitmentForm.missingDocumentsTitle(missingDocuments.length)}
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
            {missingDocuments.map(label => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-3 text-sm">
            {t.recruitmentForm.missingDocumentsHint}
          </p>
        </div>
      )}

      <FieldError>{formError}</FieldError>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting
            ? t.recruitmentForm.submitting
            : t.recruitmentForm.submit}
        </Button>
      </div>
    </form>
  );
}
