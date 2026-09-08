"use client";

import { useState } from "react";

import { sendPasswordResetEmail } from "firebase/auth";
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
import { DataTable } from "@/components/ui/data-table/data-table";
import {
  UserFormDialog,
  type UserEditValues,
  type UserFormValues,
} from "@/components/user-form-dialog";
import { createUsersColumns } from "@/components/users-columns";
import { useDictionary } from "@/hooks/use-dictionary";
import { auth } from "@/lib/firebase/client";
import {
  createUser,
  deleteUser,
  updateUser,
  type TAppUser,
} from "@/server/user-actions";

export function UsersView({ initialUsers }: { initialUsers: TAppUser[] }) {
  const t = useDictionary();
  const [users, setUsers] = useState(initialUsers);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TAppUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<TAppUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const openEdit = (user: TAppUser) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleSubmit = async (values: UserFormValues | UserEditValues) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        const result = await updateUser(editingUser.uid, {
          name: values.name,
          role: values.role,
          password: values.password ? values.password : undefined,
          managerSdUid: values.managerSdUid,
          managerShUid: values.managerShUid,
          managerDirectUid: values.managerDirectUid,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setUsers(prev =>
          prev.map(u =>
            u.uid === editingUser.uid
              ? {
                  ...u,
                  name: values.name,
                  role: values.role,
                  managerSdUid: values.managerSdUid || undefined,
                  managerShUid: values.managerShUid || undefined,
                  managerDirectUid: values.managerDirectUid || undefined,
                }
              : u
          )
        );
        toast.success(t.users.updated);
      } else {
        const createValues = values as UserFormValues;
        const result = await createUser({
          email: createValues.email,
          name: createValues.name,
          role: createValues.role,
          managerSdUid: createValues.managerSdUid,
          managerShUid: createValues.managerShUid,
          managerDirectUid: createValues.managerDirectUid,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setUsers(prev => [result.data, ...prev]);
        toast.success(t.users.created);

        // The account exists with a random password nobody has seen, so the
        // owner needs this link to set their own. A delivery failure isn't
        // fatal — the account is already created and the admin can resend.
        try {
          // Picks Firebase's Vietnamese email template; it falls back to
          // English on its own if that locale isn't configured.
          auth.languageCode = "vi";
          await sendPasswordResetEmail(auth, createValues.email);
          toast.success(t.users.passwordEmailSent(createValues.email));
        } catch {
          toast.error(t.users.passwordEmailFailed);
        }
      }
      setFormOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    const target = deletingUser;
    setDeletingUser(null);
    setUsers(prev => prev.filter(u => u.uid !== target.uid));

    const result = await deleteUser(target.uid);
    if (!result.ok) {
      setUsers(prev => [target, ...prev]);
      toast.error(result.error);
    } else {
      toast.success(t.users.deleted);
    }
  };

  const columns = createUsersColumns({
    t,
    onEdit: openEdit,
    onDelete: setDeletingUser,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>{t.users.addButton}</Button>
      </div>

      <DataTable
        data={users.map(u => ({ ...u, id: u.uid }))}
        columns={columns}
        emptyMessage={t.users.empty}
        enableColumnVisibility={false}
      />

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        users={users}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <AlertDialog
        open={!!deletingUser}
        onOpenChange={open => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.users.deleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser &&
                t.users.deleteDialogDescription(
                  deletingUser.name,
                  deletingUser.email
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
    </div>
  );
}
