"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  return {
    trail_id,
    date,
    departure_time: time || null,
    price,
    min_capacity: minCapacity,
    max_capacity: maxCapacity,
    status,
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
