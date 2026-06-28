import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

// Space Grotesk drives headings/display type — angular, technical, futuristic.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Inter drives body copy/UI text — calm, neutral, highly legible.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CivicMind India | Smart Indian Municipal Platform",
  description: "Autonomous agentic decision-support and issue resolution platform powered by Google Gemini and Machine Learning for Indian Municipalities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
          crossOrigin="" 
        />
      </head>
      <body className={`${spaceGrotesk.variable} ${inter.variable} min-h-full flex flex-col bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
