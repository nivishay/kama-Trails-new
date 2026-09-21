import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CoursePage from "./page";

describe("CoursePage", () => {
  it("renders the title, the syllabus section and a registration CTA", () => {
    render(<CoursePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "קורס גולש עצמאי" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "סילבוס הקורס" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "להרשמה" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});
