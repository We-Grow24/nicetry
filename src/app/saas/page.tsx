import { Suspense } from "react";
import SaasWorkflowBuilder from "@/components/saas/SaasWorkflowBuilder";

export default function SaasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400 text-sm">
          Loading SaaS builder…
        </div>
      }
    >
      <SaasWorkflowBuilder />
    </Suspense>
  );
}
