import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { render } from "@testing-library/react";
import { HeroVideo } from "./hero-video";

/** Stub matchMedia; `reduced` toggles the prefers-reduced-motion result. */
function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

describe("HeroVideo", () => {
  let play: MockInstance<() => Promise<void>>;

  beforeEach(() => {
    // jsdom does not implement media playback; stub it so the effect can run.
    play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders a muted, looping, inline background video with poster", () => {
    mockMatchMedia(false);
    const { container } = render(
      <HeroVideo
        src="_site/home-hero.mp4"
        poster="_site/home-hero-poster.jpg"
      />,
    );

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("src", "_site/home-hero.mp4");
    expect(video).toHaveAttribute("poster", "_site/home-hero-poster.jpg");
    expect(video?.loop).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.playsInline).toBe(true);
  });

  it("autoplays when reduced motion is not requested", () => {
    mockMatchMedia(false);
    render(<HeroVideo src="_site/home-hero.mp4" />);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("does not autoplay when the user prefers reduced motion", () => {
    mockMatchMedia(true);
    render(<HeroVideo src="_site/home-hero.mp4" />);
    expect(play).not.toHaveBeenCalled();
  });
});
