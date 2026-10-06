import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Focus Hub - 개인 생산성 OS",
    short_name: "Focus Hub",
    description: "일정, 할 일, 프로젝트, 습관과 학습 기록을 관리하세요.",
    start_url: "/",
    display: "standalone",
    background_color: "#08111D",
    theme_color: "#08111D",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
