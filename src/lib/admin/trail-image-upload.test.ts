import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  imageExtensionForType,
  tripPhotoObjectPath,
  validateImageFile,
} from "./trail-image-upload";

describe("validateImageFile", () => {
  it("accepts a normal-sized image", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1_000 })).toBeNull();
  });

  it("rejects a non-image type", () => {
    expect(validateImageFile({ type: "application/pdf", size: 1_000 })).toMatch(
      /לא נתמך/,
    );
  });

  it("rejects a file over the size limit", () => {
    expect(
      validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }),
    ).toMatch(/גדול מדי/);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(
      validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES }),
    ).toBeNull();
  });
});

describe("imageExtensionForType", () => {
  it("maps known MIME types to a storage-safe extension", () => {
    expect(imageExtensionForType("image/jpeg")).toBe(".jpg");
    expect(imageExtensionForType("image/webp")).toBe(".webp");
  });

  it("defaults an unknown type to .jpg", () => {
    expect(imageExtensionForType("image/unknown")).toBe(".jpg");
  });
});

describe("tripPhotoObjectPath", () => {
  it("builds a slug-scoped path with the type's extension", () => {
    expect(tripPhotoObjectPath("nahal-example", "image/png", "abc123")).toBe(
      "nahal-example/abc123.png",
    );
  });

  it("keeps the key ASCII regardless of the original file name", () => {
    const path = tripPhotoObjectPath("keshet-cave", "image/jpeg", "id-1");
    expect(path).toBe("keshet-cave/id-1.jpg");
    expect(path).toMatch(/^[a-z0-9/.-]+$/);
  });
});
