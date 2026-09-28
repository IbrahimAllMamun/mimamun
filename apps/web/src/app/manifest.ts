import type { MetadataRoute } from "next";
import { THEME_COLOR } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ibrahim All-Mamun — Data Scientist",
    short_name: "All-Mamun",
    description: "Portfolio of Ibrahim All-Mamun, data scientist: projects, research, experience and writing.",
    start_url: "/",
    display: "browser",
    background_color: THEME_COLOR.light,
    theme_color: THEME_COLOR.light,
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
