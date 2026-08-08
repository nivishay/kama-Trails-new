import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogGrid } from "./catalog-grid";
import type { TrailCardItem } from "./trail-card";
import type { Trail } from "@/lib/catalog/types";

// next/image and next/link need the Next runtime; stub them to plain elements.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image
    <img src={src} alt={alt} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

function makeItem(id: string, region: Trail["region"]): TrailCardItem {
  return {
    trail: {
      id,
      slug: id,
      name: `טיול ${id}`,
      short_name: null,
      region,
      region_label: null,
      difficulty: null,
      difficulty_label: null,
      price: 180,
      height: null,
      duration: null,
      hero_image: null,
      gallery: [],
      excerpt: null,
      description: null,
      gear: null,
      audience: null,
      included: null,
      sort_order: 0,
    },
    nextDeparture: null,
  };
}

const ITEMS: TrailCardItem[] = [
  makeItem("north-1", "north"),
  makeItem("south-1", "south"),
];

describe("CatalogGrid", () => {
  it("shows all trails by default", () => {
    render(<CatalogGrid items={ITEMS} />);
    expect(screen.getByText("טיול north-1")).toBeInTheDocument();
    expect(screen.getByText("טיול south-1")).toBeInTheDocument();
  });

  it("filters to the selected region when a pill is clicked", async () => {
    const user = userEvent.setup();
    render(<CatalogGrid items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "צפון" }));

    expect(screen.getByText("טיול north-1")).toBeInTheDocument();
    expect(screen.queryByText("טיול south-1")).not.toBeInTheDocument();
  });

  it("shows an empty-state message for a region with no trails", async () => {
    const user = userEvent.setup();
    render(<CatalogGrid items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "מרכז" }));

    expect(screen.getByText(/אין טיולים באזור זה/)).toBeInTheDocument();
  });
});
