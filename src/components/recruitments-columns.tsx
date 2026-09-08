"use client";

import Link from "next/link";

import {
  IconCheck,
  IconDeviceFloppy,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Role } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import type {
  TAdminStatus,
  TRecruitmentStatus,
  TRecruitmentSubmission,
  TSdStatus,
  TShStatus,
} from "@/server/recruitment-actions";

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  new: "secondary",
  agreed: "default",
  rejected: "destructive",
  needs_documents: "outline",
};

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
};

const SD_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "secondary",
  sd_agreed: "default",
  sd_rejected: "destructive",
};

const STATUS_TRANSITIONS: Record<TRecruitmentStatus, TRecruitmentStatus[]> = {
  draft: ["new", "agreed", "rejected", "needs_documents"],
  new: ["agreed", "rejected", "needs_documents"],
  needs_documents: ["agreed", "rejected"],
  agreed: ["rejected", "needs_documents"],
  rejected: ["agreed", "needs_documents"],
};

const STATUS_ICONS: Record<TRecruitmentStatus, typeof IconCheck> = {
  draft: IconDeviceFloppy,
  new: IconCheck,
  agreed: IconCheck,
  rejected: IconX,
  needs_documents: IconFileText,
};

export function createRecruitmentsColumns({
  t,
  role,
  onDelete,
  onDownload,
  downloadingId,
  onStatusChange,
  onAdminStatusChange,
  onShStatusChange,
  onSdStatusChange,
  updatingStatusId,
}: {
  t: Dictionary;
  role: Role;
  onDelete: (submission: TRecruitmentSubmission) => void;
  onDownload: (submission: TRecruitmentSubmission) => void;
  downloadingId: string | null;
  onStatusChange: (
    submission: TRecruitmentSubmission,
    status: TRecruitmentStatus
  ) => void;
  onAdminStatusChange: (
    submission: TRecruitmentSubmission,
    status: TAdminStatus
  ) => void;
  onShStatusChange: (
    submission: TRecruitmentSubmission,
    status: TShStatus
  ) => void;
  onSdStatusChange: (
    submission: TRecruitmentSubmission,
    status: TSdStatus
  ) => void;
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
    {
      accessorKey: "status",
      header: t.recruitmentsList.columns.status,
      cell: ({ row }) => {
        const { status, statusUpdatedByRole } = row.original;
        const roleLabels = statusUpdatedByRole
          ? (
              t.recruitmentsList.roleStatusLabels as Partial<
                Record<Role, { agreed: string; rejected: string }>
              >
            )[statusUpdatedByRole]
          : undefined;
        const roleLabel =
          status === "agreed" || status === "rejected"
            ? roleLabels?.[status]
            : undefined;
        return (
          <Badge variant={STATUS_VARIANTS[status]}>
            {roleLabel ?? t.recruitmentsList.statusLabels[status] ?? status}
          </Badge>
        );
      },
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
        const transitions = STATUS_TRANSITIONS[row.original.status] ?? [];
        const adminStatus = row.original.adminStatus ?? "new";
        const shStatus = row.original.shStatus ?? "new";
        const sdStatus = row.original.sdStatus ?? "new";
        // Once admin has agreed, the decision is final — freeze every
        // status control so nobody can change it out from under admin.
        const isFinalized = adminStatus === "admin_agreed";
        return (
          <div className="flex justify-end gap-1">
            {isAdmin && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isUpdatingStatus || isFinalized}
                      onClick={() =>
                        onAdminStatusChange(row.original, "admin_agreed")
                      }
                    >
                      <IconCheck className="size-4" />
                      <span className="sr-only">
                        {t.recruitmentsList.adminStatusLabels.admin_agreed}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t.recruitmentsList.adminStatusLabels.admin_agreed}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        adminStatus === "admin_rejected"
                      }
                      onClick={() =>
                        onAdminStatusChange(row.original, "admin_rejected")
                      }
                    >
                      <IconX className="size-4" />
                      <span className="sr-only">
                        {t.recruitmentsList.adminStatusLabels.admin_rejected}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t.recruitmentsList.adminStatusLabels.admin_rejected}
                  </TooltipContent>
                </Tooltip>
              </>
            )}
            {isSh && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        shStatus === "sh_agreed"
                      }
                      onClick={() =>
                        onShStatusChange(row.original, "sh_agreed")
                      }
                    >
                      <IconCheck className="size-4" />
                      <span className="sr-only">
                        {t.recruitmentsList.shStatusLabels.sh_agreed}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t.recruitmentsList.shStatusLabels.sh_agreed}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        shStatus === "sh_rejected"
                      }
                      onClick={() =>
                        onShStatusChange(row.original, "sh_rejected")
                      }
                    >
                      <IconX className="size-4" />
                      <span className="sr-only">
                        {t.recruitmentsList.shStatusLabels.sh_rejected}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t.recruitmentsList.shStatusLabels.sh_rejected}
                  </TooltipContent>
                </Tooltip>
              </>
            )}
            {isSd && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        sdStatus === "sd_agreed"
                      }
                      onClick={() =>
                        onSdStatusChange(row.original, "sd_agreed")
                      }
                    >
                      <IconCheck className="size-4" />
                      <span className="sr-only">
                        {t.recruitmentsList.sdStatusLabels.sd_agreed}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t.recruitmentsList.sdStatusLabels.sd_agreed}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={
                        isUpdatingStatus ||
                        isFinalized ||
                        sdStatus === "sd_rejected"
                      }
                      onClick={() =>
                        onSdStatusChange(row.original, "sd_rejected")
                      }
                    >
                      <IconX className="size-4" />
                      <span className="sr-only">
                        {t.recruitmentsList.sdStatusLabels.sd_rejected}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t.recruitmentsList.sdStatusLabels.sd_rejected}
                  </TooltipContent>
                </Tooltip>
              </>
            )}
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
                {transitions.length > 0 && <DropdownMenuSeparator />}
                {transitions.map(target => {
                  const Icon = STATUS_ICONS[target];
                  const label = t.recruitmentsList.statusLabels[target];
                  return (
                    <DropdownMenuItem
                      key={target}
                      disabled={isFinalized}
                      onSelect={() => onStatusChange(row.original, target)}
                    >
                      <Icon className="size-4" />
                      {label}
                    </DropdownMenuItem>
                  );
                })}
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
