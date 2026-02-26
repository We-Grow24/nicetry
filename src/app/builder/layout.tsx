import type { Metadata } from "next";
import "grapesjs/dist/css/grapes.min.css";
import "./builder.css";

export const metadata: Metadata = {
  title: "Site Builder | TailAdmin",
};

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Standalone full-width layout — no sidebar, no AppHeader
  return <>{children}</>;
}
