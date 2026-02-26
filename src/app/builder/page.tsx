import { Suspense } from "react";
import BuilderPage from "@/components/builder/BuilderPage";

// Standalone full-screen page — no admin sidebar.
// Wrapped in Suspense so useSearchParams() works in BuilderPage.
export default function BuilderRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
          Loading builder…
        </div>
      }
    >
      <BuilderPage />
    </Suspense>
  );
}
