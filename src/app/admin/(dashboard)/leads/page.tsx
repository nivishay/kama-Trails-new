import { getLeads, type LeadStatus } from "@/lib/admin/leads";
import { setLeadStatus } from "./actions";

const STATUS_STYLES: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "חדשה", className: "bg-primary/15 text-primary" },
  contacted: { label: "טופלה", className: "bg-amber-100 text-amber-700" },
  closed: { label: "נסגרה", className: "bg-muted text-muted-foreground" },
};

const DATETIME_FORMAT = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "short",
  timeStyle: "short",
});

function StatusBadge({ status }: { status: LeadStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}

/** One-click transition button (new → contacted → closed) rendered as a server-action form. */
function StatusAction({ id, next, label }: { id: string; next: LeadStatus; label: string }) {
  return (
    <form action={setLeadStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        className="text-sm font-medium text-muted-foreground hover:text-ink"
      >
        {label}
      </button>
    </form>
  );
}

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">פניות</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        פניות מטופס יצירת הקשר באתר.
      </p>

      {leads.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
          אין עדיין פניות.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-ink">{lead.name}</h2>
                  <StatusBadge status={lead.status} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {DATETIME_FORMAT.format(new Date(lead.created_at))}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a
                  href={`mailto:${lead.email}`}
                  className="text-primary hover:underline"
                  dir="ltr"
                >
                  {lead.email}
                </a>
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-primary hover:underline"
                    dir="ltr"
                  >
                    {lead.phone}
                  </a>
                )}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-ink">
                {lead.message}
              </p>

              <div className="mt-3 flex gap-4 border-t border-border pt-3">
                {lead.status === "new" && (
                  <StatusAction id={lead.id} next="contacted" label="סמן כטופלה" />
                )}
                {lead.status !== "closed" && (
                  <StatusAction id={lead.id} next="closed" label="סגור פנייה" />
                )}
                {lead.status !== "new" && (
                  <StatusAction id={lead.id} next="new" label="החזר לחדשות" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
