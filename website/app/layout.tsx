import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Team Trainer — Continual Learning in Cooperative Multi-Agent RL",
  description:
    "Research project measuring and mitigating catastrophic forgetting in cooperative multi-agent reinforcement-learning teams. Replay and early-layer freezing tested against a measured baseline.",
  keywords: [
    "continual learning",
    "catastrophic forgetting",
    "multi-agent reinforcement learning",
    "PPO",
    "experience replay",
    "EWC",
    "research project",
  ],
  openGraph: {
    title: "AI Team Trainer",
    description:
      "Can a team of agents learn new tasks without forgetting how to work together?",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-full bg-background antialiased">{children}</body>
    </html>
  );
}