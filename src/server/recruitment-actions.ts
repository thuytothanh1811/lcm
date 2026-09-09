"use server";

import { randomUUID } from "crypto";

import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/session";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { canAccessRecruitments, type Role } from "@/lib/permissions";
import { ActionResult } from "@/lib/types";
import {
  buildRecruitmentDraftSchema,
  buildRecruitmentSchema,
  type RecruitmentValues,
} from "@/lib/validations/recruitment";
import type { Language } from "@/types/preferences/language";

const COLLECTION = "recruitment_submissions";
const STATUS_VALUES = [
  "draft",
  "new",
  "agreed",
  "rejected",
  "needs_documents",
] as const;
export type TRecruitmentStatus = (typeof STATUS_VALUES)[number];
const ADMIN_STATUS_VALUES = [
  "new",
  "admin_agreed",
  "admin_rejected",
  "admin_needs_documents",
] as const;
export type TAdminStatus = (typeof ADMIN_STATUS_VALUES)[number];
const SH_STATUS_VALUES = [
  "new",
  "sh_agreed",
  "sh_rejected",
  "sh_needs_documents",
] as const;
export type TShStatus = (typeof SH_STATUS_VALUES)[number];
const SD_STATUS_VALUES = [
  "new",
  "sd_agreed",
  "sd_rejected",
  "sd_needs_documents",
] as const;
export type TSdStatus = (typeof SD_STATUS_VALUES)[number];
const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

export type TRecruitmentSubmission = RecruitmentValues & {
  id: string;
  submittedAt: string;
  status: TRecruitmentStatus;
  statusUpdatedByRole?: Role;
  adminStatus?: TAdminStatus;
  shStatus?: TShStatus;
  sdStatus?: TSdStatus;
  candidateCode?: string;
  needsDocumentsNote?: string;
  shDocumentsNote?: string;
  sdDocumentsNote?: string;
  adminDocumentsNote?: string;
};

const COUNTERS_COLLECTION = "counters";
const CANDIDATE_CODE_COUNTER_ID = "candidateCode";
const CANDIDATE_CODE_LENGTH = 8;

// Assigns the next sequential 8-digit candidate code (e.g. "00000001") via
// a transaction on a shared counter doc, so two admins approving at the
// same moment can't be handed the same number.
async function nextCandidateCode(): Promise<string> {
  const counterRef = adminDb
    .collection(COUNTERS_COLLECTION)
    .doc(CANDIDATE_CODE_COUNTER_ID);

  const next = await adminDb.runTransaction(async tx => {
    const snapshot = await tx.get(counterRef);
    const current = (snapshot.data()?.value as number | undefined) ?? 0;
    const value = current + 1;
    tx.set(counterRef, { value });
    return value;
  });

  return String(next).padStart(CANDIDATE_CODE_LENGTH, "0");
}

// Non-admin roles only ever see submissions scoped to their place in the
// SD > SH > direct-manager hierarchy — sd sees everything under their SD,
// sh sees everything under their SH, ad sees only their own submissions.
// Admin has no entry here and sees everything.
const OWNERSHIP_FIELD: Partial<
  Record<Role, "sdManagerUid" | "secondManagerUid" | "managerUid">
> = {
  sd: "sdManagerUid",
  sh: "secondManagerUid",
  ad: "managerUid",
};

async function requireRecruitmentAccess() {
  const dict = await getDictionary();
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: dict.errors.notAuthenticated };
  if (!canAccessRecruitments(user.role)) {
    return {
      ok: false as const,
      error: dict.errors.forbidden,
    };
  }
  return { ok: true as const, user, dict };
}
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export type TAttachment = {
  storagePath: string;
  fileName: string;
  size: number;
  contentType: string;
};

