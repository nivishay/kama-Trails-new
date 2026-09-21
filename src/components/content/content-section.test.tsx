import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContentSection } from "./content-section";

describe("ContentSection", () => {
  it("renders the heading when a title is given", () => {
    render(
      <ContentSection title="כותרת">
        <p>תוכן</p>
      </ContentSection>,
    );

    expect(screen.getByRole("heading", { name: "כותרת" })).toBeInTheDocument();
    expect(screen.getByText("תוכן")).toBeInTheDocument();
  });

  it("omits the heading when no title is given", () => {
    render(
      <ContentSection>
        <p>רק תוכן</p>
      </ContentSection>,
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("רק תוכן")).toBeInTheDocument();
  });
});
