import type { Metadata } from "next";
import HomeNavbar from "@/components/home/HomeNavbar";
import HeroSection from "@/components/home/HeroSection";
import WhatIsZyntrix from "@/components/home/WhatIsZyntrix";
import ZoneShowcase from "@/components/home/ZoneShowcase";
import ForgeGallery from "@/components/home/ForgeGallery";
import HowItWorks from "@/components/home/HowItWorks";
import PricingTeaser from "@/components/home/PricingTeaser";
import CommunityHighlights from "@/components/home/CommunityHighlights";
import StatsBar from "@/components/home/StatsBar";
import HomeFooter from "@/components/home/HomeFooter";

export const metadata: Metadata = {
  title: "ZYNTRIX — Create Anything. Surpass Everything.",
  description:
    "ZYNTRIX is an AI-native creation engine. Build games, websites, anime, SaaS, videos and more with multi-agent AI pipelines. Pick a zone, answer questions, get a complete creative blueprint.",
  keywords: [
    "AI creation platform",
    "game design AI",
    "anime story builder",
    "SaaS planner AI",
    "website builder AI",
    "ZYNTRIX",
  ],
  openGraph: {
    type: "website",
    url: "https://zyntrix.ai",
    title: "ZYNTRIX — Create Anything. Surpass Everything.",
    description:
      "AI-native creation engine for games, anime, SaaS, websites, videos and more. 10,000+ library blocks, 15 zones.",
    siteName: "ZYNTRIX",
    images: [
      {
        url: "https://zyntrix.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "ZYNTRIX — Create Anything. Surpass Everything.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZYNTRIX — Create Anything. Surpass Everything.",
    description:
      "AI-native creation engine. 15 creative zones. 10,000+ blocks. Start free.",
    images: ["https://zyntrix.ai/og-image.png"],
    site: "@zyntrix",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://zyntrix.ai",
  },
};

export default function HomePage() {
  return (
    <main className="bg-gray-950 text-white">
      <HomeNavbar />
      <HeroSection />
      <WhatIsZyntrix />
      <ZoneShowcase />
      <ForgeGallery />
      <HowItWorks />
      <StatsBar />
      <PricingTeaser />
      <CommunityHighlights />
      <HomeFooter />
    </main>
  );
}

