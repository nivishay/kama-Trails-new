"use client";

import { useEffect, useRef } from "react";

interface HeroVideoProps {
  src: string;
  poster?: string;
}

/**
 * Autoplaying, muted, looping background video for the homepage hero.
 *
 * `muted` is (re)applied imperatively because React can drop the attribute on
 * the server-rendered element, and browsers only allow unattended autoplay when
 * the video is muted. Honors `prefers-reduced-motion` by leaving the poster
 * frame in place instead of playing.
 */
export function HeroVideo({ src, poster }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    // play() rejects on backgrounded tabs or strict autoplay policies; the
    // poster frame stays visible, so there is nothing to recover from.
    void video.play().catch(() => {});
  }, []);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 z-0 size-full object-cover"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
    />
  );
}
