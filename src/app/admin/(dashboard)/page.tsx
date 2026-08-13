import type { Route } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Inbox,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getAdminStats } from "@/lib/admin/stats";

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
}

interface QuickLink {
  title: string;
  description: string;
  href: Route;
}

const QUICK_LINKS: QuickLink[] = [
  {
    title: "יציאות",
    description: "הוספה ועריכה של תאריכים, קיבולת ומחיר.",
    href: "/admin/departures",
  },
  {
    title: "הזמנות",
    description: "צפייה בהזמנות לפי יציאה.",
    href: "/admin/bookings",
  },
];

function StatTile({ stat }: { stat: Stat }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{stat.label}</span>
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <stat.icon className="size-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold text-ink">{stat.value}</div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  const tiles: Stat[] = [
    {
      label: "יציאות קרובות",
      value: stats.upcomingDepartures,
      icon: CalendarDays,
    },
    {
      label: "הזמנות מאושרות",
      value: stats.confirmedBookings,
      icon: CheckCircle2,
    },
    {
      label: "משתתפים מאושרים",
      value: stats.confirmedParticipants,
      icon: Users,
    },
    { label: "פניות חדשות", value: stats.newLeads, icon: Inbox },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">לוח בקרה</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        סקירה מהירה של הפעילות.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} stat={tile} />
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold text-ink">קיצורי דרך</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="group flex items-center justify-between rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/40"
          >
            <div>
              <h3 className="font-semibold text-ink">{link.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {link.description}
              </p>
            </div>
            <ChevronLeft className="size-5 text-muted-foreground transition-transform group-hover:-translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
