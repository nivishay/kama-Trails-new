import Link from "next/link";
import { ChevronLeft, Search, AlertTriangle } from "lucide-react";
import { listCustomers } from "@/lib/admin/customers";

const CELL = "px-4 py-3 text-sm text-ink";
const HEAD = "px-4 py-2 text-right text-xs font-semibold text-muted-foreground";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = (q ?? "").trim();
  const customers = await listCustomers(search || undefined);
  const flaggedCount = customers.filter((c) => c.needs_review).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">לקוחות</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        רשימת הלקוחות המאוחדת — חיפוש לפי שם, טלפון או אימייל.
      </p>

      <form method="get" className="mt-5 flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="שם, טלפון או אימייל…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 pe-9 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          חיפוש
        </button>
      </form>

      {flaggedCount > 0 && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0" />
          {flaggedCount} לקוחות מסומנים לבדיקה (התאמת אימייל חריגה).
        </p>
      )}

      {customers.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
          {search ? "לא נמצאו לקוחות התואמים לחיפוש." : "אין עדיין לקוחות."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="border-b border-border">
              <tr>
                <th className={HEAD}>שם</th>
                <th className={HEAD}>טלפון</th>
                <th className={HEAD}>אימייל</th>
                <th className={HEAD}>הזמנות</th>
                <th className={HEAD}>פניות</th>
                <th className={HEAD}>דיוור</th>
                <th className={HEAD}></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-border last:border-0"
                >
                  <td className={`${CELL} font-medium`}>
                    <span className="flex items-center gap-1.5">
                      {customer.full_name ?? "—"}
                      {customer.needs_review && (
                        <AlertTriangle className="size-3.5 text-amber-600" />
                      )}
                    </span>
                  </td>
                  <td className={CELL} dir="ltr">
                    {customer.phone ?? "—"}
                  </td>
                  <td className={CELL} dir="ltr">
                    {customer.email ?? "—"}
                  </td>
                  <td className={CELL}>{customer.bookings_count}</td>
                  <td className={CELL}>{customer.leads_count}</td>
                  <td className={CELL}>
                    {customer.marketing_opt_in ? (
                      <span className="text-primary">מנוי</span>
                    ) : (
                      <span className="text-muted-foreground">לא מנוי</span>
                    )}
                  </td>
                  <td className={CELL}>
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      צפייה
                      <ChevronLeft className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
