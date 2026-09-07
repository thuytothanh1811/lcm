"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { vi as dict } from "@/lib/i18n/dictionaries/vi";
import { formatDate } from "@/lib/utils";
import {
  lookupRecruitmentByIdNumber,
  type TRecruitmentStatus,
} from "@/server/recruitment-actions";
import type { RecruitmentValues } from "@/lib/validations/recruitment";

const STATUS_VARIANTS: Record<
  TRecruitmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  new: "secondary",
  agreed: "default",
  rejected: "destructive",
  needs_documents: "outline",
};

type TSubmittedSummary = {
  fullName: string;
  status: TRecruitmentStatus;
  submittedAt: string;
};

export function RecruitmentSearch({
  onResumeDraft,
}: {
  onResumeDraft: (id: string, values: Partial<RecruitmentValues>) => void;
}) {
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [summary, setSummary] = useState<TSubmittedSummary | null>(null);

  const t = dict.recruitmentForm.search;

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!idNumber.trim()) {
      setError(dict.recruitmentForm.validation.idNumberRequired);
      return;
    }
    setError(null);
    setNotFound(false);
    setSummary(null);
    setIsSearching(true);
    try {
      const response = await lookupRecruitmentByIdNumber(idNumber.trim());
      if (!response.ok) {
        setError(response.error);
        return;
      }

      if (response.data.kind === "not_found") {
        setNotFound(true);
      } else if (response.data.kind === "draft") {
        // Jump straight into the form, pre-filled with what was saved.
        onResumeDraft(response.data.id, response.data.values);
      } else {
        setSummary({
          fullName: response.data.fullName,
          status: response.data.status,
          submittedAt: response.data.submittedAt,
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <form
        onSubmit={handleSearch}
        className="flex flex-col items-end gap-3 sm:flex-row"
      >
        <Field className="flex-1" data-invalid={!!error}>
          <FieldLabel htmlFor="search-idNumber">{t.idNumberLabel}</FieldLabel>
          <Input
            id="search-idNumber"
            placeholder={t.idNumberPlaceholder}
            value={idNumber}
            onChange={e => {
              setIdNumber(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={!!error}
          />
          <FieldError errors={error ? [{ message: error }] : undefined} />
        </Field>
        <Button type="submit" disabled={isSearching} className="sm:w-auto">
          {isSearching ? t.searching : t.button}
        </Button>
      </form>

      {notFound && (
        <div className="mt-6 border-t pt-6">
          <p className="text-muted-foreground text-sm">{t.notFound}</p>
        </div>
      )}

      {summary && (
        <div className="mt-6 border-t pt-6">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{t.resultName}</dt>
              <dd className="font-medium">{summary.fullName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{t.resultStatus}</dt>
              <dd>
                <Badge variant={STATUS_VARIANTS[summary.status]}>
                  {dict.recruitmentsList.statusLabels[summary.status]}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{t.resultSubmittedAt}</dt>
              <dd className="font-medium">{formatDate(summary.submittedAt)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
