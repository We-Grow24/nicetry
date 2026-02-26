import { Metadata } from "next";
import FreelancePage from "@/components/freelance/FreelancePage";

export const metadata: Metadata = {
  title: "Freelance | TailAdmin",
  description: "Find freelance work or hire talent for your next project.",
};

export default function FreelancePageRoute() {
  return <FreelancePage />;
}
