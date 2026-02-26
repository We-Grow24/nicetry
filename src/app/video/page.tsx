import { Metadata } from "next";
import VideoCreator from "@/components/video/VideoCreator";

export const metadata: Metadata = {
  title: "Video Creator | TailAdmin",
  description: "3D Video Creator — compose, scrub, and export MP4 scenes",
};

export default function VideoPage() {
  return <VideoCreator />;
}