export async function uploadRecruitmentAttachment(
  formData: FormData,
  locale?: Language
): Promise<ActionResult<TAttachment>> {
  const dict = await getDictionary(locale);
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: dict.errors.recruitment.noFileSelected };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: dict.errors.recruitment.fileTooLarge };
  }
  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return { ok: false, error: dict.errors.recruitment.unsupportedFileType };
  }

  const storagePath = `recruitment/${randomUUID()}-${file.name}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await adminStorage.bucket().file(storagePath).save(buffer, {
      contentType,
    });

    return {
      ok: true,
      data: { storagePath, fileName: file.name, size: file.size, contentType },
    };
  } catch {
    return { ok: false, error: dict.errors.recruitment.uploadFailed };
  }
}

export async function submitRecruitmentForm(
  values: RecruitmentValues,
  locale?: Language,
  status: TRecruitmentStatus = "new",
  existingId?: string
): Promise<ActionResult<{ id: string }>> {
  const dict = await getDictionary(locale);
  const schema =
    status === "draft"
      ? buildRecruitmentDraftSchema(dict.recruitmentForm.validation)
      : buildRecruitmentSchema(dict.recruitmentForm.validation);
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: dict.errors.recruitment.invalidData };
  }

  try {
    const ref = existingId
      ? adminDb.collection(COLLECTION).doc(existingId)
      : adminDb.collection(COLLECTION).doc();

    if (existingId) {
      // Lightweight ownership check: resuming a draft only reaches this
      // path with an existingId learned from a prior CCCD lookup, so
      // require the CCCD in the payload to still match what's on file —
      // that keeps a crafted request from overwriting an unrelated record
      // by guessing its id.
      const existing = await ref.get();
      if (
        !existing.exists ||
        existing.data()?.idNumber !== parsed.data.idNumber
      ) {
        return { ok: false, error: dict.errors.forbidden };
      }
    }

    await ref.set({
      // Firestore rejects explicit `undefined` values (the draft schema
      // leaves most fields optional) — round-tripping through JSON
      // drops those keys instead of failing the write.
      ...JSON.parse(JSON.stringify(parsed.data)),
      status,
      submittedAt: new Date().toISOString(),
    });

    return { ok: true, data: { id: ref.id } };
  } catch {
    return {
      ok: false,
      error: dict.errors.recruitment.submitFailed,
    };
  }
}

export type TRecruitmentLookupResult =
  | { kind: "not_found" }
  | { kind: "draft"; id: string; values: RecruitmentValues }
  | {
      kind: "submitted";
      fullName: string;
      status: TRecruitmentStatus;
      submittedAt: string;
    };

// Public lookup by CCCD (idNumber) — no session required. A submission
// still in "draft" comes back in full so the candidate can resume filling
// it in; anything already submitted/processed only comes back as a minimal
// status summary (bank details, family info, PEP declaration, etc. stay
// out of reach of anyone who just knows a CCCD number once it's no longer
// their own in-progress draft).
export async function lookupRecruitmentByIdNumber(
  idNumber: string
): Promise<ActionResult<TRecruitmentLookupResult>> {
  const dict = await getDictionary();
  const trimmed = idNumber.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: dict.recruitmentForm.validation.idNumberRequired,
    };
  }

  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("idNumber", "==", trimmed)
      .get();

    if (snapshot.empty) return { ok: true, data: { kind: "not_found" } };

    const latest = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as TRecruitmentSubmission)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];

    if (latest.status === "draft") {
      const values = { ...latest } as Partial<TRecruitmentSubmission>;
      delete values.id;
      delete values.status;
      delete values.submittedAt;
      delete values.statusUpdatedByRole;
      delete values.adminStatus;
      return {
        ok: true,
        data: {
          kind: "draft",
          id: latest.id,
          values: values as RecruitmentValues,
        },
      };
    }

    return {
      ok: true,
      data: {
        kind: "submitted",
        fullName: latest.fullName,
        status: latest.status,
        submittedAt: latest.submittedAt,
      },
    };
  } catch {
    return { ok: false, error: dict.errors.recruitment.listFailed };
  }
}

export async function listRecruitmentSubmissions(): Promise<
  ActionResult<TRecruitmentSubmission[]>
> {
  const check = await requireRecruitmentAccess();
  if (!check.ok) return check;
  const { dict, user } = check;

  try {
    const ownershipField = OWNERSHIP_FIELD[user.role];
    if (ownershipField) {
      // Equality filter on the ownership field + orderBy submittedAt would
      // need a composite Firestore index, so sort/limit client-side instead
      // — each manager's scoped submission count is small enough for this
      // to be cheap.
      const snapshot = await adminDb
        .collection(COLLECTION)
        .where(ownershipField, "==", user.uid)
        .get();

      const submissions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as TRecruitmentSubmission)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .slice(0, 200);

      return { ok: true, data: submissions };
    }

    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy("submittedAt", "desc")
      .limit(200)
      .get();

    const submissions = snapshot.docs.map(
      doc => ({ id: doc.id, ...doc.data() }) as TRecruitmentSubmission
    );

    return { ok: true, data: submissions };
  } catch {
    return { ok: false, error: dict.errors.recruitment.listFailed };
  }
}

export async function getRecruitmentSubmission(
  id: string
): Promise<ActionResult<TRecruitmentSubmission>> {
  const check = await requireRecruitmentAccess();
  if (!check.ok) return check;
  const { dict, user } = check;

  try {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return { ok: false, error: dict.errors.recruitment.notFound };
    }
    const data = doc.data();
    const ownershipField = OWNERSHIP_FIELD[user.role];
    if (ownershipField && data?.[ownershipField] !== user.uid) {
      return { ok: false, error: dict.errors.forbidden };
    }

    return {
      ok: true,
      data: { id: doc.id, ...data } as TRecruitmentSubmission,
    };
  } catch {
    return { ok: false, error: dict.errors.recruitment.loadFailed };
  }
}

export async function getRecruitmentSubmissionsByIds(
  ids: string[]
): Promise<ActionResult<TRecruitmentSubmission[]>> {
  const check = await requireRecruitmentAccess();
  if (!check.ok) return check;
  const { dict, user } = check;

  const uniqueIds = [...new Set(ids)].slice(0, 200);
  if (uniqueIds.length === 0) return { ok: true, data: [] };

  try {
    const docs = await adminDb.getAll(
      ...uniqueIds.map(id => adminDb.collection(COLLECTION).doc(id))
    );

    const ownershipField = OWNERSHIP_FIELD[user.role];
    const submissions = docs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }) as TRecruitmentSubmission)
      .filter(s => !ownershipField || s[ownershipField] === user.uid);

    return { ok: true, data: submissions };
  } catch {
    return { ok: false, error: dict.errors.recruitment.listFailed };
  }
}

export async function updateRecruitmentSubmission(
  id: string,
  values: RecruitmentValues
): Promise<ActionResult> {
  const check = await requireRecruitmentAccess();
  if (!check.ok) return check;
  const { dict, user } = check;

  const schema = buildRecruitmentSchema(dict.recruitmentForm.validation);
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: dict.errors.recruitment.invalidData };
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(id);
    const ownershipField = OWNERSHIP_FIELD[user.role];
    if (ownershipField) {
      const doc = await ref.get();
      if (doc.data()?.[ownershipField] !== user.uid) {
        return { ok: false, error: dict.errors.forbidden };
      }
    }
    await ref.update(parsed.data);
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: dict.errors.recruitment.updateFailed };
  }
}

export async function getRecruitmentAttachmentUrl(
  storagePath: string
): Promise<ActionResult<{ url: string }>> {
  const check = await requireRecruitmentAccess();
  if (!check.ok) return check;
  const { dict } = check;

  try {
    const [url] = await adminStorage
      .bucket()
      .file(storagePath)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + SIGNED_URL_TTL_MS,
      });

    return { ok: true, data: { url } };
  } catch {
    return { ok: false, error: dict.errors.recruitment.downloadUrlFailed };
  }
}

export async function updateRecruitmentSubmissionStatus(
  id: string,
  status: string,
  needsDocumentsNote?: string
): Promise<ActionResult> {
  const check = await requireRecruitmentAccess();
  if (!check.ok) return check;
  const { dict, user } = check;

  if (!STATUS_VALUES.includes(status as TRecruitmentStatus)) {
    return { ok: false, error: dict.errors.recruitment.invalidStatus };
  }
  if (status === "needs_documents" && !needsDocumentsNote?.trim()) {
    return { ok: false, error: dict.errors.recruitment.documentsNoteRequired };
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(id);
    const ownershipField = OWNERSHIP_FIELD[user.role];
    if (ownershipField) {
      const doc = await ref.get();
      if (doc.data()?.[ownershipField] !== user.uid) {
        return { ok: false, error: dict.errors.forbidden };
      }
    }
    const updates: Record<string, unknown> = {
      status,
      statusUpdatedByRole: user.role,
    };
    if (status === "needs_documents") {
      updates.needsDocumentsNote = needsDocumentsNote?.trim();
    }
    await ref.update(updates);
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: dict.errors.recruitment.statusUpdateFailed };
  }
}

export async function updateRecruitmentAdminStatus(
  id: string,
  status: string,
  documentsNote?: string
): Promise<ActionResult<{ candidateCode?: string }>> {
  const dict = await getDictionary();
  const user = await getSessionUser();
  if (!user) return { ok: false, error: dict.errors.notAuthenticated };
  if (user.role !== "admin") {
    return { ok: false, error: dict.errors.forbidden };
  }
  if (!ADMIN_STATUS_VALUES.includes(status as TAdminStatus)) {
    return { ok: false, error: dict.errors.recruitment.invalidStatus };
  }
  if (status === "admin_needs_documents" && !documentsNote?.trim()) {
    return { ok: false, error: dict.errors.recruitment.documentsNoteRequired };
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(id);
    const updates: Record<string, unknown> = { adminStatus: status };
    let candidateCode: string | undefined;

    if (status === "admin_agreed") {
      const doc = await ref.get();
      candidateCode = doc.data()?.candidateCode as string | undefined;
      if (!candidateCode) {
        candidateCode = await nextCandidateCode();
        updates.candidateCode = candidateCode;
      }
    }
    if (status === "admin_needs_documents") {
      updates.adminDocumentsNote = documentsNote?.trim();
    }

    await ref.update(updates);
    return { ok: true, data: { candidateCode } };
  } catch {
    return { ok: false, error: dict.errors.recruitment.statusUpdateFailed };
  }
}

// SH and SD each own an independent status track — separate from the
// shared status field (ad's workflow) and from adminStatus — so one
// role's decision is never silently overwritten by another's.
export async function updateRecruitmentShStatus(
  id: string,
  status: string,
  documentsNote?: string
): Promise<ActionResult> {
  const dict = await getDictionary();
  const user = await getSessionUser();
  if (!user) return { ok: false, error: dict.errors.notAuthenticated };
  if (user.role !== "sh") {
    return { ok: false, error: dict.errors.forbidden };
  }
  if (!SH_STATUS_VALUES.includes(status as TShStatus)) {
    return { ok: false, error: dict.errors.recruitment.invalidStatus };
  }
  if (status === "sh_needs_documents" && !documentsNote?.trim()) {
    return { ok: false, error: dict.errors.recruitment.documentsNoteRequired };
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(id);
    const doc = await ref.get();
    if (doc.data()?.secondManagerUid !== user.uid) {
      return { ok: false, error: dict.errors.forbidden };
    }
    const updates: Record<string, unknown> = { shStatus: status };
    if (status === "sh_needs_documents") {
      updates.shDocumentsNote = documentsNote?.trim();
    }
    await ref.update(updates);
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: dict.errors.recruitment.statusUpdateFailed };
  }
}

export async function updateRecruitmentSdStatus(
  id: string,
  status: string,
  documentsNote?: string
): Promise<ActionResult> {
  const dict = await getDictionary();
  const user = await getSessionUser();
  if (!user) return { ok: false, error: dict.errors.notAuthenticated };
  if (user.role !== "sd") {
    return { ok: false, error: dict.errors.forbidden };
  }
  if (!SD_STATUS_VALUES.includes(status as TSdStatus)) {
    return { ok: false, error: dict.errors.recruitment.invalidStatus };
  }
  if (status === "sd_needs_documents" && !documentsNote?.trim()) {
    return { ok: false, error: dict.errors.recruitment.documentsNoteRequired };
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(id);
    const doc = await ref.get();
    if (doc.data()?.sdManagerUid !== user.uid) {
      return { ok: false, error: dict.errors.forbidden };
    }
    const updates: Record<string, unknown> = { sdStatus: status };
    if (status === "sd_needs_documents") {
      updates.sdDocumentsNote = documentsNote?.trim();
    }
    await ref.update(updates);
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: dict.errors.recruitment.statusUpdateFailed };
  }
}

export async function deleteRecruitmentSubmission(
  id: string
): Promise<ActionResult> {
  const check = await requireRecruitmentAccess();
  if (!check.ok) return check;
  const { dict, user } = check;

  if (user.role !== "admin") {
    return { ok: false, error: dict.errors.forbidden };
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(id);
    const doc = await ref.get();
    const attachments =
      (doc.data()?.attachments as TRecruitmentSubmission["attachments"]) ?? [];

    await Promise.all(
      attachments.map(a =>
        adminStorage
          .bucket()
          .file(a.storagePath)
          .delete({ ignoreNotFound: true })
      )
    );
    await ref.delete();

    return { ok: true, data: null };
  } catch {
    return { ok: false, error: dict.errors.recruitment.deleteFailed };
  }
}
