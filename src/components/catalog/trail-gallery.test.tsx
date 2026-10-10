import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrailGallery } from "./trail-gallery";

// next/image needs the Next runtime; stub it to a plain <img>.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image
    <img src={src} alt={alt} />
  ),
}));

const IMAGES = ["a/1.jpg", "a/2.jpg", "a/3.jpg"];

describe("TrailGallery", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
  });

  it("starts on the first photo with a thumbnail per image", () => {
    render(<TrailGallery images={IMAGES} trailName="מסלול" />);

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /מעבר לתמונה/ }),
    ).toHaveLength(3);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("advances and wraps around with the next control", async () => {
    const user = userEvent.setup();
    render(<TrailGallery images={IMAGES} trailName="מסלול" />);

    const next = screen.getByRole("button", { name: "התמונה הבאה" });
    await user.click(next);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    await user.click(next);
    await user.click(next);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("goes back and wraps around with the previous control", async () => {
    const user = userEvent.setup();
    render(<TrailGallery images={IMAGES} trailName="מסלול" />);

    await user.click(screen.getByRole("button", { name: "התמונה הקודמת" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("jumps to the photo chosen from the thumbnail strip", async () => {
    const user = userEvent.setup();
    render(<TrailGallery images={IMAGES} trailName="מסלול" />);

    await user.click(
      screen.getByRole("button", { name: "מעבר לתמונה 3 מתוך 3" }),
    );
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("opens the lightbox on the current photo and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<TrailGallery images={IMAGES} trailName="מסלול" />);

    await user.click(
      screen.getByRole("button", { name: "הגדלת תמונה 1 מתוך 3" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no images", () => {
    const { container } = render(
      <TrailGallery images={[]} trailName="מסלול" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
