import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ExScript — Extia Ingénierie",
  description: "Configurateur Google Apps Script",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${montserrat.variable} font-sans bg-extia-night min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
