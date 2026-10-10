import type { Difficulty } from "./types";

/** Dot color per difficulty, easy (green) → hard (red). Tailwind bg classes. */
export const DIFFICULTY_DOT_CLASS: Record<Difficulty, string> = {
  easy: "bg-green-500",
  "easy-medium": "bg-lime-500",
  medium: "bg-amber-500",
  "medium-hard": "bg-orange-500",
  hard: "bg-red-500",
};

/** Default Hebrew label per difficulty (used by the admin picker and as a fallback). */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "קל",
  "easy-medium": "קל-בינוני",
  medium: "בינוני",
  "medium-hard": "בינוני-קשה",
  hard: "קשה",
};

/** Every difficulty level in easy→hard order (admin select, validation). */
export const DIFFICULTIES: Difficulty[] = [
  "easy",
  "easy-medium",
  "medium",
  "medium-hard",
  "hard",
];
