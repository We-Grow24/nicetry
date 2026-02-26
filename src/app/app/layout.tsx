import type { Metadata } from "next";
import "grapesjs/dist/css/grapes.min.css";
import "./app-builder.css";

export const metadata: Metadata = {
  title: "App Builder | TailAdmin",
};

// Standalone full-viewport layout — no sidebar, no AppHeader
export default function AppBuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
