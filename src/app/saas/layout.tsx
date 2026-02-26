import React from "react";

// Standalone full-screen layout — no admin sidebar/header.
export default function SaasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
