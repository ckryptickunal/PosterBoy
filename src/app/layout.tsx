import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PosterBoy | Autonomous Design Director",
  description: "Local-first self-correcting design director agent system powered by Gemini",
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#fafafa]">
        {children}
      </body>
    </html>
  );
}
