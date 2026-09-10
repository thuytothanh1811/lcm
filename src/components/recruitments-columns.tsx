"use client";

import Link from "next/link";

import {
  IconCheck,
  IconDotsVertical,
  IconDownload,
  IconEye,
  IconFileText,
  IconLoader2,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Role } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import type {
  TAdminStatus,
  TRecruitmentStatus,
  TRecruitmentSubmission,
} from "@/server/recruitment-actions";

const ADMIN_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "secondary",
  admin_agreed: "default",
  admin_rejected: "destructive",
  admin_needs_documents: "outline",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  new: "secondary",
  agreed: "default",
  rejected: "destructive",
  needs_documents: "outline",
};

// SH and SD share one status field: whichever of them last acted set it,
// and statusUpdatedByRole says who — so the label can read "SH - Đồng Ý"
// or "SD - Đồng Ý" from the same underlying value.
function statusLabel(t: Dictionary, submission: TRecruitmentSubmission) {
  const roleLabels =
    submission.statusUpdatedByRole &&
    submission.statusUpdatedByRole in t.recruitmentsList.roleStatusLabels
      ? t.recruitmentsList.roleStatusLabels[
          submission.statusUpdatedByRole as "ad" | "sh" | "sd"
        ]
      : undefined;
  const status = submission.status;
  return (
    (roleLabels &&
      (status === "agreed" ||
        status === "rejected" ||
        status === "needs_documents") &&
      roleLabels[status]) ||
    t.recruitmentsList.statusLabels[status]
  );
}

