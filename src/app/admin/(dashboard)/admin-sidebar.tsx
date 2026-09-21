"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "./actions";

interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "לוח בקרה", icon: LayoutDashboard, exact: true },
  { href: "/admin/departures", label: "יציאות", icon: CalendarDays },
  { href: "/admin/bookings", label: "הזמנות", icon: ClipboardList },
  { href: "/admin/customers", label: "לקוחות", icon: Users },
  { href: "/admin/private-trips/new", label: "טיול פרטי", icon: Sparkles },
  { href: "/admin", label: "מסלולים", icon: MapIcon, disabled: true },
  { href: "/admin/leads", label: "פניות", icon: Inbox },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.disabled) return false;
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex gap-1 md:flex-col">
      {NAV_ITEMS.map((item, index) => {
        const active = isActive(pathname, item);
        const content = (
          <>
            <item.icon className="size-5 shrink-0" />
            <span>{item.label}</span>
            {item.disabled && (
              <span className="ms-auto hidden rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground md:inline">
                בקרוב
              </span>
            )}
          </>
        );
        const base =
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

        if (item.disabled) {
          return (
            <span
              key={`${item.label}-${index}`}
              className={cn(base, "cursor-default text-muted-foreground/60")}
            >
              {content}
            </span>
          );
        }
        return (
          <Link
            key={`${item.label}-${index}`}
            href={item.href}
            className={cn(
              base,
              active
                ? "bg-primary/15 text-primary"
                : "text-ink/80 hover:bg-muted",
            )}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 font-bold text-ink">
      <Image
        src="/logo-mark.png"
        alt=""
        width={80}
        height={82}
        className="h-7 w-auto"
      />
      <span>ניהול · שבילי קמה</span>
    </div>
  );
}

function SignOut({ email }: { email: string }) {
  return (
    <form action={signOut} className="flex items-center justify-between gap-2">
      <span className="truncate text-xs text-muted-foreground" title={email}>
        {email}
      </span>
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink/80 hover:bg-muted"
      >
        <LogOut className="size-4" />
        יציאה
      </button>
    </form>
  );
}

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar (right side in RTL) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-s border-border bg-background p-4 md:flex">
        <Brand />
        <div className="mt-6 flex-1">
          <NavLinks pathname={pathname} />
        </div>
        <div className="border-t border-border pt-3">
          <SignOut email={email} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background md:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Brand />
          <SignOut email={email} />
        </div>
        <div className="overflow-x-auto px-2 pb-2">
          <NavLinks pathname={pathname} />
        </div>
      </header>
    </>
  );
}
