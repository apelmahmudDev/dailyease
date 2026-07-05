/**
 * mood.js
 * Static definition of the moods a user can log for the day, plus a
 * small lookup helper. Kept separate so the mood set can grow without
 * touching rendering logic in app.js.
 */

export const MOODS = [
  { id: "focused", emoji: "🧐", label: "Focused" },
  { id: "happy", emoji: "😄", label: "Happy" },
  { id: "tired", emoji: "😪", label: "Tired" },
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "stressed", emoji: "😰", label: "Stressed" },
];

export function getMood(id) {
  return MOODS.find((m) => m.id === id) ?? null;
}
