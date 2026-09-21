import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("renders the title, the 'why choose us' section and a contact CTA", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "אודות" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: 'למה כדאי לכם לבחור "שבילי קמה"?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "צרו קשר" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});
