/**
 * mood.js
 * Static definition of the moods a user can log for the day, plus a
 * small lookup helper. Kept separate so the mood set can grow without
 * touching rendering logic in app.js.
 */

export const MOODS = [
  { id: "stressed", emoji: "&#128543;", label: "Stressed" },
  { id: "tired", emoji: "&#128533;", label: "Tired" },
  { id: "calm", emoji: "&#128578;", label: "Calm" },
  { id: "happy", emoji: "&#128522;", label: "Good" },
  { id: "focused", emoji: "&#129321;", label: "Great" },
];

export function getMood(id) {
  return MOODS.find((m) => m.id === id) ?? null;
}
