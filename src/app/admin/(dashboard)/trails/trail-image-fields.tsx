"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { tripPhotosPublicUrl } from "@/lib/catalog/trail-image";
import {
  TRIP_PHOTOS_BUCKET,
  tripPhotoObjectPath,
  validateImageFile,
} from "@/lib/admin/trail-image-upload";

interface TrailImageFieldsProps {
  /** Current slug from the form — drives the `<slug>/…` storage folder. */
  slug: string;
  initialHero: string | null;
  initialGallery: string[];
}

/** Upload one file to `trip_photos/<slug>/…`, returning its stored relative path. */
async function uploadTripPhoto(slug: string, file: File): Promise<string> {
  const rejection = validateImageFile(file);
  if (rejection) throw new Error(rejection);

  const path = tripPhotoObjectPath(slug, file.type, crypto.randomUUID());
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from(TRIP_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`העלאת התמונה נכשלה: ${error.message}`);
  return path;
}

/** Fixed-size image preview used for both hero and gallery thumbnails. */
function Thumb({ path, alt }: { path: string; alt: string }) {
  const url = tripPhotosPublicUrl(path);
  if (!url) return null;
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes="160px"
      className="object-cover"
      unoptimized
    />
  );
}

export function TrailImageFields({
  slug,
  initialHero,
  initialGallery,
}: TrailImageFieldsProps) {
  const [hero, setHero] = useState(initialHero ?? "");
  const [gallery, setGallery] = useState<string[]>(initialGallery);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heroInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const trimmedSlug = slug.trim();
  const canUpload = trimmedSlug.length > 0;

  async function handleHero(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      setHero(await uploadTripPhoto(trimmedSlug, file));
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setBusy(false);
      if (heroInput.current) heroInput.current.value = "";
    }
  }

  async function handleGallery(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const file of files) {
        paths.push(await uploadTripPhoto(trimmedSlug, file));
      }
      setGallery((current) => [...current, ...paths]);
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setBusy(false);
      if (galleryInput.current) galleryInput.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      {/* Hidden fields the server action reads (unchanged contract). */}
      <input type="hidden" name="hero_image" value={hero} />
      <textarea name="gallery" value={gallery.join("\n")} readOnly hidden />

      {!canUpload && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          כדי להעלות תמונות יש להזין תחילה מזהה כתובת (slug) למסלול.
        </p>
      )}

      <div>
        <span className="block text-sm font-medium text-ink">תמונה ראשית</span>
        <div className="mt-2 flex items-center gap-4">
          <div className="relative size-40 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            {hero ? (
              <>
                <Thumb path={hero} alt="תמונה ראשית" />
                <button
                  type="button"
                  onClick={() => setHero("")}
                  className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  aria-label="הסרת התמונה הראשית"
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                אין תמונה
              </span>
            )}
          </div>
          <div>
            <input
              ref={heroInput}
              type="file"
              accept="image/*"
              disabled={!canUpload || busy}
              onChange={(e) => handleHero(e.target.files)}
              className="block text-sm file:me-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              מוצגת בכרטיס המסלול ובראש עמוד המסלול. עד 10MB.
            </p>
          </div>
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-ink">גלריה</span>
        <div className="mt-2 flex flex-wrap gap-3">
          {gallery.map((path) => (
            <div
              key={path}
              className="relative size-28 overflow-hidden rounded-lg border border-border bg-muted"
            >
              <Thumb path={path} alt="תמונת גלריה" />
              <button
                type="button"
                onClick={() => setGallery((c) => c.filter((p) => p !== path))}
                className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="הסרת התמונה"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <label
            className={`flex size-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary ${
              !canUpload || busy ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            <ImagePlus className="size-5" />
            הוספת תמונות
            <input
              ref={galleryInput}
              type="file"
              accept="image/*"
              multiple
              disabled={!canUpload || busy}
              onChange={(e) => handleGallery(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          מעלה…
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
