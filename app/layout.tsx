import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import { ConditionalSiteHeader } from "@/components/ConditionalSiteHeader";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gameday Lockers",
  description:
    "Gameday Lockers — digital locker nameplates, live walls, and screen control for your facility.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${oswald.variable} min-h-dvh w-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className={`${inter.className} flex min-h-dvh w-full flex-col`}
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex min-h-dvh w-full flex-1 flex-col">
            <ConditionalSiteHeader />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
