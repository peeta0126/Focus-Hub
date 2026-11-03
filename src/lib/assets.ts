export const DASHBOARD_ASSETS = {
  hero: "/assets/hero-night-room.webp",
  weather: "/assets/weather-night.webp",
  focusCharacter: "/assets/focus-character.webp",
  habitPlant: "/assets/habit-plant.webp",
  cat: "/assets/cat-sleep.webp",
  projectTarot: "/assets/project-tarot.webp",
  projectQuiz: "/assets/project-ai-quiz.webp",
  projectCrewspace: "/assets/project-crewspace.webp",
} as const;

export function getProjectThumbnail(title: string, fallback = "") {
  const normalizedTitle = title.replace(/[\s_-]/g, "").toLocaleLowerCase("en-US");
  if (normalizedTitle === "별빛타로") return DASHBOARD_ASSETS.projectTarot;
  if (normalizedTitle === "focushub") return DASHBOARD_ASSETS.hero;
  return fallback;
}
