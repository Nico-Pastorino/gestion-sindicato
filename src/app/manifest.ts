import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sistema de Gestión Sindical",
    short_name: "Sindicato",
    description: "Gestión de afiliados, beneficios, cuotas y liquidaciones",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#16181f",
    theme_color: "#16181f",
    lang: "es",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
