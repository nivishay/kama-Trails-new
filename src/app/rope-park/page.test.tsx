import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RopeParkPage from "./page";

describe("RopeParkPage", () => {
  it("renders the title, the stations list and a contact CTA", () => {
    render(<RopeParkPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "פארק חבלים" }),
    ).toBeInTheDocument();
    expect(screen.getByText("אומגה")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "צרו קשר" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});
