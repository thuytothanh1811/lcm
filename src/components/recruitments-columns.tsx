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
  TRecruitmentSubmission,
  TSdStatus,
  TShStatus,
} from "@/server/recruitment-actions";

const ADMIN_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "secondary",
  admin_agreed: "default",
  admin_rejected: "destructive",
};

const SH_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "secondary",
  sh_agreed: "default",
  sh_rejected: "destructive",
  sh_needs_documents: "outline",
};

const SD_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "secondary",
  sd_agreed: "default",
  sd_rejected: "destructive",
  sd_needs_documents: "outline",
};

export function createRecruitmentsColumns({
  t,
  role,
  onDelete,
  onDownload,
  downloadingId,
  onAdminStatusChange,
  onShStatusChange,
  onRequestShDocumentsNote,
  onSdStatusChange,
  onRequestSdDocumentsNote,
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
  onShStatusChange: (
    submission: TRecruitmentSubmission,
    status: TShStatus
  ) => void;
  onRequestShDocumentsNote: (submission: TRecruitmentSubmission) => void;
  onSdStatusChange: (
    submission: TRecruitmentSubmission,
    status: TSdStatus
  ) => void;
  onRequestSdDocumentsNote: (submission: TRecruitmentSubmission) => void;
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
    ...(isAdmin || isSh
      ? [
          {
            accessorKey: "shStatus",
            header: t.recruitmentsList.columns.shStatus,
            cell: ({ row }: { row: { original: TRecruitmentSubmission } }) => {
              const shStatus = row.original.shStatus ?? "new";
              return (
                <Badge variant={SH_STATUS_VARIANTS[shStatus]}>
                  {t.recruitmentsList.shStatusLabels[shStatus]}
                </Badge>
              );
            },
          },
          {
            accessorKey: "shDocumentsNote",
            header: t.recruitmentsList.columns.shDocumentsNote,
            cell: ({ row }: { row: { original: TRecruitmentSubmission } }) =>
              row.original.shDocumentsNote ?? "—",
          },
        ]
      : []),
    ...(isAdmin || isSd
      ? [
          {
            accessorKey: "sdStatus",
            header: t.recruitmentsList.columns.sdStatus,
            cell: ({ row }: { row: { original: TRecruitmentSubmission } }) => {
              const sdStatus = row.original.sdStatus ?? "new";
              return (
                <Badge variant={SD_STATUS_VARIANTS[sdStatus]}>
                  {t.recruitmentsList.sdStatusLabels[sdStatus]}
                </Badge>
              );
            },
          },
          {
            accessorKey: "sdDocumentsNote",
            header: t.recruitmentsList.columns.sdDocumentsNote,
            cell: ({ row }: { row: { original: TRecruitmentSubmission } }) =>
              row.original.sdDocumentsNote ?? "—",
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            accessorKey: "adminStatus",
            header: t.recruitmentsList.columns.adminStatus,
            cell: ({ row }: { row: { original: TRecruitmentSubmission } }) => {
              const adminStatus = row.original.adminStatus ?? "new";
              return (
                <Badge variant={ADMIN_STATUS_VARIANTS[adminStatus]}>
                  {t.recruitmentsList.adminStatusLabels[adminStatus]}
                </Badge>
              );
            },
          },
        ]
      : []),
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
        const shStatus = row.original.shStatus ?? "new";
        const sdStatus = row.original.sdStatus ?? "new";
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
                      disabled={isUpdatingStatus || isFinalized}
                      onSelect={() =>
                        onAdminStatusChange(row.original, "admin_agreed")
                      }
                    >
                      <IconCheck className="size-4" />
                      {t.recruitmentsList.adminStatusLabels.admin_agreed}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        adminStatus === "admin_rejected"
                      }
                      onSelect={() =>
                        onAdminStatusChange(row.original, "admin_rejected")
                      }
                    >
                      <IconX className="size-4" />
                      {t.recruitmentsList.adminStatusLabels.admin_rejected}
                    </DropdownMenuItem>
                  </>
                )}
                {isSh && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        shStatus === "sh_agreed"
                      }
                      onSelect={() =>
                        onShStatusChange(row.original, "sh_agreed")
                      }
                    >
                      <IconCheck className="size-4" />
                      {t.recruitmentsList.shStatusLabels.sh_agreed}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        shStatus === "sh_rejected"
                      }
                      onSelect={() =>
                        onShStatusChange(row.original, "sh_rejected")
                      }
                    >
                      <IconX className="size-4" />
                      {t.recruitmentsList.shStatusLabels.sh_rejected}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        shStatus === "sh_needs_documents"
                      }
                      onSelect={() => onRequestShDocumentsNote(row.original)}
                    >
                      <IconFileText className="size-4" />
                      {t.recruitmentsList.shStatusLabels.sh_needs_documents}
                    </DropdownMenuItem>
                  </>
                )}
                {isSd && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        sdStatus === "sd_agreed"
                      }
                      onSelect={() =>
                        onSdStatusChange(row.original, "sd_agreed")
                      }
                    >
                      <IconCheck className="size-4" />
                      {t.recruitmentsList.sdStatusLabels.sd_agreed}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        sdStatus === "sd_rejected"
                      }
                      onSelect={() =>
                        onSdStatusChange(row.original, "sd_rejected")
                      }
                    >
                      <IconX className="size-4" />
                      {t.recruitmentsList.sdStatusLabels.sd_rejected}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        sdStatus === "sd_needs_documents"
                      }
                      onSelect={() => onRequestSdDocumentsNote(row.original)}
                    >
                      <IconFileText className="size-4" />
                      {t.recruitmentsList.sdStatusLabels.sd_needs_documents}
                    </DropdownMenuItem>
                  </>
                )}
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
