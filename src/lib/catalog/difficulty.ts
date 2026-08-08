import type { Difficulty } from "./types";

/** Dot color per difficulty, easy (green) → hard (red). Tailwind bg classes. */
export const DIFFICULTY_DOT_CLASS: Record<Difficulty, string> = {
  easy: "bg-green-500",
  "easy-medium": "bg-lime-500",
  medium: "bg-amber-500",
  "medium-hard": "bg-orange-500",
  hard: "bg-red-500",
};
