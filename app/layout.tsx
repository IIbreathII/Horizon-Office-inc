import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

// Onest (OFL, Latin + Cyrillic): one variable file covers weights 100–900
const onest = localFont({
  src: "../fonts/Onest-VariableFont_wght.ttf",
  variable: "--font-onest",
  weight: "100 900",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Волонтерські квести Дніпра",
  description: "Знайди волонтерський квест на мапі Дніпра, допомагай і отримуй нагороди",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      className={`${onest.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
