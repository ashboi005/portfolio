import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Sans, JetBrains_Mono, Press_Start_2P } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { site } from "@/lib/content";

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  subsets: ["latin"],
});

// Minecraft-flavoured pixel font, used sparingly in the Deploy History section.
const pixel = Press_Start_2P({
  variable: "--font-pixel",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${chakra.variable} ${plex.variable} ${jetbrains.variable} ${pixel.variable} dark antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
