const DEFAULT_NOTE = "Focus on progress,\nnot perfection.\nSmall steps every day\nlead to big changes.";

const PRIORITIES = ["low", "medium", "high"];

const MOODS = [
  { id: "stressed", emoji: "&#128543;", label: "Stressed" },
  { id: "tired", emoji: "&#128533;", label: "Tired" },
  { id: "calm", emoji: "&#128578;", label: "Calm" },
  { id: "happy", emoji: "&#128522;", label: "Good" },
  { id: "focused", emoji: "&#129321;", label: "Great" },
];

const RING_RADIUS = 62;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
