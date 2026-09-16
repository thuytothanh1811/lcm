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
  buildCt02DocxBlob,
  buildCt03DocxBlob,
  buildCt04DocxBlob,
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

/**
 * Every printed form is filed under the candidate it belongs to, so the name
 * carries the form code, what the form is, and who it is about:
 * CT03_Phieu-danh-gia-ung-vien_Nguyen-Thi-Thanh-Huong_079192004567.docx
 */
function exportFilename(code: string, slug: string, values: RecruitmentValues) {
  const parts = [code, slug, sanitizeFilename(values.fullName || "ung-vien")];
  if (values.idNumber) parts.push(sanitizeFilename(values.idNumber));
  return parts.join("_") + ".docx";
}

export function RecruitmentForm({ managers }: { managers: TManagerGroups }) {
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPreparingDocx, setIsPreparingDocx] = useState(false);
  const [isPreparingCt02, setIsPreparingCt02] = useState(false);
  const [isPreparingCt03, setIsPreparingCt03] = useState(false);
  const [isPreparingCt04, setIsPreparingCt04] = useState(false);
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
      classStartDate: "",
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
      q1Experience: [],
      q2View: [],
      q3TargetAudience: [],
      q5Training: [],
      q6Support: [],
      attachments: [],
      commitmentVoluntary: undefined,
      commitmentTruthful: undefined,
      commitmentMaskedData: undefined,
      commitmentEligibility: undefined,
      noticeOperational: undefined,
      noticePrograms: undefined,
      consentBasicData: undefined,
      consentSensitiveData: undefined,
      consentThirdParty: undefined,
      commitmentReviewedEntry: undefined,
    },
  });

  const handleDownloadDocx = async () => {
    setIsPreparingDocx(true);
    try {
      const values = getValues();
      const blob = await buildRecruitmentDocxBlob(values, t);
      const filename = exportFilename(
        "CT01",
        "Phieu-thong-tin-tuyen-dung",
        values
      );

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

  const handleDownloadCt02 = async () => {
    setIsPreparingCt02(true);
    try {
      const values = getValues();
      const blob = await buildCt02DocxBlob(values);
      const filename = exportFilename("CT02", "Dang-ky-chu-ky-mau", values);

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
      setIsPreparingCt02(false);
    }
  };

  const handleDownloadCt03 = async () => {
    setIsPreparingCt03(true);
    try {
      const values = getValues();
      const blob = await buildCt03DocxBlob(values, t);
      const filename = exportFilename(
        "CT03",
        "Phieu-danh-gia-ung-vien",
        values
      );

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
      setIsPreparingCt03(false);
    }
  };

  const handleDownloadCt04 = async () => {
    setIsPreparingCt04(true);
    try {
      const values = getValues();
      const blob = await buildCt04DocxBlob(values, t);
      const filename = exportFilename(
        "CT04",
        "Phieu-danh-gia-phe-duyet-tuyen-dung",
        values
      );

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
      setIsPreparingCt04(false);
    }
  };

  const onSubmit = async (values: RecruitmentValues) => {
    setFormError(null);

    // Every document on the checklist is required, and which ones apply
    // depends on the position and programme chosen above — so a submission
    // is only accepted once all of them are attached.
    const attached = new Set(
      (values.attachments ?? []).map(a => a.documentType)
    );
    const missing = visibleChecklistRows(
      values.positionApplied,
      values.participatingProgram
    ).filter(row => !attached.has(row.key));
    if (missing.length > 0) {
      setMissingDocuments(missing.map(row => row.label));
      return;
    }
    setMissingDocuments([]);
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
        onDownloadCt2={handleDownloadCt02}
        isDownloadingCt2={isPreparingCt02}
        onDownloadCt3={handleDownloadCt03}
        isDownloadingCt3={isPreparingCt03}
        onDownloadCt4={handleDownloadCt04}
        isDownloadingCt4={isPreparingCt04}
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
