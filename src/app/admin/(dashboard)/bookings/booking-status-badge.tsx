import type { BookingStatus } from "@/lib/admin/bookings";

const STATUS_STYLES: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  confirmed: { label: "מאושר", className: "bg-primary/15 text-primary" },
  held: { label: "ממתין לתשלום", className: "bg-amber-100 text-amber-700" },
  cancelled: { label: "בוטל", className: "bg-red-100 text-red-700" },
  expired: { label: "פג תוקף", className: "bg-muted text-muted-foreground" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}
