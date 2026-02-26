import { Metadata } from "next";
import CommunityFeed from "@/components/community/CommunityFeed";

export const metadata: Metadata = {
  title: "Community | TailAdmin",
  description: "Share your projects, get feedback, and connect with other creators.",
};

export default function CommunityPage() {
  return <CommunityFeed />;
}
