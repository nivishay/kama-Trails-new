"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelDepartureWithRefunds } from "@/lib/admin/cancel-booking";
import { israelWallTimeToUtcIso } from "@/lib/format/timezone";
import type { DepartureStatus } from "@/lib/catalog/types";

const DEPARTURES_PATH = "/admin/departures";
const STATUSES: DepartureStatus[] = ["open", "closed", "cancelled"];

/** Result surfaced back to the form via useActionState. */
export type DepartureFormState = { error?: string };

interface DepartureInput {
  trail_id: string;
  date: string;
  departure_time: string | null;
  price: number;
  min_capacity: number;
  max_capacity: number;
  status: DepartureStatus;
  registration_closes_at: string | null;
}

/** Parse + validate the form fields; throws a Hebrew message on invalid input. */
function parseDepartureForm(formData: FormData): DepartureInput {
  const trail_id = String(formData.get("trail_id") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("departure_time") ?? "").trim();
  const price = Number(formData.get("price"));
  const minCapacity = Number(formData.get("min_capacity"));
  const maxCapacity = Number(formData.get("max_capacity"));
  const status = String(formData.get("status") ?? "open") as DepartureStatus;
  // Optional earlier public-registration deadline (#24/#53). Empty = use the default (start time).
  const closesAtLocal = String(formData.get("registration_closes_at") ?? "").trim();

  if (!trail_id) throw new Error("יש לבחור מסלול");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("תאריך לא תקין");
  if (!Number.isFinite(price) || price < 0) throw new Error("מחיר לא תקין");
  if (!Number.isInteger(minCapacity) || minCapacity < 0) {
    throw new Error("מינימום המשתתפים חייב להיות מספר אי-שלילי");
  }
  if (!Number.isInteger(maxCapacity) || maxCapacity < 1) {
    throw new Error("הקיבולת המרבית חייבת להיות לפחות 1");
  }
  if (minCapacity > maxCapacity) {
    throw new Error("מינימום המשתתפים גדול מהקיבולת המרבית");
  }
  if (!STATUSES.includes(status)) throw new Error("סטטוס לא תקין");
  if (closesAtLocal && israelWallTimeToUtcIso(closesAtLocal) === null) {
    throw new Error("מועד סגירת ההרשמה לא תקין");
  }

  return {
    trail_id,
    date,
    departure_time: time || null,
    price,
    min_capacity: minCapacity,
    max_capacity: maxCapacity,
    status,
    registration_closes_at: closesAtLocal
      ? israelWallTimeToUtcIso(closesAtLocal)
      : null,
  };
}

/** Map known DB constraint violations to friendly Hebrew; keep others visible. */
function translateWriteError(message: string): string {
  if (message.includes("departures_unique_slot")) {
    return "כבר קיימת יציאה למסלול הזה בתאריך ובשעה האלה";
  }
  return `שמירת היציאה נכשלה: ${message}`;
}

export async function createDeparture(
  _prev: DepartureFormState,
  formData: FormData,
): Promise<DepartureFormState> {
  let input: DepartureInput;
  try {
    input = parseDepartureForm(formData);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("departures").insert(input);
  if (error) {
    return { error: translateWriteError(error.message) };
  }

  revalidatePath(DEPARTURES_PATH);
  redirect(DEPARTURES_PATH);
}

/**
 * Quick open/close toggle for a departure's public registration (#24/#53). `closed` stops
 * public sales but the trip still runs; admin actions stay unbounded by it. Does not touch
 * cancelled departures. Revalidates in place (no redirect — the toggle lives on the list).
 */
export async function setDepartureStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim() as DepartureStatus;
  if (!id || (next !== "open" && next !== "closed")) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("departures")
    .update({ status: next })
    .eq("id", id)
    .neq("status", "cancelled");
  if (error) {
    throw new Error(`שינוי סטטוס ההרשמה נכשל: ${error.message}`);
  }

  revalidatePath(DEPARTURES_PATH);
}

// Cancel a whole departure (2b): full refund to every active booking (#58), then mark it
// cancelled. Revalidates both the departures list and the departure's bookings page.
export type CancelDepartureState = {
  error?: string;
  done?: boolean;
  cancelledBookings?: number;
  totalRefunded?: number;
};

export async function cancelDepartureAction(
  _prev: CancelDepartureState,
  formData: FormData,
): Promise<CancelDepartureState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "חסר מזהה יציאה" };

  try {
    const { cancelledBookings, totalRefunded } =
      await cancelDepartureWithRefunds(id);
    revalidatePath(DEPARTURES_PATH);
    revalidatePath(`/admin/bookings/${id}`);
    return { done: true, cancelledBookings, totalRefunded };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function updateDeparture(
  _prev: DepartureFormState,
  formData: FormData,
): Promise<DepartureFormState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "חסר מזהה יציאה" };

  let input: DepartureInput;
  try {
    input = parseDepartureForm(formData);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("departures")
    .update(input)
    .eq("id", id);
  if (error) {
    return { error: translateWriteError(error.message) };
  }

  revalidatePath(DEPARTURES_PATH);
  redirect(DEPARTURES_PATH);
}
