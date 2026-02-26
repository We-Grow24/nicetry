import { Suspense } from "react";
import MobileBuilderPage from "@/components/builder/MobileBuilderPage";

// Standalone full-screen mobile app builder page.
// Wrapped in Suspense so useSearchParams() works.
export default function AppBuilderRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
          Loading app builder…
        </div>
      }
    >
      <MobileBuilderPage />
    </Suspense>
  );
}
