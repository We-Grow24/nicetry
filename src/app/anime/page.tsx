import { Metadata } from "next";
import AnimeStudio from "@/components/anime/AnimeStudio";

export const metadata: Metadata = {
  title: "Anime Studio | TailAdmin",
  description: "Full anime creation studio — characters, episode planning, scene builder",
};

export default function AnimePage() {
  return <AnimeStudio />;
}
