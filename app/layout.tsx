import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "NoNotes",
  title: {
    default: "NoNotes — Study with intention",
    template: "%s — NoNotes",
  },
  description:
    "A focused workspace for turning study material into lasting recall.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0d101b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
