"use client";
/**
 * DesignApp — converted from wixclone/src/Component/designApp.js
 *
 * Changes made for Next.js compatibility:
 *   - react-router useNavigate/useLocation/useParams → next/navigation
 *   - Custom useUser / useToken hooks → Supabase client auth
 *   - axios API calls → fetch (with TODO markers)
 *   - Custom context imports → ./context (local)
 *   - CSS module import → Tailwind classes
 */
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  pageDesignContext,
  userDetailsContext,
  PageDesign,
  PageDesignProvider,
  UserDetailsProvider,
} from "./context";
import { useContext } from "react";
import BuilderNavbar from "./Navbar";
import SideColumn from "./Sidecolumn";
import PreviewPanel from "./PreviewPanel";
import SettingPanel from "./SettingPanel";

// ── Inner component (needs context) ─────────────────────────────────────────
function DesignAppInner() {
  const router = useRouter();
  const params = useParams<{ projectId?: string; pageId?: string }>();

  const pageDesignState = useContext(pageDesignContext);
  const UserDetailsState = useContext(userDetailsContext);

  const resizer = useRef<{ currentWidth: string; isDragStarted: boolean }>({
    currentWidth: "300px",
    isDragStarted: false,
  });

  const [sideWid, setSideWid] = useState({ width: "300px" });
  const [prevWid] = useState({ width: "240px" });

  // ── Resize handler (original updateSettingsWidth) ─────────────────────────
  const updateSettingsWidth = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.pageX > 239 && e.pageX < window.innerWidth * 0.6) {
      setSideWid({ width: e.pageX + "px" });
    }

    if (document.querySelectorAll(".temp_infocus").length > 0) {
      const dockl = document.querySelector("[data-operation]") as HTMLElement | null;
      if (dockl) {
        const parentPosition = (
          document.querySelector("[data-panelmain]") as HTMLElement
        )?.getBoundingClientRect();
        const dockSize = (
          document.querySelector(".temp_infocus") as HTMLElement
        )?.getBoundingClientRect();
        if (parentPosition && dockSize) {
          dockl.style.left = dockSize.x - parentPosition.x - 26 + "px";
          dockl.style.top = dockSize.y - parentPosition.y + "px";
        }
      }
    }
  };

  // ── Sync URL params into editorState (mirrors original useEffect) ─────────
  useEffect(() => {
    if (params) {
      UserDetailsState.setEditorState({
        ...UserDetailsState.editorState,
        pageId: params.pageId,
        websiteId: params.projectId,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { pageId, websiteId } = UserDetailsState.editorState;
    if (
      pageId !== params?.pageId ||
      websiteId !== params?.projectId
    ) {
      UserDetailsState.setEditorState({
        ...UserDetailsState.editorState,
        pageId: params?.pageId,
        websiteId: params?.projectId,
      });
    }
  }, [params]);

  // ── Load page data from API (original setPageState) ───────────────────────
  useEffect(() => {
    const { pageId, websiteId } = UserDetailsState.editorState;
    if (pageId && websiteId) {
      setPageState(pageId, websiteId);
    }
  }, [UserDetailsState.editorState.websiteId, UserDetailsState.editorState.pageId]);

  const setPageState = async (pid: string, wid: string) => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/signin");
        return;
      }

      // TODO: Replace with your actual Supabase / API endpoint
      // Original used: POST /api/getWebPage/ with Bearer token
      const res = await fetch("/api/getWebPage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pageId: pid, websiteId: wid }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          pageDesignState.setDesign(data.result as PageDesign);
          pageDesignState.setWebDesignState(data.webResult);
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    } catch {
      // Silently fail on network errors (mirrors original catch block)
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 overflow-hidden">
      {/* Navbar */}
      <div className="h-12 shrink-0">
        <BuilderNavbar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-hidden"
          style={sideWid}
        >
          <SideColumn prevWid={prevWid} />

          {/* Resize handle (original: options_resizer) */}
          <div
            draggable
            className="w-1.5 cursor-col-resize bg-gray-200 hover:bg-indigo-400 dark:bg-gray-700 dark:hover:bg-indigo-500 transition-colors h-full absolute right-0 top-0"
            onDragStart={() => (resizer.current.isDragStarted = true)}
            onDrag={updateSettingsWidth}
            onDragEnd={() => (resizer.current.isDragStarted = false)}
          />
        </aside>

        {/* Preview canvas */}
        <main className="flex-1 overflow-hidden">
          <PreviewPanel />
        </main>

        {/* Setting panel (modal overlay, renders as null when closed) */}
        <SettingPanel />
      </div>
    </div>
  );
}

// ── Exported component (wraps providers, mirrors original Context consumers) ─
export default function DesignApp() {
  return (
    <PageDesignProvider>
      <UserDetailsProvider>
        <DesignAppInner />
      </UserDetailsProvider>
    </PageDesignProvider>
  );
}
