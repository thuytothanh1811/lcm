"use server";

import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/session";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRole, type Role } from "@/lib/permissions";
import { ActionResult } from "@/lib/types";

const COLLECTION = "users";
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export type TAppUser = {
  uid: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  managerSdUid?: string;
  managerShUid?: string;
  managerDirectUid?: string;
};

async function requireAdmin() {
  const dict = await getDictionary();
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: dict.errors.notAuthenticated };
  if (user.role !== "admin") {
    return {
      ok: false as const,
      error: dict.errors.forbidden,
    };
  }
  return { ok: true as const, user, dict };
}

export type TManagerOption = {
  uid: string;
  name: string;
  managerSdUid?: string;
  managerShUid?: string;
};

export type TManagerGroups = {
  sd: TManagerOption[];
  sh: TManagerOption[];
  direct: TManagerOption[];
};

async function listUsersByRole(
  role: "sd" | "sh" | "ad"
): Promise<TManagerOption[]> {
  // Sorted client-side rather than via .orderBy("name") to avoid needing a
  // composite Firestore index for this where+orderBy combination — each
  // role's roster is small enough that this is negligible.
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("role", "==", role)
    .get();

  return snapshot.docs
    .map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        name: data.name as string,
        managerSdUid: data.managerSdUid as string | undefined,
        managerShUid: data.managerShUid as string | undefined,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Public (unauthenticated) — the recruitment application form needs to let
 * a candidate pick their SD, SH, and direct (ad) managers. This intentionally
 * exposes only { uid, name, managerSdUid, managerShUid } — never email or
 * role — and has no requireAdmin() gate since anonymous candidates must be
 * able to call it. managerSdUid/managerShUid let the form cascade each list
 * down to the upline already chosen.
 */
export async function listRecruitmentManagers(): Promise<
  ActionResult<TManagerGroups>
> {
  const dict = await getDictionary();
  try {
    const [sd, sh, direct] = await Promise.all([
      listUsersByRole("sd"),
      listUsersByRole("sh"),
      listUsersByRole("ad"),
    ]);

    return { ok: true, data: { sd, sh, direct } };
  } catch {
    return { ok: false, error: dict.errors.users.managerListFailed };
  }
}

export async function listUsers(): Promise<ActionResult<TAppUser[]>> {
  const check = await requireAdmin();
  if (!check.ok) return check;
  const { dict } = check;

  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const users = snapshot.docs.map(
      doc => ({ uid: doc.id, ...doc.data() }) as TAppUser
    );

    return { ok: true, data: users };
  } catch {
    return { ok: false, error: dict.errors.users.listFailed };
  }
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  role: string;
  managerSdUid?: string;
  managerShUid?: string;
  managerDirectUid?: string;
}): Promise<ActionResult<TAppUser>> {
  const check = await requireAdmin();
  if (!check.ok) return check;
  const { dict } = check;

  if (!isRole(input.role)) {
    return { ok: false, error: dict.errors.users.invalidRole };
  }
  if (!STRONG_PASSWORD_REGEX.test(input.password)) {
    return { ok: false, error: dict.errors.users.passwordTooShort };
  }

  try {
    const record = await adminAuth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.name,
    });

    const createdAt = new Date().toISOString();
    const data = {
      email: input.email,
      name: input.name,
      role: input.role,
      createdAt,
      ...(input.managerSdUid ? { managerSdUid: input.managerSdUid } : {}),
      ...(input.managerShUid ? { managerShUid: input.managerShUid } : {}),
      ...(input.managerDirectUid
        ? { managerDirectUid: input.managerDirectUid }
        : {}),
    };
    await adminDb.collection(COLLECTION).doc(record.uid).set(data);

    return {
      ok: true,
      data: { uid: record.uid, ...data },
    };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      return { ok: false, error: dict.errors.users.emailInUse };
    }
    return { ok: false, error: dict.errors.users.createFailed };
  }
}

export async function updateUser(
  uid: string,
  input: {
    name: string;
    role: string;
    password?: string;
    managerSdUid?: string;
    managerShUid?: string;
    managerDirectUid?: string;
  }
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.ok) return check;
  const { dict } = check;

  if (!isRole(input.role)) {
    return { ok: false, error: dict.errors.users.invalidRole };
  }
  if (input.password && !STRONG_PASSWORD_REGEX.test(input.password)) {
    return { ok: false, error: dict.errors.users.passwordTooShort };
  }

  try {
    await adminDb
      .collection(COLLECTION)
      .doc(uid)
      .update({
        name: input.name,
        role: input.role,
        // Firestore's FieldValue.delete() clears a field the current role no
        // longer uses instead of leaving a stale manager link behind.
        managerSdUid: input.managerSdUid || FieldValue.delete(),
        managerShUid: input.managerShUid || FieldValue.delete(),
        managerDirectUid: input.managerDirectUid || FieldValue.delete(),
      });
    await adminAuth.updateUser(uid, {
      displayName: input.name,
      ...(input.password ? { password: input.password } : {}),
    });

    return { ok: true, data: null };
  } catch {
    return { ok: false, error: dict.errors.users.updateFailed };
  }
}

export async function deleteUser(uid: string): Promise<ActionResult> {
  const check = await requireAdmin();
  if (!check.ok) return check;
  const { dict } = check;

  if (uid === check.user.uid) {
    return { ok: false, error: dict.errors.users.cannotDeleteSelf };
  }

  try {
    await adminDb.collection(COLLECTION).doc(uid).delete();
    await adminAuth.deleteUser(uid);
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: dict.errors.users.deleteFailed };
  }
}
