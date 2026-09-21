// Cancellation fee + refund math (DECISIONS #13, #15, #58; 7+ day tier decided 2026-09-21).
// Pure and framework-free so it is trivially unit-testable and reused by both the single-booking
// cancel (2a) and the whole-departure cancel (2b). Money movement (Cardcom refund, ledger row)
// lives elsewhere — this only decides *how much*.

/** Who initiated the cancel — determines whether the #13 fee tiers apply at all (#58). */
export type CancellationReason = "customer_request" | "departure_cancelled";

const MS_PER_DAY = 86_400_000;

// #13 canonical tiers, keyed by whole calendar days before departure. A company/departure cancel
// (#58) never charges a fee — everyone gets a full refund regardless of these tiers.
const FEE_FULL_REFUND = 0; // 7+ days before (decided 2026-09-21)
const FEE_5_TO_6_DAYS = 50; // ₪ per participant
const FEE_3_TO_4_DAYS = 150; // ₪ per participant
// Within 48h → "full cost per participant, no refund": the customer forfeits everything paid.

/** The computed outcome of cancelling a booking: what the company keeps and what the customer gets back. */
export interface CancellationCharge {
  /** Whole calendar days from today to the departure date (negative if already past). */
  daysUntilDeparture: number;
  /** Amount kept by the company as the cancellation fee (never exceeds what was paid). */
  totalFee: number;
  /** Amount refunded to the customer = amountPaid − totalFee. */
  refundAmount: number;
  /** True when the customer forfeits the entire amount (within-48h tier). */
  fullForfeit: boolean;
}

export interface CancellationChargeInput {
  /** Departure calendar date, "YYYY-MM-DD". */
  departureDate: string;
  /** Seats on the booking — the fee is per participant. */
  participants: number;
  /** Total already paid for the booking (from the payments ledger). */
  amountPaid: number;
  reason: CancellationReason;
  /** Injectable clock for deterministic tests. */
  now?: Date;
}

/** Parse "YYYY-MM-DD" to a UTC-midnight timestamp; throws on malformed input. */
function toUtcMidnight(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    throw new Error(`Invalid ISO date: "${iso}"`);
  }
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

/**
 * Whole calendar days from `now`'s local date to the departure date. Uses the local calendar day
 * as "today" (matching isPastDate), so a departure later today is 0 days out, tomorrow is 1, etc.
 */
export function daysUntilDeparture(departureDate: string, now: Date = new Date()): number {
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((toUtcMidnight(departureDate) - todayUtc) / MS_PER_DAY);
}

/** The #13 per-participant fee for a customer-initiated cancel this many days before departure. */
export function customerFeePerParticipant(days: number): number {
  if (days >= 7) return FEE_FULL_REFUND;
  if (days >= 5) return FEE_5_TO_6_DAYS;
  if (days >= 3) return FEE_3_TO_4_DAYS;
  return Number.POSITIVE_INFINITY; // within 48h: full forfeit, handled as a cap on amountPaid
}

/**
 * Decide the fee kept and the amount refunded for a cancellation.
 * - `departure_cancelled` (company cancel): always a full refund, no fee (#58).
 * - `customer_request`: apply the #13 tier by days-before-departure; the fee never exceeds what
 *   was actually paid, and the within-48h tier forfeits the whole amount.
 */
export function computeCancellationCharge(
  input: CancellationChargeInput,
): CancellationCharge {
  const { departureDate, participants, amountPaid, reason, now } = input;
  if (participants < 1) {
    throw new Error("participants must be at least 1");
  }
  if (amountPaid < 0) {
    throw new Error("amountPaid must not be negative");
  }

  const days = daysUntilDeparture(departureDate, now);

  // Company/departure cancel → full refund to all, whatever the calendar says (#58).
  if (reason === "departure_cancelled") {
    return {
      daysUntilDeparture: days,
      totalFee: 0,
      refundAmount: amountPaid,
      fullForfeit: false,
    };
  }

  const perParticipant = customerFeePerParticipant(days);
  // Fee can never exceed what was paid; the within-48h tier (Infinity) collapses to full forfeit.
  const totalFee = Math.min(amountPaid, perParticipant * participants);
  return {
    daysUntilDeparture: days,
    totalFee,
    refundAmount: amountPaid - totalFee,
    fullForfeit: totalFee >= amountPaid && amountPaid > 0,
  };
}
