import type { Metadata, Viewport } from "next";
import { Bebas_Neue, DM_Mono, Barlow } from "next/font/google";
import { PWAProvider }      from "@/components/PWAProvider";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import "@/styles/globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

const barlow = Barlow({
  weight: ["400", "500", "600", "700", "900"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: "#080808", colorScheme: "dark",
};

export const metadata: Metadata = {
  title: { default: "Shop Reaper", template: "%s — Shop Reaper" },
  description: "TikTok won't warn you. We will. Brutally.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Shop Reaper" },
  icons: {
    icon: [{ url:"/icons/icon-192.png", sizes:"192x192" }],
    apple:[{ url:"/icons/icon-152.png", sizes:"152x152" }],
  },
  openGraph: {
    title: "Shop Reaper",
    description: "Real-time SPS monitoring, AI-powered diagnostics, and brutal honesty about why your TikTok Shop is losing money.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmMono.variable} ${barlow.variable}`}>
      <body>
        <PWAProvider>
          {children}
          <PWAInstallBanner />
        </PWAProvider>
      </body>
    </html>
  );
}
