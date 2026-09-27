import { createSupabasePublicClient } from "@/lib/supabase/public";

/** A client/partner organisation shown in the homepage logo strip. */
export interface PartnerLogo {
  id: string;
  name: string;
  /** App-relative image path under public/ (e.g. `/logos/01-spni.png`). */
  image_path: string;
  link_url: string | null;
  sort_order: number;
}

const PARTNER_LOGO_COLUMNS = "id, name, image_path, link_url, sort_order";

/**
 * Client/partner logos for the homepage "גאים לשרת" strip, ordered for display.
 *
 * Optional marketing content: on any error (e.g. the table not yet migrated in
 * a given environment) this logs and returns an empty list rather than throwing,
 * so the homepage still renders — the strip simply hides itself.
 */
export async function getPartnerLogos(): Promise<PartnerLogo[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("partner_logos")
    .select(PARTNER_LOGO_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(`Failed to load partner logos: ${error.message}`);
    return [];
  }
  return (data ?? []) as unknown as PartnerLogo[];
}
