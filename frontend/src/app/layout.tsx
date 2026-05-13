import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./components/SessionProviderWrapper";

const fontSans = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ExScript — Extia Ingénierie",
  description: "Configurateur Google Apps Script",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontSans.variable} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('exscript-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();` }} />
      </head>
      <body className="antialiased">
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
