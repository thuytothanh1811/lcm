import { type LucideIcon, UserCheck, Users, Wallet } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import { canAccessIncome, canAccessUsers, type Role } from "@/lib/permissions";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export function getSidebarItems(role: Role, t: Dictionary): NavGroup[] {
  const items: NavMainItem[] = [
    { title: t.nav.recruitments, url: "/recruitments", icon: UserCheck },
  ];

  if (canAccessIncome(role)) {
    items.push({
      title: t.nav.income,
      url: "/income",
      icon: Wallet,
      subItems: [
        { title: t.nav.incomeCalculator, url: "/income" },
        { title: t.nav.incomePolicy, url: "/income/policy" },
      ],
    });
  }

  if (canAccessUsers(role)) {
    items.push({ title: t.nav.users, url: "/users", icon: Users });
  }

  return [{ id: 1, items }];
}
