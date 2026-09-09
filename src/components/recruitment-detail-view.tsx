"use client";

import { useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DocumentChecklistTable } from "@/components/recruitment-document-checklist";
import { RecruitmentFormFields } from "@/components/recruitment-form-fields";
import { useDictionary } from "@/hooks/use-dictionary";
import type { Role } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import {
  buildRecruitmentSchema,
  type RecruitmentValues,
} from "@/lib/validations/recruitment";
import {
  deleteRecruitmentSubmission,
  getRecruitmentAttachmentUrl,
  updateRecruitmentSubmission,
  updateRecruitmentSubmissionStatus,
  type TAttachment,
  type TRecruitmentSubmission,
} from "@/server/recruitment-actions";
import type { TManagerGroups } from "@/server/user-actions";

export function RecruitmentDetailView({
  submission,
  managers,
  role,
}: {
  submission: TRecruitmentSubmission;
  managers: TManagerGroups;
  role: Role;
}) {
  const router = useRouter();
  const t = useDictionary();
  const [status, setStatus] = useState(submission.status);
  const [needsDocumentsNote, setNeedsDocumentsNote] = useState(
    submission.needsDocumentsNote ?? ""
  );
  const [documentsNoteError, setDocumentsNoteError] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<"info" | "documents">("info");
  // Once admin has agreed, the decision is final — freeze editing.
  const isFinalized = submission.adminStatus === "admin_agreed";

  const schema = useMemo(
    () => buildRecruitmentSchema(t.recruitmentForm.validation),
    [t]
  );
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecruitmentValues>({
    resolver: zodResolver(schema),
    defaultValues: submission,
  });

  const handleDownload = async (attachment: TAttachment) => {
    const result = await getRecruitmentAttachmentUrl(attachment.storagePath);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    window.open(result.data.url, "_blank");
  };

  const onSubmit = async (values: RecruitmentValues) => {
    if (status === "needs_documents" && !needsDocumentsNote.trim()) {
      setDocumentsNoteError(t.recruitmentDetailView.documentsNoteRequired);
      return;
    }
    setDocumentsNoteError(null);
    setIsSaving(true);
    try {
      const result = await updateRecruitmentSubmission(submission.id, values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (
        status !== submission.status ||
        needsDocumentsNote !== (submission.needsDocumentsNote ?? "")
      ) {
        const statusResult = await updateRecruitmentSubmissionStatus(
          submission.id,
          status,
          needsDocumentsNote.trim()
        );
        if (!statusResult.ok) {
          toast.error(statusResult.error);
          return;
        }
      }
      toast.success(t.recruitmentDetailView.saved);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    setIsDeleting(true);
    const result = await deleteRecruitmentSubmission(submission.id);
    if (!result.ok) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }
    toast.success(t.recruitmentDetailView.deleted);
    router.push("/recruitments");
  };

  const attachments = submission.attachments ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label={t.recruitmentDetailView.tabsLabel}
        className="bg-muted flex w-fit gap-1 rounded-lg p-1"
      >
        {(
          [
            ["info", t.recruitmentDetailView.tabInfo],
            ["documents", t.recruitmentDetailView.tabDocuments],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={
              tab === value
                ? "bg-background text-foreground rounded-md px-4 py-1.5 text-sm font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground rounded-md px-4 py-1.5 text-sm font-medium"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Both panels stay mounted: the form fields are registered with
          react-hook-form, and unmounting them on a tab switch would drop
          the reviewer's unsaved edits. */}
      <div
        className={
          tab === "documents" ? "flex flex-col gap-6" : "hidden flex-col gap-6"
        }
      >
        <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
          <h2 className="text-base font-semibold">
            {t.recruitmentDetailView.attachmentsHeading(attachments.length)}
          </h2>
          {attachments.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              {t.recruitmentDetailView.attachmentsEmpty}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {attachments.map(a => (
                <li
                  key={a.storagePath}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 break-all">{a.fileName}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(a)}
                  >
                    {t.recruitmentDetailView.attachmentDownload}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
          <h2 className="text-base font-semibold">
            {t.recruitmentDetailView.checklistHeading}
          </h2>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">
            {t.recruitmentDetailView.checklistDescription}
          </p>
          <DocumentChecklistTable />
        </div>
      </div>

      <div
        className={
          tab === "info" ? "flex flex-col gap-6" : "hidden flex-col gap-6"
        }
      >
        <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.recruitmentDetailView.status}</FieldLabel>
              <Select
                value={status}
                onValueChange={v =>
                  setStatus(v as TRecruitmentSubmission["status"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(t.recruitmentsList.statusLabels).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t.recruitmentDetailView.submittedAt}</FieldLabel>
              <p className="text-muted-foreground text-sm">
                {formatDate(submission.submittedAt)}
              </p>
            </Field>
            {status === "needs_documents" && (
              <Field
                data-invalid={!!documentsNoteError}
                className="sm:col-span-2"
              >
                <FieldLabel>
                  {t.recruitmentDetailView.documentsNoteLabel}
                </FieldLabel>
                <Textarea
                  value={needsDocumentsNote}
                  onChange={e => {
                    setNeedsDocumentsNote(e.target.value);
                    if (documentsNoteError) setDocumentsNoteError(null);
                  }}
                  placeholder={t.recruitmentDetailView.documentsNotePlaceholder}
                  rows={3}
                />
                {documentsNoteError && (
                  <FieldError>{documentsNoteError}</FieldError>
                )}
              </Field>
            )}
          </div>
        </div>

        <RecruitmentFormFields
          t={t}
          control={control}
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
          managers={managers}
          onDownloadAttachment={handleDownload}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        {role === "admin" && (
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={() => setConfirmDelete(true)}
          >
            {t.recruitmentDetailView.deleteButton}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSaving || isFinalized}
          className="ms-auto"
        >
          {isSaving
            ? t.recruitmentDetailView.saving
            : t.recruitmentDetailView.saveButton}
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.recruitmentDetailView.deleteDialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.recruitmentDetailView.deleteDialogDescription(
                submission.fullName
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
