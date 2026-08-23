import { writeFileSync, mkdirSync } from "fs";

// Dark-themed "N" icon for NoNotes PWA
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0d101b" rx="6"/>
  <text x="16" y="18" dominant-baseline="middle" text-anchor="middle"
        fill="#a78bfa" font-family="system-ui, sans-serif" font-weight="700"
        font-size="16">N</text>
</svg>`;

const manifestIcons = [
  {
    size: 192,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="#0d101b" rx="34"/>
  <text x="96" y="106" dominant-baseline="middle" text-anchor="middle"
        fill="#a78bfa" font-family="system-ui, -apple-system, sans-serif" font-weight="700"
        font-size="100">N</text>
</svg>`,
  },
  {
    size: 512,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0d101b" rx="92"/>
  <text x="256" y="282" dominant-baseline="middle" text-anchor="middle"
        fill="#a78bfa" font-family="system-ui, -apple-system, sans-serif" font-weight="700"
        font-size="266">N</text>
</svg>`,
  },
];

mkdirSync("public/icons", { recursive: true });

// Write favicon
writeFileSync("public/favicon.svg", faviconSvg);

// Write manifest
writeFileSync(
  "public/manifest.json",
  JSON.stringify(
    {
      name: "NoNotes",
      short_name: "NoNotes",
      description:
        "A focused workspace for turning study material into lasting recall.",
      start_url: "/dashboard",
      display: "standalone",
      background_color: "#0d101b",
      theme_color: "#0d101b",
      orientation: "any",
      scope: "/",
      icons: manifestIcons.map(({ size }) => ({
        src: `/icons/icon-${size}.svg`,
        sizes: `${size}x${size}`,
        type: "image/svg+xml",
        purpose: "any maskable",
      })),
      categories: ["education", "productivity"],
      lang: "en",
    },
    null,
    2,
  ),
);

// Write icon SVGs
manifestIcons.forEach(({ size, svg }) => {
  writeFileSync(`public/icons/icon-${size}.svg`, svg);
});

console.log("Icons and manifest generated.");
