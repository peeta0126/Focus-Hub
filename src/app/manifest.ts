import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Focus Hub",
    short_name: "Focus Hub",
    description: "일정, 할 일, 프로젝트, 습관과 학습 기록을 관리하세요.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c1018",
    theme_color: "#0c1018",
    lang: "ko-KR",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
