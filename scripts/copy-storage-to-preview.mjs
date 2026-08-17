// One-shot: copy every file in the prod `trip_photos` bucket into the preview
// project's `trip_photos` bucket. Storage blobs live in object storage, not
// Postgres, so migrations can't move them — this does the download/upload.
//
// Reads from prod's PUBLIC bucket (anon key is enough to list + download) and
// writes to preview with the preview SERVICE key (uploads bypass RLS).
// Idempotent: re-running upserts, so a partial run is safe to repeat.
//
// Run:
//   PROD_SUPABASE_URL=https://nbjkcszrxtpkbqyaccmw.supabase.co \
//   PROD_SUPABASE_ANON_KEY=sb_publishable_...prod... \
//   PREVIEW_SUPABASE_URL=https://lvlmiiqfizmkoactmpxc.supabase.co \
//   PREVIEW_SERVICE_KEY=sb_secret_...preview... \
//   node scripts/copy-storage-to-preview.mjs

import { createClient } from "@supabase/supabase-js";

const BUCKET = "trip_photos";
const PAGE_SIZE = 100;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}. See the header of this file.`);
  return value;
}

const prod = createClient(requireEnv("PROD_SUPABASE_URL"), requireEnv("PROD_SUPABASE_ANON_KEY"));
const preview = createClient(requireEnv("PREVIEW_SUPABASE_URL"), requireEnv("PREVIEW_SERVICE_KEY"), {
  auth: { persistSession: false },
});

/** Recursively list every object key under `prefix` (storage.list is not recursive). */
async function listAllKeys(prefix = "") {
  const keys = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await prod.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list "${prefix}" failed: ${error.message}`);
    if (!data.length) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A folder has no id/metadata; recurse into it. A file has metadata.
      if (entry.id === null || entry.metadata === null) {
        keys.push(...(await listAllKeys(path)));
      } else {
        keys.push(path);
      }
    }
    if (data.length < PAGE_SIZE) break;
  }
  return keys;
}

async function copyOne(key) {
  const { data: blob, error: dlError } = await prod.storage.from(BUCKET).download(key);
  if (dlError) throw new Error(`download "${key}" failed: ${dlError.message}`);

  const { error: upError } = await preview.storage
    .from(BUCKET)
    .upload(key, blob, { contentType: blob.type || undefined, upsert: true });
  if (upError) throw new Error(`upload "${key}" failed: ${upError.message}`);
}

async function main() {
  console.log(`Listing files in prod bucket "${BUCKET}"...`);
  const keys = await listAllKeys();
  console.log(`Found ${keys.length} files. Copying to preview...`);

  let done = 0;
  for (const key of keys) {
    await copyOne(key);
    done += 1;
    if (done % 20 === 0 || done === keys.length) {
      console.log(`  ${done}/${keys.length}`);
    }
  }
  console.log(`Done. Copied ${done} files into preview "${BUCKET}".`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
