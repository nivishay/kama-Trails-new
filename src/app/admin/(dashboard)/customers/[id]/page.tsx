import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { getCustomerDetail } from "@/lib/admin/customers";
import { formatTrailDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/price";

const CONSENT_SOURCE_LABELS: Record<string, string> = {
  checkout: "הרשמה לטיול",
  lead_form: "טופס יצירת קשר",
  import: "ייבוא",
  admin: "הזנה ידנית",
};

const CELL = "px-4 py-3 text-sm text-ink";
const HEAD = "px-4 py-2 text-right text-xs font-semibold text-muted-foreground";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);
  if (!customer) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"
      >
        <ChevronRight className="size-4" />
        חזרה ללקוחות
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-ink">
        {customer.full_name ?? "לקוח ללא שם"}
      </h1>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {customer.phone && <span dir="ltr">{customer.phone}</span>}
        {customer.email && <span dir="ltr">{customer.email}</span>}
      </div>

      {customer.needs_review && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>מסומן לבדיקה: {customer.review_note ?? "התאמת אימייל חריגה."}</span>
        </p>
      )}

      <section className="mt-6 rounded-xl border border-border bg-background p-4">
        <h2 className="text-sm font-semibold text-ink">הסכמת דיוור</h2>
        {customer.marketing_opt_in ? (
          <p className="mt-1 text-sm text-primary">
            מנוי לדיוור
            {customer.marketing_consent_source &&
              ` · ${CONSENT_SOURCE_LABELS[customer.marketing_consent_source] ?? customer.marketing_consent_source}`}
            {customer.marketing_consent_at &&
              ` · ${formatTrailDate(customer.marketing_consent_at)}`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            לא מנוי לדיוור (ברירת מחדל — לא נכלל ברשימת התפוצה).
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-ink">
          הזמנות ({customer.bookings.length})
        </h2>
        {customer.bookings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">אין הזמנות.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="border-b border-border">
                <tr>
                  <th className={HEAD}>מסלול</th>
                  <th className={HEAD}>תאריך</th>
                  <th className={HEAD}>משתתפים</th>
                  <th className={HEAD}>סכום</th>
                  <th className={HEAD}>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {customer.bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className={`${CELL} font-medium`}>
                      {booking.trail_name}
                    </td>
                    <td className={CELL}>
                      {booking.trip_date
                        ? formatTrailDate(booking.trip_date)
                        : "—"}
                    </td>
                    <td className={CELL}>{booking.participants_count}</td>
                    <td className={CELL}>{formatPrice(booking.total_amount)}</td>
                    <td className={CELL}>{booking.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-ink">
          פניות ({customer.leads.length})
        </h2>
        {customer.leads.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">אין פניות.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {customer.leads.map((lead) => (
              <li
                key={lead.id}
                className="rounded-lg border border-border bg-background p-3 text-sm"
              >
                <div className="text-xs text-muted-foreground">
                  {formatTrailDate(lead.created_at)} · {lead.status}
                </div>
                {lead.message && <p className="mt-1 text-ink">{lead.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
