import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkerProfilePopup from "@/components/WorkerProfilePopup";
import type { Worker } from "@/data/mockData";

const worker: Worker & { distance: number } = {
  id: "w1",
  name: "Elena Rodriguez",
  profession: "Electrician",
  rating: 4.9,
  reviewCount: 10,
  experience: 8,
  distance: 1.2,
  available: true,
  verified: true,
  phone: "+1 555 0100",
  description: "Pro",
  serviceAreas: [],
  profilePhoto: "",
  city: "LA",
  mainCategory: "Electrical",
  subCategory: "Residential",
};

const renderPopup = () =>
  render(
    <MemoryRouter>
      <WorkerProfilePopup worker={worker} open onOpenChange={() => {}} isAuthed />
    </MemoryRouter>
  );

const VIEWPORTS = [320, 375, 390, 414, 768, 1024, 1440];
const FONT_SCALES = [12, 16, 20, 24];

const getHeading = () =>
  screen
    .getAllByRole("heading", { name: /Elena Rodriguez/i })
    .find((h) => h.className.includes("font-sora"))!;

describe("WorkerProfilePopup premium crown alignment", () => {
  it("renders crown next to name as direct sibling in a flex row", () => {
    renderPopup();
    const heading = getHeading();
    const crown = screen.getByLabelText(/Premium Worker/i);
    const row = heading.parentElement!;
    expect(row).toBe(crown.parentElement);
    expect(row.className).toMatch(/flex/);
    expect(row.className).toMatch(/items-center/);
    expect(row.className).toMatch(/flex-nowrap/);
  });

  it("crown stays inline (same row baseline) across viewports and font scales", () => {
    renderPopup();
    const heading = getHeading();
    const crown = screen.getByLabelText(/Premium Worker/i);

    for (const w of VIEWPORTS) {
      (window as any).innerWidth = w;
      window.dispatchEvent(new Event("resize"));
      for (const fs of FONT_SCALES) {
        document.documentElement.style.fontSize = `${fs}px`;
        // shrink-0 + flex-nowrap guarantees the crown never wraps below the name
        expect(crown.className).toMatch(/shrink-0/);
        expect(heading.parentElement!.className).toMatch(/flex-nowrap/);
        // both elements must remain in the same parent (single row)
        expect(heading.parentElement).toBe(crown.parentElement);
      }
    }
    document.documentElement.style.fontSize = "";
  });

  it("crown has fixed dimensions so it does not collapse on small screens", () => {
    renderPopup();
    const crown = screen.getByLabelText(/Premium Worker/i);
    expect(crown.className).toMatch(/h-8/);
    expect(crown.className).toMatch(/w-8/);
  });
});