export function createRecruitmentsColumns({
  t,
  role,
  onDelete,
  onDownload,
  downloadingId,
  onAdminStatusChange,
  onRequestAdminDocumentsNote,
  onStatusChange,
  onRequestDocumentsNote,
  updatingStatusId,
}: {
  t: Dictionary;
  role: Role;
  onDelete: (submission: TRecruitmentSubmission) => void;
  onDownload: (submission: TRecruitmentSubmission) => void;
  downloadingId: string | null;
  onAdminStatusChange: (
    submission: TRecruitmentSubmission,
    status: TAdminStatus
  ) => void;
  onRequestAdminDocumentsNote: (submission: TRecruitmentSubmission) => void;
  onStatusChange: (
    submission: TRecruitmentSubmission,
    status: TRecruitmentStatus
  ) => void;
  onRequestDocumentsNote: (submission: TRecruitmentSubmission) => void;
  updatingStatusId: string | null;
}): ColumnDef<TRecruitmentSubmission & { id: string }>[] {
  const isAdmin = role === "admin";
  const isSh = role === "sh";
  const isSd = role === "sd";

  return [
    {
      accessorKey: "candidateCode",
      header: t.recruitmentsList.columns.candidateCode,
      cell: ({ row }) => row.original.candidateCode ?? "—",
    },
    {
      accessorKey: "fullName",
      header: t.recruitmentsList.columns.name,
    },
    {
      accessorKey: "mobile1",
      header: t.recruitmentsList.columns.phone,
    },
    {
      accessorKey: "email",
      header: t.recruitmentsList.columns.email,
    },
    {
      accessorKey: "positionApplied",
      header: t.recruitmentsList.columns.position,
      cell: ({ row }) =>
        t.recruitmentsList.positionLabels[row.original.positionApplied] ??
        row.original.positionApplied,
    },
    {
      accessorKey: "secondManagerName",
      header: t.recruitmentsList.columns.secondManager,
    },
    {
      accessorKey: "sdManagerName",
      header: t.recruitmentsList.columns.sdManager,
    },
    ...(isAdmin || isSh || isSd
      ? [
          {
            accessorKey: "status",
            header: t.recruitmentsList.columns.status,
            cell: ({ row }: { row: { original: TRecruitmentSubmission } }) => (
              <Badge variant={STATUS_VARIANTS[row.original.status]}>
                {statusLabel(t, row.original)}
              </Badge>
            ),
          },
          {
            accessorKey: "needsDocumentsNote",
            header: t.recruitmentsList.columns.documentsNote,
            cell: ({ row }: { row: { original: TRecruitmentSubmission } }) =>
              row.original.needsDocumentsNote ?? "—",
          },
        ]
      : []),
    {
      accessorKey: "adminStatus",
      header: t.recruitmentsList.columns.adminStatus,
      cell: ({ row }) => {
        const adminStatus = row.original.adminStatus ?? "new";
        return (
          <Badge variant={ADMIN_STATUS_VARIANTS[adminStatus]}>
            {t.recruitmentsList.adminStatusLabels[adminStatus]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "adminDocumentsNote",
      header: t.recruitmentsList.columns.adminDocumentsNote,
      cell: ({ row }) => row.original.adminDocumentsNote ?? "—",
    },
    {
      accessorKey: "submittedAt",
      header: t.recruitmentsList.columns.submittedAt,
      cell: ({ row }) => formatDate(row.original.submittedAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const isUpdatingStatus = updatingStatusId === row.original.id;
        const isDownloading = downloadingId === row.original.id;
        const adminStatus = row.original.adminStatus ?? "new";
        const status = row.original.status;
        // Once admin has agreed, the decision is final — freeze every
        // status control so nobody can change it out from under admin.
        const isFinalized = adminStatus === "admin_agreed";
        return (
          <div className="flex justify-end gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isUpdatingStatus || isDownloading}
                >
                  {isUpdatingStatus || isDownloading ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconDotsVertical className="size-4" />
                  )}
                  <span className="sr-only">{t.recruitmentsList.actions}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/recruitments/${row.original.id}`}>
                    <IconEye className="size-4" />
                    {t.recruitmentsList.viewSr}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDownload(row.original)}>
                  <IconDownload className="size-4" />
                  {t.recruitmentsList.downloadSr}
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus || adminStatus === "admin_agreed"
                      }
                      onSelect={() =>
                        onAdminStatusChange(row.original, "admin_agreed")
                      }
                    >
                      <IconCheck className="size-4" />
                      {t.recruitmentsList.adminStatusLabels.admin_agreed}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus || adminStatus === "admin_rejected"
                      }
                      onSelect={() =>
                        onAdminStatusChange(row.original, "admin_rejected")
                      }
                    >
                      <IconX className="size-4" />
                      {t.recruitmentsList.adminStatusLabels.admin_rejected}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus ||
                        adminStatus === "admin_needs_documents"
                      }
                      onSelect={() => onRequestAdminDocumentsNote(row.original)}
                    >
                      <IconFileText className="size-4" />
                      {
                        t.recruitmentsList.adminStatusLabels
                          .admin_needs_documents
                      }
                    </DropdownMenuItem>
                  </>
                )}
                {(isSh || isSd) &&
                  (() => {
                    const roleLabels =
                      t.recruitmentsList.roleStatusLabels[isSh ? "sh" : "sd"];
                    return (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={
                            isUpdatingStatus ||
                            isFinalized ||
                            status === "agreed"
                          }
                          onSelect={() =>
                            onStatusChange(row.original, "agreed")
                          }
                        >
                          <IconCheck className="size-4" />
                          {roleLabels.agreed}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={
                            isUpdatingStatus ||
                            isFinalized ||
                            status === "rejected"
                          }
                          onSelect={() =>
                            onStatusChange(row.original, "rejected")
                          }
                        >
                          <IconX className="size-4" />
                          {roleLabels.rejected}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={
                            isUpdatingStatus ||
                            isFinalized ||
                            status === "needs_documents"
                          }
                          onSelect={() => onRequestDocumentsNote(row.original)}
                        >
                          <IconFileText className="size-4" />
                          {roleLabels.needs_documents}
                        </DropdownMenuItem>
                      </>
                    );
                  })()}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onDelete(row.original)}
                    >
                      <IconTrash className="size-4" />
                      {t.recruitmentsList.deleteSr}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
