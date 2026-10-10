"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseTrailForm } from "@/lib/admin/trail-form";
import { countTrailBookings } from "@/lib/admin/trails";

const TRAILS_PATH = "/admin/trails";

/** Result surfaced back to the form via useActionState. */
export type TrailFormState = { error?: string };

/** Map known DB constraint violations to friendly Hebrew; keep others visible. */
function translateWriteError(message: string): string {
  if (message.includes("trails_slug_key")) {
    return "כבר קיים מסלול עם המזהה הזה";
  }
  if (message.includes("trails_region_check")) {
    return "אזור לא תקין";
  }
  if (message.includes("trails_difficulty_check")) {
    return "רמת קושי לא תקינה";
  }
  return `שמירת המסלול נכשלה: ${message}`;
}

/** Revalidate both the admin list and the public pages a trail change affects. */
function revalidateTrail(slug: string): void {
  revalidatePath(TRAILS_PATH);
  revalidatePath("/trails");
  revalidatePath(`/trails/${slug}`);
}

export async function createTrail(
  _prev: TrailFormState,
  formData: FormData,
): Promise<TrailFormState> {
  let input;
  try {
    input = parseTrailForm(formData);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("trails").insert(input);
  if (error) {
    return { error: translateWriteError(error.message) };
  }

  revalidateTrail(input.slug);
  redirect(TRAILS_PATH);
}

/** Result surfaced back to the delete confirmation modal via useActionState. */
export type DeleteTrailState = { error?: string };

/**
 * Delete a trail. Refuses when the trail has bookings (their departures are
 * FK-protected), so booking history is never destroyed. Deleting a trail with
 * no bookings also cascade-removes its (unbooked) departures — see baseline.sql.
 */
export async function deleteTrail(
  _prev: DeleteTrailState,
  formData: FormData,
): Promise<DeleteTrailState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "חסר מזהה מסלול" };

  const bookings = await countTrailBookings(id);
  if (bookings > 0) {
    return {
      error: `לא ניתן למחוק מסלול שיש לו ${bookings} הזמנות. ניתן לערוך אותו או להסתיר אותו מהאתר.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trails")
    .delete()
    .eq("id", id)
    .select("slug")
    .maybeSingle();

  if (error) {
    // Safety net: a booking slipped in between the count and the delete.
    if (error.message.includes("foreign key")) {
      return { error: "לא ניתן למחוק מסלול שיש לו הזמנות או יציאות מקושרות." };
    }
    return { error: `מחיקת המסלול נכשלה: ${error.message}` };
  }

  if (data?.slug) revalidateTrail(data.slug);
  else revalidatePath(TRAILS_PATH);
  redirect(TRAILS_PATH);
}

export async function updateTrail(
  _prev: TrailFormState,
  formData: FormData,
): Promise<TrailFormState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "חסר מזהה מסלול" };

  let input;
  try {
    input = parseTrailForm(formData);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("trails").update(input).eq("id", id);
  if (error) {
    return { error: translateWriteError(error.message) };
  }

  revalidateTrail(input.slug);
  redirect(TRAILS_PATH);
}
